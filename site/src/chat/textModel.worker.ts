import { pipeline, env, TextStreamer, type TextGenerationPipeline } from '@huggingface/transformers';
import { createProgressAggregator } from './progress';

// Disable local models fallback — always fetch from the HF hub.
env.allowLocalModels = false;
// The page isn't cross-origin isolated (GitHub Pages can't set COOP/COEP
// headers), so SharedArrayBuffer isn't available — force single-threaded
// WASM rather than letting onnxruntime-web try to allocate a multi-threaded
// memory arena it can't get.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

// 1.5B on WebGPU (real hardware) for quality; WASM/software-WebGPU falls
// back to 0.5B — the 1.5B model reliably throws `std::bad_alloc` on the
// shared WASM heap that both backends run through, the same memory ceiling
// that limits zerog-tools' own chat feature to 0.5B for its WASM path.
const MODEL_ID_WEBGPU = 'onnx-community/Qwen2.5-1.5B-Instruct';
const MODEL_ID_WASM = 'onnx-community/Qwen2.5-0.5B-Instruct';

// onnxruntime-web's default CPU memory arena pre-allocates in large growing
// chunks, which can throw `std::bad_alloc` from InferenceSession.create()
// even when the model would otherwise comfortably fit — and WebGPU sessions
// still run this same arena logic for their shared (non-GPU) bookkeeping.
// Disabling the arena/mem-pattern optimizations trades a little perf for a
// much lower peak-memory footprint during session setup, on either backend.
const SAFE_SESSION_OPTIONS = {
  executionMode: 'sequential' as const,
  enableCpuMemArena: false,
  enableMemPattern: false,
  graphOptimizationLevel: 'disabled' as const,
};

let generator: TextGenerationPipeline | null = null;

interface ProgressData {
  status: string;
  progress?: number;
  file?: string;
  loaded?: number;
  total?: number;
}

// This worker attempts exactly one (device, model) pair per instance — the
// caller (session.ts) decides which device to request and, if it fails,
// spins up a *fresh* worker for the fallback rather than retrying here.
// That matters: testing showed a failed large-model WebGPU attempt can
// leave the WASM heap fragmented enough that a same-worker WASM fallback
// afterward *also* fails with `std::bad_alloc`, even though that same
// fallback model succeeds reliably when it's a clean worker's first and
// only attempt.
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'init') {
    const device: 'webgpu' | 'wasm' = data?.device === 'webgpu' ? 'webgpu' : 'wasm';
    const modelId = device === 'webgpu' ? MODEL_ID_WEBGPU : MODEL_ID_WASM;

    try {
      self.postMessage({ type: 'status', state: 'loading', progress: 0, loaded: 0, total: 0, files: [] });

      const aggregator = createProgressAggregator();
      const progress_callback = (progressData: ProgressData) => {
        if (progressData.status === 'progress') {
          const agg = aggregator.update(progressData.file ?? '', progressData.loaded ?? 0, progressData.total ?? 0);
          self.postMessage({ type: 'status', state: 'loading', ...agg });
        }
      };

      generator = await pipeline('text-generation', modelId, {
        device,
        dtype: 'q4',
        progress_callback,
        session_options: SAFE_SESSION_OPTIONS,
      });

      self.postMessage({ type: 'status', state: 'ready' });
    } catch (err) {
      console.error(`Failed to load text-generation model (${device}):`, err);
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
