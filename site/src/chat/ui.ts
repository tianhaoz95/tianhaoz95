import './chat.css';

export interface ChatUIHandlers {
  onSend: (text: string, imageFile: File | null) => void;
}

export interface StreamHandle {
  appendToken: (token: string) => void;
  finish: () => void;
}

export interface StatusFile {
  name: string;
  loaded: number;
  total: number;
}

export interface StatusInfo {
  state: 'idle' | 'loading' | 'ready' | 'error';
  progress?: number;
  loaded?: number;
  total?: number;
  files?: StatusFile[];
  error?: string;
}

export interface ChatUIController {
  appendUserMessage: (text: string, imageFile: File | null) => void;
  beginAssistantMessage: () => StreamHandle;
  appendSystemNote: (text: string) => void;
  setStatus: (kind: 'text' | 'vision', info: StatusInfo) => void;
  setBusy: (busy: boolean) => void;
  setInputPlaceholder: (text: string) => void;
  setHeaderTitle: (text: string) => void;
  clearImagePreview: () => void;
  getPendingImage: () => File | null;
}

const DEFAULT_HEADER_TITLE = 'Ask about this profile';

const DEFAULT_PLACEHOLDER = 'Ask about skills, projects, or contact info…';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex > 0 && value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export function initChatUI(handlers: ChatUIHandlers): ChatUIController {
  let pendingImage: File | null = null;

  const fabWrap = document.createElement('div');
  fabWrap.className = 'chat-fab-wrap';
  fabWrap.innerHTML = `
    <span class="chat-fab-tooltip">Toggle AI assistant chat</span>
    <button class="chat-fab" aria-label="Toggle AI assistant chat">💬</button>
  `;
  document.body.appendChild(fabWrap);
  const fab = fabWrap.querySelector('.chat-fab') as HTMLButtonElement;

  // Open by default — this is the site's AI assistant, not an opt-in widget,
  // so it should be visible right away and dismissible rather than hidden
  // behind a click. (Actual opening happens via setOpen(true) below, once
  // the FAB it needs to hide also exists.)
  const panel = document.createElement('aside');
  panel.className = 'chat-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <h2>Ask about this profile</h2>
      <button class="chat-close" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-status">
      <div class="chat-status-head">
        <span class="chat-status-dot" aria-hidden="true"></span>
        <span class="chat-status-label"></span>
        <span class="chat-status-percent"></span>
      </div>
      <div class="chat-status-bar"><div class="chat-status-bar-fill"></div></div>
      <div class="chat-status-bytes"></div>
      <div class="chat-status-files"></div>
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

  const headerTitle = panel.querySelector('.chat-header h2') as HTMLHeadingElement;
  const messagesEl = panel.querySelector('.chat-messages') as HTMLDivElement;
  const textarea = panel.querySelector('textarea') as HTMLTextAreaElement;
  const sendBtn = panel.querySelector('.chat-send') as HTMLButtonElement;
  const attachBtn = panel.querySelector('.chat-attach') as HTMLButtonElement;
  const fileInput = panel.querySelector('.chat-file-input') as HTMLInputElement;
  const closeBtn = panel.querySelector('.chat-close') as HTMLButtonElement;
  const statusEl = panel.querySelector('.chat-status') as HTMLDivElement;
  const statusLabel = panel.querySelector('.chat-status-label') as HTMLSpanElement;
  const statusPercent = panel.querySelector('.chat-status-percent') as HTMLSpanElement;
  const statusBarFill = panel.querySelector('.chat-status-bar-fill') as HTMLDivElement;
  const statusBytes = panel.querySelector('.chat-status-bytes') as HTMLDivElement;
  const statusFiles = panel.querySelector('.chat-status-files') as HTMLDivElement;
  const imagePreview = panel.querySelector('.chat-image-preview') as HTMLDivElement;
  const imagePreviewImg = panel.querySelector('.chat-image-preview img') as HTMLImageElement;
  const imagePreviewName = panel.querySelector('.chat-image-name') as HTMLSpanElement;
  const imageRemoveBtn = panel.querySelector('.chat-image-remove') as HTMLButtonElement;

  // The FAB sits in the same corner the panel floats in, so once the panel
  // is open it visually (and hit-test-wise) covers the FAB — hide it while
  // open rather than leaving a dead button underneath that swallows clicks
  // meant for the panel.
  function setOpen(open: boolean) {
    panel.classList.toggle('open', open);
    fabWrap.classList.toggle('chat-fab-wrap--hidden', open);
  }
  function togglePanel() {
    setOpen(!panel.classList.contains('open'));
  }
  function closePanel() {
    setOpen(false);
  }

  setOpen(true);
  fab.addEventListener('click', togglePanel);
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

  function renderStatusFiles(files: StatusFile[]) {
    statusFiles.innerHTML = '';
    for (const file of files) {
      const pct = file.total > 0 ? Math.round((file.loaded / file.total) * 100) : 0;
      const done = pct >= 100;

      const row = document.createElement('div');
      row.className = done ? 'chat-status-file done' : 'chat-status-file';
      row.style.setProperty('--file-pct', `${pct}%`);

      const name = document.createElement('span');
      name.className = 'chat-status-file-name';
      name.textContent = file.name;

      const percent = document.createElement('span');
      percent.className = 'chat-status-file-percent';
      percent.textContent = done ? '✓' : `${pct}%`;

      row.append(name, percent);
      statusFiles.appendChild(row);
    }
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
    setStatus(kind, info) {
      const { state } = info;
      if (state === 'idle') {
        statusEl.classList.remove('visible');
        return;
      }

      statusEl.classList.add('visible');
      statusEl.classList.remove('loading', 'ready', 'error');
      statusEl.classList.add(state);

      const prefix = kind === 'text' ? 'Assistant model' : 'Image model';

      if (state === 'loading') {
        const pct = Math.round(info.progress ?? 0);
        statusLabel.textContent = `${prefix} — downloading`;
        statusPercent.textContent = `${pct}%`;
        statusBarFill.style.width = `${pct}%`;
        statusBytes.textContent =
          info.total && info.total > 0 ? `${formatBytes(info.loaded ?? 0)} / ${formatBytes(info.total)}` : '';
        renderStatusFiles(info.files ?? []);
      } else if (state === 'ready') {
        statusLabel.textContent = `${prefix} — ready`;
        statusPercent.textContent = '100%';
        statusBarFill.style.width = '100%';
        statusBytes.textContent = '';
        statusFiles.innerHTML = '';
        setTimeout(() => statusEl.classList.remove('visible'), 1200);
      } else if (state === 'error') {
        statusLabel.textContent = `${prefix} — failed to load`;
        statusPercent.textContent = '';
      }
    },
    setBusy(busy) {
      sendBtn.disabled = busy;
      attachBtn.disabled = busy;
      textarea.disabled = busy;
    },
    setInputPlaceholder(text) {
      textarea.placeholder = text || DEFAULT_PLACEHOLDER;
    },
    setHeaderTitle(text) {
      headerTitle.textContent = text || DEFAULT_HEADER_TITLE;
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
