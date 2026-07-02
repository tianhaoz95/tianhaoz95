import type { CockpitButtonId } from './types';
import type { Profile } from '../data/profile';

/**
 * Cockpit-styled readouts for the console buttons — pulls from the exact
 * same `profile` object the normal page sections render, just laid out for
 * a compact "ship data terminal" screen instead of the page's card grid.
 */

function el(tag: string, className: string, html?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function renderAboutPanel(profile: Profile): HTMLElement {
  const root = el('div', 'ss-panel-content');
  root.appendChild(el('p', 'ss-panel-eyebrow', 'Pilot Log'));
  root.appendChild(el('h3', 'ss-panel-title', profile.name));
  root.appendChild(el('p', 'ss-panel-handle', profile.handle));
  root.appendChild(el('p', 'ss-panel-body', profile.bio));
  const pills = el('div', 'ss-pills');
  for (const pill of profile.pills) pills.appendChild(el('span', 'ss-pill', pill));
  root.appendChild(pills);
  return root;
}

function renderSkillsPanel(profile: Profile): HTMLElement {
  const root = el('div', 'ss-panel-content');
  root.appendChild(el('p', 'ss-panel-eyebrow', 'Systems Manifest'));
  root.appendChild(el('h3', 'ss-panel-title', 'Skills Data Bank'));
  for (const group of profile.skillGroups) {
    const card = el('div', 'ss-skill-group');
    card.appendChild(el('p', 'ss-skill-group-title', `${group.icon} ${group.title}`));
    const tags = el('div', 'ss-tags');
    for (const tag of group.tags) tags.appendChild(el('span', 'ss-tag', tag));
    card.appendChild(tags);
    root.appendChild(card);
  }
  return root;
}

function renderProjectsPanel(profile: Profile): HTMLElement {
  const root = el('div', 'ss-panel-content');
  root.appendChild(el('p', 'ss-panel-eyebrow', 'Mission Archive'));
  root.appendChild(el('h3', 'ss-panel-title', 'Projects Log'));
  for (const project of profile.projects) {
    const card = el('a', 'ss-project-card');
    card.setAttribute('href', project.repoUrl);
    card.setAttribute('target', '_blank');
    card.setAttribute('rel', 'noopener');
    card.appendChild(el('p', 'ss-project-title', `${project.emoji} ${project.title}`));
    card.appendChild(el('p', 'ss-project-desc', project.description));
    const tags = el('div', 'ss-tags');
    for (const tag of project.tags) tags.appendChild(el('span', 'ss-tag', tag));
    card.appendChild(tags);
    root.appendChild(card);
  }
  return root;
}

function renderContactPanel(profile: Profile): HTMLElement {
  const root = el('div', 'ss-panel-content');
  root.appendChild(el('p', 'ss-panel-eyebrow', 'Comms Array'));
  root.appendChild(el('h3', 'ss-panel-title', 'Open a Channel'));
  const grid = el('div', 'ss-contact-grid');
  for (const link of profile.contactLinks) {
    const item = el('a', 'ss-contact-link', `<span>${link.icon}</span><span>${link.label}</span>`);
    item.setAttribute('href', link.href);
    if (link.href.startsWith('http')) {
      item.setAttribute('target', '_blank');
      item.setAttribute('rel', 'noopener');
    }
    grid.appendChild(item);
  }
  root.appendChild(grid);
  return root;
}

const RENDERERS: Record<CockpitButtonId, (profile: Profile) => HTMLElement> = {
  about: renderAboutPanel,
  skills: renderSkillsPanel,
  projects: renderProjectsPanel,
  contact: renderContactPanel,
};

export function renderInfoPanel(id: CockpitButtonId, profile: Profile): HTMLElement {
  return RENDERERS[id](profile);
}
