/**
 * Deliberately standalone: zero imports from anything else in spaceship/
 * (not even hud.ts or the shared spaceship.css). Space Ship Mode gates
 * touch devices to this notice *before* ever importing the Babylon-heavy
 * module — if this file shared a module with index.ts, bundlers can merge
 * them into one chunk, which would mean a mobile visitor downloads all of
 * @babylonjs/core just to see a "use desktop" message. Keeping this fully
 * self-contained (inlined styles, no shared code) guarantees it stays a
 * tiny, independent chunk no matter how the rest of the module evolves.
 */

const STYLE_ID = 'spaceship-mobile-notice-style';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ss-mobile-notice {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(5, 6, 14, 0.85);
      backdrop-filter: blur(6px);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .ss-mobile-notice-card {
      max-width: 360px;
      padding: 28px;
      border-radius: 18px;
      background: #0b0d16;
      border: 1px solid rgba(255, 255, 255, 0.12);
      text-align: center;
      color: #e6e8f0;
    }
    .ss-mobile-notice-eyebrow {
      margin: 0 0 6px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #06b6d4;
    }
    .ss-mobile-notice-card h3 {
      margin: 0 0 10px;
      color: #f4f5fb;
    }
    .ss-mobile-notice-card p {
      margin: 0 0 18px;
      line-height: 1.6;
      color: #b6bbd0;
    }
    .ss-mobile-notice-card button {
      font-size: 0.9rem;
      font-weight: 600;
      color: #ffffff;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      border: none;
      border-radius: 999px;
      padding: 10px 24px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

export function showMobileNotice(host: HTMLElement, onDismiss: () => void): void {
  ensureStyles();
  const notice = document.createElement('div');
  notice.className = 'ss-mobile-notice';
  notice.innerHTML = `
    <div class="ss-mobile-notice-card">
      <p class="ss-mobile-notice-eyebrow">Space Ship Mode</p>
      <h3>Best experienced on desktop</h3>
      <p>Flying the cockpit needs a keyboard and a mouse to drag the stick and thruster. Come back on a laptop or desktop to take the controls.</p>
      <button type="button">Got it</button>
    </div>
  `;
  host.appendChild(notice);
  notice.querySelector('button')?.addEventListener('click', () => {
    notice.remove();
    onDismiss();
  });
}
