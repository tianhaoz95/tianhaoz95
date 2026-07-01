/**
 * Highlights the nav link for whichever section the viewport is currently
 * scrolled into — the active section is the last one whose top has crossed
 * a fixed line near the top of the viewport (below the sticky nav), not
 * whichever section happens to have the largest visible ratio (that biases
 * toward short sections over tall ones).
 */
export function initScrollSpy(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id]'));
  const links = new Map<string, HTMLAnchorElement>();
  document.querySelectorAll<HTMLAnchorElement>('.site-nav .links a').forEach((link) => {
    const id = link.getAttribute('href')?.slice(1);
    if (id) links.set(id, link);
  });
  if (!sections.length || !links.size) return;

  const setActive = (id: string) => {
    links.forEach((link, linkId) => link.classList.toggle('active', linkId === id));
  };

  const LINE = 120; // px from top of viewport, below the sticky nav

  let ticking = false;
  const update = () => {
    ticking = false;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= LINE) {
        current = section;
      }
    }
    setActive(current.id);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  update();
}
