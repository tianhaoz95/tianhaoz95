import { pipeline, env, TextStreamer, type TextGenerationPipeline } from '@huggingface/transformers';

// Disable local models fallback — always fetch from the HF hub.
env.allowLocalModels = false;
// The page isn't cross-origin isolated (GitHub Pages can't set COOP/COEP
// headers), so SharedArrayBuffer isn't available — force single-threaded
// WASM rather than letting onnxruntime-web try to allocate a multi-threaded
// memory arena it can't get.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

// 1.5B on WebGPU for quality; WASM (no GPU) falls back to 0.5B — the 1.5B
// model reliably throws `std::bad_alloc` on the WASM backend (confirmed via
// local testing), the same memory ceiling that limits zerog-tools' own
// chat feature to 0.5B for its WASM path.
const MODEL_ID_WEBGPU = 'onnx-community/Qwen2.5-1.5B-Instruct';
const MODEL_ID_WASM = 'onnx-community/Qwen2.5-0.5B-Instruct';

let generator: TextGenerationPipeline | null = null;

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

      try {
        generator = await pipeline('text-generation', MODEL_ID_WEBGPU, {
          device: 'webgpu',
          dtype: 'q4',
          progress_callback,
        });
      } catch (gpuError) {
        console.warn('WebGPU failed or unsupported, falling back to WASM with the smaller model:', gpuError);
        generator = await pipeline('text-generation', MODEL_ID_WASM, {
          device: 'wasm',
          dtype: 'q4',
          progress_callback,
        });
      }

      self.postMessage({ type: 'status', state: 'ready' });
    } catch (err) {
      console.error('Failed to load text-generation model:', err);
      self.postMessage({ type: 'status', state: 'error', error: (err as Error).message });
    }
  } else if (type === 'generate') {
    if (!generator) {
      self.postMessage({ type: 'error', error: 'Model not initialized' });
      return;
    }

    try {
      const { messages, tools, max_new_tokens = 400 } = data;

      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        callback_function: (text: string) => {
          self.postMessage({ type: 'token', data: text });
        },
      });

      const output = await generator(messages, {
        max_new_tokens,
        tools,
        temperature: 0.6,
        do_sample: true,
        top_k: 50,
        streamer,
      });

      const generated = (output as any)[0].generated_text;
      const finalResponse = Array.isArray(generated) ? generated[generated.length - 1]?.content : generated;

      self.postMessage({ type: 'done', data: finalResponse });
    } catch (err) {
      console.error('Generation failed:', err);
      self.postMessage({ type: 'error', error: (err as Error).message });
    }
  }
};
