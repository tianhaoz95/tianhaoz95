import {
  AutoProcessor,
  AutoModelForVision2Seq,
  TextStreamer,
  load_image,
  env,
} from '@huggingface/transformers';

// Disable local models fallback — always fetch from the HF hub.
env.allowLocalModels = false;
// No cross-origin isolation on GitHub Pages (no COOP/COEP) — force
// single-threaded WASM to avoid onnxruntime-web's std::bad_alloc when it
// can't get a SharedArrayBuffer-backed multi-threaded memory arena.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

const MODEL_ID = 'HuggingFaceTB/SmolVLM-256M-Instruct';

let processor: any = null;
let model: any = null;

interface ProgressData {
  status: string;
  progress?: number;
  file?: string;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'init') {
    try {
      self.postMessage({ type: 'status', state: 'loading', progress: 0 });

      const progress_callback = (progressData: ProgressData) => {
        if (progressData.status === 'progress') {
          self.postMessage({
            type: 'status',
            state: 'loading',
            progress: progressData.progress,
            file: progressData.file,
          });
        }
      };

      processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });

      try {
        model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback,
        });
      } catch (gpuError) {
        console.warn('WebGPU failed or unsupported, falling back to WASM:', gpuError);
        model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
          dtype: 'fp32',
          device: 'wasm',
          progress_callback,
        });
      }

      self.postMessage({ type: 'status', state: 'ready' });
    } catch (err) {
      console.error('Failed to load vision model:', err);
      self.postMessage({ type: 'status', state: 'error', error: (err as Error).message });
    }
  } else if (type === 'analyze') {
    if (!processor || !model) {
      self.postMessage({ type: 'error', error: 'Vision model not initialized' });
      return;
    }

    try {
      const { imageUrl, prompt } = data;

      const image = await load_image(imageUrl);
      const messages = [
        {
          role: 'user',
          content: [{ type: 'image' }, { type: 'text', text: prompt || 'Describe this image in detail.' }],
        },
      ];
      const text = processor.apply_chat_template(messages, { add_generation_prompt: true });
      const inputs = await processor(text, image);

      const streamer = new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (chunk: string) => {
          self.postMessage({ type: 'token', data: chunk });
        },
      });

      const generatedIds = await model.generate({
        ...inputs,
        max_new_tokens: 300,
        streamer,
      });

      const decoded = processor.batch_decode(
        generatedIds.slice(null, [inputs.input_ids.dims.at(-1), null]),
        { skip_special_tokens: true },
      );

      self.postMessage({ type: 'done', data: decoded[0]?.trim() ?? '' });
    } catch (err) {
      console.error('Vision analysis failed:', err);
      self.postMessage({ type: 'error', error: (err as Error).message });
    }
  }
};
