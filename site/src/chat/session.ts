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

const TOOL_CALL_RE = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/;
const MAX_TOOL_ROUNDS = 2;

let textWorker: Worker | null = null;
let visionWorker: Worker | null = null;
let textReady = false;
let visionReady = false;

const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

function createTextWorker(ui: ChatUIController): Promise<void> {
  return new Promise((resolve, reject) => {
    textWorker = new Worker(new URL('./textModel.worker.ts', import.meta.url), { type: 'module' });
    textWorker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'status') {
        const { state, progress, file, error } = e.data;
        ui.setStatus('text', state, progress, file);
        if (state === 'ready') {
          textReady = true;
          resolve();
        } else if (state === 'error') {
          reject(new Error(error));
        }
      }
    };
    textWorker.onerror = (err) => reject(err);
    textWorker.postMessage({ type: 'init' });
  });
}

function createVisionWorker(ui: ChatUIController): Promise<void> {
  return new Promise((resolve, reject) => {
    visionWorker = new Worker(new URL('./visionModel.worker.ts', import.meta.url), { type: 'module' });
    visionWorker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'status') {
        const { state, progress, file, error } = e.data;
        ui.setStatus('vision', state, progress, file);
        if (state === 'ready') {
          visionReady = true;
          resolve();
        } else if (state === 'error') {
          reject(new Error(error));
        }
      }
    };
    visionWorker.onerror = (err) => reject(err);
    visionWorker.postMessage({ type: 'init' });
  });
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

export function initChatSidebar(): void {
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
}
