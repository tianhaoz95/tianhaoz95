import { initChatUI, type ChatUIController } from './ui';
import { profileTools, callProfileTool } from './tools';

interface ChatMessage {
  role: string;
  content: string;
}

const SYSTEM_PROMPT =
  "You are the assistant embedded on Tianhao Zhou's (tianhaoz95) developer profile website. " +
  'Answer questions about his skills, tech stack, projects, and contact info using the ' +
  'get_profile_section tool — never guess or invent details about his work. For anything ' +
  'unrelated to this profile, answer briefly and helpfully as a general assistant. Keep replies concise.';

// Layered on top of SYSTEM_PROMPT (not a replacement) while Spaceship Mode
// is active — same facts, same tool, just a warmer in-universe voice for
// the "AI co-pilot" framing. Toggled via setCopilotMode() from
// spaceship/copilot.ts.
const COPILOT_ADDENDUM =
  ' Right now you are also role-playing as the ship\'s onboard AI co-pilot in "Space Ship Mode" — ' +
  "keep every factual answer exactly as accurate as usual, but deliver it with a warm, adventurous " +
  'sci-fi co-pilot voice (e.g. referring to profile sections as "logs" or "data banks"). Keep replies concise.';

const TOOL_CALL_RE = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/;
const MAX_TOOL_ROUNDS = 2;

let textWorker: Worker | null = null;
let visionWorker: Worker | null = null;
let textReady = false;
let visionReady = false;

const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

type Device = 'webgpu' | 'wasm';

// A `GPUAdapter` existing isn't enough to trust the large model to it: a
// software/CPU-emulated adapter (e.g. SwiftShader) reports as WebGPU-capable
// but still runs the whole session through the same constrained WASM heap
// as the plain CPU backend, with no real GPU memory to lean on. Detecting
// that up front (via `GPUAdapterInfo.isFallbackAdapter`) means we go
// straight to the small model on those devices instead of gambling on a
// large-model attempt that's likely to fail anyway.
async function detectPreferredDevice(): Promise<Device> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<any> } }).gpu;
  if (!gpu) return 'wasm';
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return 'wasm';
    const info = adapter.info ?? (await adapter.requestAdapterInfo?.());
    return info?.isFallbackAdapter ? 'wasm' : 'webgpu';
  } catch {
    return 'wasm';
  }
}

function wireModelWorker(
  worker: Worker,
  kind: 'text' | 'vision',
  device: Device,
  ui: ChatUIController,
): Promise<void> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'status') {
        const { state, progress, loaded, total, files, error } = e.data;
        ui.setStatus(kind, { state, progress, loaded, total, files, error });
        if (state === 'ready') resolve();
        else if (state === 'error') reject(new Error(error));
      }
    };
    worker.onerror = (err) => reject(new Error(err.message || 'Worker error'));
    worker.postMessage({ type: 'init', data: { device } });
  });
}

// Each attempt gets its own worker rather than retrying in-process: testing
// showed a failed large-model WebGPU attempt can leave the shared WASM heap
// fragmented enough that a same-worker WASM fallback afterward *also*
// throws `std::bad_alloc`, even though that same model succeeds reliably
// when it's a clean worker's only attempt. Terminating the failed worker
// before spinning up a new one ensures the fallback starts from scratch.
async function createWorkerWithFallback(
  factory: () => Worker,
  kind: 'text' | 'vision',
  ui: ChatUIController,
): Promise<Worker> {
  const device = await detectPreferredDevice();
  const worker = factory();
  try {
    await wireModelWorker(worker, kind, device, ui);
    return worker;
  } catch (err) {
    if (device === 'wasm') throw err; // already the safe path — nothing left to fall back to
    console.warn(`${kind} model failed to load on WebGPU, retrying with a fresh WASM worker:`, err);
    worker.terminate();
    const fallbackWorker = factory();
    await wireModelWorker(fallbackWorker, kind, 'wasm', ui);
    return fallbackWorker;
  }
}

async function createTextWorker(ui: ChatUIController): Promise<void> {
  textWorker = await createWorkerWithFallback(
    () => new Worker(new URL('./textModel.worker.ts', import.meta.url), { type: 'module' }),
    'text',
    ui,
  );
  textReady = true;
}

async function createVisionWorker(ui: ChatUIController): Promise<void> {
  visionWorker = await createWorkerWithFallback(
    () => new Worker(new URL('./visionModel.worker.ts', import.meta.url), { type: 'module' }),
    'vision',
    ui,
  );
  visionReady = true;
}

async function ensureTextWorker(ui: ChatUIController): Promise<void> {
  if (textReady) return;
  if (!textWorker) await createTextWorker(ui);
  else await new Promise<void>((resolve) => (textReady ? resolve() : setTimeout(resolve, 50)));
}

async function ensureVisionWorker(ui: ChatUIController): Promise<void> {
  if (visionReady) return;
  if (!visionWorker) await createVisionWorker(ui);
  else await new Promise<void>((resolve) => (visionReady ? resolve() : setTimeout(resolve, 50)));
}

function analyzeImage(imageFile: File, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!visionWorker) return reject(new Error('Vision worker not initialized'));
    const imageUrl = URL.createObjectURL(imageFile);
    const handler = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'done') {
        visionWorker?.removeEventListener('message', handler);
        resolve(e.data.data);
      } else if (type === 'error') {
        visionWorker?.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };
    visionWorker.addEventListener('message', handler);
    visionWorker.postMessage({ type: 'analyze', data: { imageUrl, prompt } });
  });
}

function generateOnce(
  tools: unknown,
  onToken: (token: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!textWorker) return reject(new Error('Text worker not initialized'));
    const handler = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'token') {
        onToken(e.data.data);
      } else if (type === 'done') {
        textWorker?.removeEventListener('message', handler);
        resolve(e.data.data);
      } else if (type === 'error') {
        textWorker?.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };
    textWorker.addEventListener('message', handler);
    textWorker.postMessage({ type: 'generate', data: { messages, tools } });
  });
}

function parseToolCall(text: string): { name: string; arguments: Record<string, unknown> } | null {
  const match = text.match(TOOL_CALL_RE);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function handleSend(ui: ChatUIController, text: string, imageFile: File | null): Promise<void> {
  ui.appendUserMessage(text, imageFile);
  ui.setBusy(true);

  try {
    let outgoingText = text;

    if (imageFile) {
      ui.appendSystemNote('Analyzing the attached image…');
      await ensureVisionWorker(ui);
      const analysis = await analyzeImage(imageFile, text);
      outgoingText = `[Image analysis: ${analysis}]\n${text}`;
    }
    ui.clearImagePreview();

    messages.push({ role: 'user', content: outgoingText });

    await ensureTextWorker(ui);

    let rounds = 0;
    let finalText = '';
    let stream = ui.beginAssistantMessage();

    while (rounds < MAX_TOOL_ROUNDS) {
      const raw = await generateOnce(profileTools, (token) => stream.appendToken(token));
      const toolCall = parseToolCall(raw);

      if (!toolCall) {
        finalText = raw;
        stream.finish();
        break;
      }

      // A tool call was made — the streamed raw text (the <tool_call> block) isn't
      // meant for the user; leave that bubble as-is and open a fresh one for the
      // real, tool-informed answer that follows.
      stream.finish();
      messages.push({ role: 'assistant', content: raw });
      const result = callProfileTool(toolCall.name, toolCall.arguments as { section?: string });
      messages.push({ role: 'tool', content: JSON.stringify(result) });

      rounds += 1;
      stream = ui.beginAssistantMessage();
    }

    if (finalText) {
      messages.push({ role: 'assistant', content: finalText });
    }
  } catch (err) {
    console.error('Chat error:', err);
    ui.appendSystemNote(`Something went wrong: ${(err as Error).message}`);
  } finally {
    ui.setBusy(false);
  }
}

// Space Ship Mode re-skins this same chat (workers, tool-calling, message
// history all untouched) into an in-cockpit "AI co-pilot" — this just swaps
// the live system-message content in place so the next generation picks it
// up, with zero changes to handleSend or the worker protocol.
export function setCopilotMode(active: boolean): void {
  messages[0].content = active ? SYSTEM_PROMPT + COPILOT_ADDENDUM : SYSTEM_PROMPT;
}

export function initChatSidebar(): ChatUIController {
  const ui: ChatUIController = initChatUI({
    onSend: (text, imageFile) => {
      void handleSend(ui, text, imageFile);
    },
  });

  // Start pulling the text model down immediately rather than waiting for
  // the user to open the panel — the panel is visible by default now, so
  // there's no "first open" moment to defer to, and starting the download
  // at page load hides its latency behind whatever else the visitor reads
  // first. The vision model stays lazy: it's only needed if/when an image
  // gets attached.
  ui.setBusy(true);
  ui.setInputPlaceholder('Model is loading…');
  ensureTextWorker(ui)
    .then(() => {
      ui.setBusy(false);
      ui.setInputPlaceholder('');
    })
    .catch((err) => {
      console.error('Failed to load assistant model:', err);
      ui.setInputPlaceholder("Model failed to load — see the note above.");
      ui.appendSystemNote(
        "Couldn't load the assistant model — this can happen on browsers without WebGPU support " +
          'or with limited available memory. Try a recent Chrome/Edge, close other tabs, and reload.',
      );
    });

  return ui;
}
