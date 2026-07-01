/**
 * Live particle-network visualization for the hero background — nodes
 * drift and link up with faint lines, drawn fresh every frame rather than
 * baked into a static image, so it scales, re-themes, and resizes for
 * free. Reads --accent off the root so it tracks the light/dark palette
 * without any separate asset variants.
 */
export function initHeroCanvas(host: HTMLElement): void {
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const NODE_COUNT = 28;
  const LINK_DIST = 130;

  interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
  }

  let width = 0;
  let height = 0;
  let nodes: Node[] = [];

  function resize(): void {
    const rect = host.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed(): void {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }

  function accentColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c9bff';
  }

  function draw(): void {
    ctx!.clearRect(0, 0, width, height);
    const color = accentColor();

    if (!prefersReducedMotion) {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
    }

    ctx!.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= LINK_DIST) continue;
        ctx!.globalAlpha = (1 - dist / LINK_DIST) * 0.35;
        ctx!.strokeStyle = color;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
    }

    ctx!.globalAlpha = 0.8;
    ctx!.fillStyle = color;
    for (const node of nodes) {
      ctx!.beginPath();
      ctx!.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  function loop(): void {
    draw();
    if (!prefersReducedMotion) requestAnimationFrame(loop);
  }

  resize();
  seed();
  loop();

  window.addEventListener('resize', () => {
    resize();
    if (prefersReducedMotion) draw();
  });
}
