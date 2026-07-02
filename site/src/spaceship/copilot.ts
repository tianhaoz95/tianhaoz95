import { setCopilotMode } from '../chat/session';
import type { ChatUIController } from '../chat/ui';

const COPILOT_TITLE = 'Ship AI — Comms Console';
const COPILOT_PLACEHOLDER = 'Ask the ship AI…';
const DEFAULT_TITLE = 'Ask about this profile';
const DEFAULT_PLACEHOLDER = 'Ask about skills, projects, or contact info…';

/**
 * Re-skins the existing chat (same workers, same message history, same
 * tool-calling) into the "on-ship AI co-pilot" persona for Spaceship Mode —
 * no parallel chat implementation, just copy/system-prompt swaps that
 * revert cleanly on exit.
 */
export function enterCopilotMode(chatUi: ChatUIController): void {
  chatUi.setHeaderTitle(COPILOT_TITLE);
  chatUi.setInputPlaceholder(COPILOT_PLACEHOLDER);
  setCopilotMode(true);
}

export function exitCopilotMode(chatUi: ChatUIController): void {
  chatUi.setHeaderTitle(DEFAULT_TITLE);
  chatUi.setInputPlaceholder(DEFAULT_PLACEHOLDER);
  setCopilotMode(false);
}
