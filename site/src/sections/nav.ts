export function renderNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML = `
    <a class="brand" href="#about">Tianhao Zhou</a>
    <div class="links">
      <a href="#about">About</a>
      <a href="#skills">Skills</a>
      <a href="#projects">Projects</a>
      <a href="#contact">Contact</a>
    </div>
  `;
  return nav;
}
