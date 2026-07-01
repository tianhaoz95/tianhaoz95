import './theme.css';
import { profile } from './data/profile';
import { renderNav } from './sections/nav';
import { renderAbout } from './sections/about';
import { renderSkills } from './sections/skills';
import { renderProjects } from './sections/projects';
import { renderContact } from './sections/contact';
import { initChatSidebar } from './chat/session';

function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.innerHTML = `<p>Built by <a href="https://github.com/tianhaoz95">@tianhaoz95</a></p>`;
  return footer;
}

function main() {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app root element missing');

  app.appendChild(renderNav());

  const page = document.createElement('div');
  page.className = 'page';
  page.appendChild(renderAbout(profile));
  page.appendChild(renderSkills(profile));
  page.appendChild(renderProjects(profile));
  page.appendChild(renderContact(profile));
  page.appendChild(renderFooter());
  app.appendChild(page);

  // Wires up the chat FAB's click listener only — no model download happens
  // until the user actually opens the panel.
  initChatSidebar();
}

main();
