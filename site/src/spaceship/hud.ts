import { renderInfoPanel } from './infoPanels';
import { themeColorHex } from './themeColors';
import type { CockpitButtonId } from './types';
import type { Profile } from '../data/profile';

interface LegendEntry {
  id: CockpitButtonId;
  label: string;
  color: string;
}

const LEGEND: LegendEntry[] = [
  { id: 'about', label: 'About', color: themeColorHex('--accent', '#4f46e5') },
  { id: 'skills', label: 'Skills', color: themeColorHex('--accent-2', '#06b6d4') },
  { id: 'projects', label: 'Projects', color: '#a855f7' },
  { id: 'contact', label: 'Contact', color: '#f59e0b' },
];

export interface HudController {
  showPanel: (id: CockpitButtonId) => void;
  hidePanel: () => void;
  setSpeed: (metersPerSecond: number) => void;
  dispose: () => void;
}

export function createHud(host: HTMLElement, profile: Profile, onExit: () => void): HudController {
  const hud = document.createElement('div');
  hud.className = 'cockpit-hud';
  hud.innerHTML = `
    <div class="ss-topbar">
      <div class="ss-readout"><span class="ss-readout-label">Speed</span><span class="ss-speed">0</span></div>
      <button type="button" class="ss-exit-btn">Exit ⤫</button>
    </div>
    <div class="ss-legend">
      ${LEGEND.map((entry) => `<button type="button" class="ss-legend-item" data-id="${entry.id}" style="--dot:${entry.color}"><span class="ss-legend-dot"></span>${entry.label}</button>`).join('')}
    </div>
    <div class="ss-panel-host">
      <div class="ss-panel">
        <button type="button" class="ss-panel-close" aria-label="Close panel">✕</button>
        <div class="ss-panel-mount"></div>
      </div>
    </div>
    <p class="ss-hint">W A S D to fly · drag the stick &amp; thruster · click a console button</p>
  `;
  host.appendChild(hud);

  const speedEl = hud.querySelector('.ss-speed') as HTMLSpanElement;
  const panelHost = hud.querySelector('.ss-panel-host') as HTMLDivElement;
  const panelMount = hud.querySelector('.ss-panel-mount') as HTMLDivElement;
  const panelClose = hud.querySelector('.ss-panel-close') as HTMLButtonElement;
  const exitBtn = hud.querySelector('.ss-exit-btn') as HTMLButtonElement;

  function showPanel(id: CockpitButtonId) {
    panelMount.innerHTML = '';
    panelMount.appendChild(renderInfoPanel(id, profile));
    panelHost.classList.add('open');
  }
  function hidePanel() {
    panelHost.classList.remove('open');
  }

  panelClose.addEventListener('click', hidePanel);
  exitBtn.addEventListener('click', onExit);

  const legendButtons = Array.from(hud.querySelectorAll<HTMLButtonElement>('.ss-legend-item'));
  for (const button of legendButtons) {
    button.addEventListener('click', () => showPanel(button.dataset.id as CockpitButtonId));
  }

  return {
    showPanel,
    hidePanel,
    setSpeed(metersPerSecond) {
      speedEl.textContent = String(Math.round(Math.abs(metersPerSecond) * 10));
    },
    dispose() {
      hud.remove();
    },
  };
}

