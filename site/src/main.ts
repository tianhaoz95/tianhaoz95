import './theme.css';
import { profile } from './data/profile';
import { renderNav } from './sections/nav';
import { renderAbout } from './sections/about';
import { renderSkills } from './sections/skills';
import { renderProjects } from './sections/projects';
import { renderContact } from './sections/contact';
import { initChatSidebar } from './chat/session';
import { initScrollSpy } from './scrollSpy';
import { initScrollReveal } from './scrollReveal';
import { initBackgroundCanvas } from './bgCanvas';

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
  const sections = [renderAbout(profile), renderSkills(profile), renderProjects(profile), renderContact(profile)];
  sections.forEach((section) => section.classList.add('reveal'));
  sections.forEach((section) => page.appendChild(section));
  page.appendChild(renderFooter());
  app.appendChild(page);

  initScrollSpy();
  initScrollReveal();
  initBackgroundCanvas();

  // Chat panel renders open by default and starts pulling the text model
  // down immediately (see chat/session.ts) rather than waiting on user
  // interaction.
  initChatSidebar();
}

main();
