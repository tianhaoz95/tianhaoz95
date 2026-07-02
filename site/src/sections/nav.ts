export function renderNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML = `
    <a class="brand" href="#about"><span class="brand-mark">TZ</span>Tianhao Zhou</a>
    <div class="links">
      <a href="#about">About</a>
      <a href="#skills">Skills</a>
      <a href="#projects">Projects</a>
      <a href="#contact">Contact</a>
    </div>
    <button class="spaceship-toggle" type="button" aria-pressed="false"><span class="spaceship-toggle-icon">🚀</span><span class="spaceship-toggle-label">Space Ship Mode</span></button>
  `;
  return nav;
}
