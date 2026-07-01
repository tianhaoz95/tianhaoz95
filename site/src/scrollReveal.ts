/**
 * Fades + lifts elements with the "reveal" class in as they enter the
 * viewport. Falls back to showing everything immediately when the browser
 * lacks IntersectionObserver or the user asked for reduced motion.
 */
export function initScrollReveal(): void {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  if (!targets.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  targets.forEach((el) => observer.observe(el));
}
