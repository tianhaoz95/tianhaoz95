import {
  AutoProcessor,
  AutoModelForVision2Seq,
  TextStreamer,
  load_image,
  env,
} from '@huggingface/transformers';
import { createProgressAggregator } from './progress';

// Disable local models fallback — always fetch from the HF hub.
env.allowLocalModels = false;
// No cross-origin isolation on GitHub Pages (no COOP/COEP) — force
// single-threaded WASM to avoid onnxruntime-web's std::bad_alloc when it
// can't get a SharedArrayBuffer-backed multi-threaded memory arena.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

const MODEL_ID = 'HuggingFaceTB/SmolVLM-256M-Instruct';

// Same mitigation as textModel.worker.ts: onnxruntime-web's default CPU
// memory arena can throw `std::bad_alloc` from InferenceSession.create() on
// memory-constrained devices even when the model would otherwise fit — and
// WebGPU sessions still run this same arena logic for their shared
// (non-GPU) bookkeeping. Disabling the arena/mem-pattern optimizations
// trades a little perf for a much lower peak-memory footprint, on either
// backend.
const SAFE_SESSION_OPTIONS = {
  executionMode: 'sequential' as const,
  enableCpuMemArena: false,
  enableMemPattern: false,
  graphOptimizationLevel: 'disabled' as const,
};

let processor: any = null;
let model: any = null;

interface ProgressData {
  status: string;
  progress?: number;
  file?: string;
  loaded?: number;
  total?: number;
}

// Like textModel.worker.ts, this worker attempts exactly one device per
// instance — session.ts decides which device to request and spins up a
// fresh worker for the fallback if this one fails, rather than retrying
// in-process (a failed WebGPU attempt can leave the WASM heap fragmented
// enough that a same-worker WASM retry afterward also fails).
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'init') {
    const device: 'webgpu' | 'wasm' = data?.device === 'webgpu' ? 'webgpu' : 'wasm';

    try {
      self.postMessage({ type: 'status', state: 'loading', progress: 0, loaded: 0, total: 0, files: [] });

      // One aggregator shared across both from_pretrained() calls below, so
      // the processor's (small) files and the model's (large) files feed
      // into a single continuous progress bar instead of two back-to-back
      // 0-100% cycles.
      const aggregator = createProgressAggregator();
      const progress_callback = (progressData: ProgressData) => {
        if (progressData.status === 'progress') {
          const agg = aggregator.update(progressData.file ?? '', progressData.loaded ?? 0, progressData.total ?? 0);
          self.postMessage({ type: 'status', state: 'loading', ...agg });
        }
      };

      processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
      model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: 'fp32',
        device,
        progress_callback,
        session_options: SAFE_SESSION_OPTIONS,
      });

      self.postMessage({ type: 'status', state: 'ready' });
    } catch (err) {
      console.error(`Failed to load vision model (${device}):`, err);
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
