import './chat.css';

export interface ChatUIHandlers {
  onSend: (text: string, imageFile: File | null) => void;
  onOpen: () => void;
}

export interface StreamHandle {
  appendToken: (token: string) => void;
  finish: () => void;
}

export interface ChatUIController {
  appendUserMessage: (text: string, imageFile: File | null) => void;
  beginAssistantMessage: () => StreamHandle;
  appendSystemNote: (text: string) => void;
  setStatus: (
    kind: 'text' | 'vision',
    state: 'idle' | 'loading' | 'ready' | 'error',
    progress?: number,
    label?: string,
  ) => void;
  setBusy: (busy: boolean) => void;
  clearImagePreview: () => void;
  getPendingImage: () => File | null;
}

export function initChatUI(handlers: ChatUIHandlers): ChatUIController {
  let pendingImage: File | null = null;
  let hasOpenedOnce = false;

  const fabWrap = document.createElement('div');
  fabWrap.className = 'chat-fab-wrap';
  fabWrap.innerHTML = `
    <span class="chat-fab-tooltip">Ask about this profile</span>
    <button class="chat-fab" aria-label="Open AI assistant chat">💬</button>
  `;
  document.body.appendChild(fabWrap);
  const fab = fabWrap.querySelector('.chat-fab') as HTMLButtonElement;

  const panel = document.createElement('aside');
  panel.className = 'chat-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <h2>Ask about this profile</h2>
      <button class="chat-close" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-status">
      <span class="chat-status-label"></span>
      <div class="chat-status-bar"><div class="chat-status-bar-fill"></div></div>
    </div>
    <div class="chat-messages"></div>
    <div class="chat-footer">
      <div class="chat-image-preview">
        <img alt="Attached image preview" />
        <span class="chat-image-name"></span>
        <button type="button" class="chat-image-remove">remove</button>
      </div>
      <div class="chat-input-row">
        <button type="button" class="chat-attach" aria-label="Attach image">📎</button>
        <input type="file" accept="image/*" class="chat-file-input" hidden />
        <textarea placeholder="Ask about skills, projects, or contact info…" rows="1"></textarea>
        <button type="button" class="chat-send" aria-label="Send message">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector('.chat-messages') as HTMLDivElement;
  const textarea = panel.querySelector('textarea') as HTMLTextAreaElement;
  const sendBtn = panel.querySelector('.chat-send') as HTMLButtonElement;
  const attachBtn = panel.querySelector('.chat-attach') as HTMLButtonElement;
  const fileInput = panel.querySelector('.chat-file-input') as HTMLInputElement;
  const closeBtn = panel.querySelector('.chat-close') as HTMLButtonElement;
  const statusEl = panel.querySelector('.chat-status') as HTMLDivElement;
  const statusLabel = panel.querySelector('.chat-status-label') as HTMLSpanElement;
  const statusBarFill = panel.querySelector('.chat-status-bar-fill') as HTMLDivElement;
  const imagePreview = panel.querySelector('.chat-image-preview') as HTMLDivElement;
  const imagePreviewImg = panel.querySelector('.chat-image-preview img') as HTMLImageElement;
  const imagePreviewName = panel.querySelector('.chat-image-name') as HTMLSpanElement;
  const imageRemoveBtn = panel.querySelector('.chat-image-remove') as HTMLButtonElement;

  function openPanel() {
    panel.classList.add('open');
    if (!hasOpenedOnce) {
      hasOpenedOnce = true;
      handlers.onOpen();
    }
  }
  function closePanel() {
    panel.classList.remove('open');
  }

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0] ?? null;
    pendingImage = file;
    if (file) {
      imagePreviewImg.src = URL.createObjectURL(file);
      imagePreviewName.textContent = file.name;
      imagePreview.classList.add('visible');
    }
  });
  imageRemoveBtn.addEventListener('click', () => {
    pendingImage = null;
    fileInput.value = '';
    imagePreview.classList.remove('visible');
  });

  function submit() {
    const text = textarea.value.trim();
    if (!text) return;
    handlers.onSend(text, pendingImage);
    textarea.value = '';
  }
  sendBtn.addEventListener('click', submit);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  const controller: ChatUIController = {
    appendUserMessage(text, imageFile) {
      const el = document.createElement('div');
      el.className = 'chat-message user';
      el.textContent = text;
      if (imageFile) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(imageFile);
        img.alt = 'Attached image';
        el.appendChild(img);
      }
      messagesEl.appendChild(el);
      scrollToBottom();
    },
    beginAssistantMessage() {
      const el = document.createElement('div');
      el.className = 'chat-message assistant';
      messagesEl.appendChild(el);
      scrollToBottom();
      return {
        appendToken(token: string) {
          el.textContent += token;
          scrollToBottom();
        },
        finish() {
          scrollToBottom();
        },
      };
    },
    appendSystemNote(text) {
      const el = document.createElement('div');
      el.className = 'chat-message assistant';
      el.style.opacity = '0.7';
      el.style.fontStyle = 'italic';
      el.textContent = text;
      messagesEl.appendChild(el);
      scrollToBottom();
    },
    setStatus(kind, state, progress, label) {
      if (state === 'idle') {
        statusEl.classList.remove('visible');
        return;
      }
      statusEl.classList.add('visible');
      const prefix = kind === 'text' ? 'Assistant model' : 'Image model';
      if (state === 'loading') {
        statusLabel.textContent = label ? `${prefix}: ${label}` : `${prefix}: loading…`;
        statusBarFill.style.width = `${Math.round((progress ?? 0) * 100)}%`;
      } else if (state === 'ready') {
        statusLabel.textContent = `${prefix}: ready`;
        statusBarFill.style.width = '100%';
        setTimeout(() => statusEl.classList.remove('visible'), 1200);
      } else if (state === 'error') {
        statusLabel.textContent = `${prefix}: failed to load`;
      }
    },
    setBusy(busy) {
      sendBtn.disabled = busy;
      attachBtn.disabled = busy;
      textarea.disabled = busy;
    },
    clearImagePreview() {
      pendingImage = null;
      fileInput.value = '';
      imagePreview.classList.remove('visible');
    },
    getPendingImage() {
      return pendingImage;
    },
  };

  return controller;
}
