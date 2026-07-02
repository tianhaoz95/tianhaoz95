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
import type { SpaceshipController } from './spaceship/types';

function renderFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.innerHTML = `<p>Built by <a href="https://github.com/tianhaoz95">@tianhaoz95</a></p>`;
  return footer;
}

function main() {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app root element missing');

  const nav = renderNav();
  app.appendChild(nav);

  const page = document.createElement('div');
  page.className = 'page';
  const sections = [renderAbout(profile), renderSkills(profile), renderProjects(profile), renderContact(profile)];
  sections.forEach((section) => section.classList.add('reveal'));
  sections.forEach((section) => page.appendChild(section));
  page.appendChild(renderFooter());
  app.appendChild(page);

  initScrollSpy();
  initScrollReveal();
  const bg = initBackgroundCanvas();

  // Chat panel renders open by default and starts pulling the text model
  // down immediately (see chat/session.ts) rather than waiting on user
  // interaction.
  const chatUi = initChatSidebar();

  // Space Ship Mode: @babylonjs/core and the whole spaceship/ module are
  // dynamically imported only on first activation, so they never touch the
  // main bundle or initial page load. Desktop-only for now — a 3D cockpit
  // needs a keyboard and a mouse to drag the stick/thruster, so touch
  // devices get a friendly notice instead of the download.
  const toggleBtn = nav.querySelector('.spaceship-toggle') as HTMLButtonElement;
  let spaceship: SpaceshipController | null = null;

  function setToggleLabel(label: string) {
    const labelEl = toggleBtn.querySelector('.spaceship-toggle-label');
    if (labelEl) labelEl.textContent = label;
  }

  function teardownSpaceship() {
    spaceship?.dispose();
    spaceship = null;
    document.body.classList.remove('spaceship-active');
    bg.resume();
    toggleBtn.setAttribute('aria-pressed', 'false');
    setToggleLabel('Space Ship Mode');
  }

  async function activateSpaceship() {
    toggleBtn.disabled = true;
    setToggleLabel('Loading…');
    try {
      const [{ startSpaceshipMode }] = await Promise.all([import('./spaceship/index')]);
      bg.pause();
      document.body.classList.add('spaceship-active');
      spaceship = startSpaceshipMode({ profile, chatUi, onExit: teardownSpaceship });
      toggleBtn.setAttribute('aria-pressed', 'true');
      setToggleLabel('Exit Ship');
    } catch (err) {
      console.error('Failed to start Space Ship Mode:', err);
      setToggleLabel('Space Ship Mode');
    } finally {
      toggleBtn.disabled = false;
    }
  }

  toggleBtn.addEventListener('click', async () => {
    if (spaceship) {
      teardownSpaceship();
      return;
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      const { showMobileNotice } = await import('./spaceship/mobileNotice');
      showMobileNotice(document.body, () => {});
      return;
    }
    void activateSpaceship();
  });
}

main();
