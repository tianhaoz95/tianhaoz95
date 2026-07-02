export interface BackgroundCanvasController {
  pause: () => void;
  resume: () => void;
}

/**
 * Site-wide particle-network background — a single fixed canvas behind
 * every section (not just the hero), drawn fresh every frame instead of
 * baked into an image, so it re-themes, resizes, and reacts to the
 * pointer for free. Nodes drift, link to nearby nodes, and additionally
 * link to / gently flee the cursor so the background feels alive rather
 * than decorative.
 */
export function initBackgroundCanvas(): BackgroundCanvasController {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const host = document.createElement('div');
  host.className = 'bg-canvas-host';
  host.setAttribute('aria-hidden', 'true');
  document.body.prepend(host);

  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return { pause: () => {}, resume: () => {} };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const LINK_DIST = 140;
  const CURSOR_LINK_DIST = 190;
  const REPEL_DIST = 110;
  const REPEL_STRENGTH = 0.6;
  const POINTER_IDLE_MS = 2200;

  interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
  }

  let width = 0;
  let height = 0;
  let nodes: Node[] = [];
  let pointerX = 0;
  let pointerY = 0;
  let lastPointerMove = 0;
  let paused = false;
  let rafId = 0;

  function nodeCountFor(area: number): number {
    return Math.round(Math.min(100, Math.max(36, area / 16000)));
  }

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed(): void {
    const count = nodeCountFor(width * height);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));
  }

  function accentColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c9bff';
  }

  function pointerActive(): boolean {
    return performance.now() - lastPointerMove < POINTER_IDLE_MS;
  }

  function step(): void {
    const hasPointer = pointerActive();
    for (const node of nodes) {
      if (hasPointer) {
        const dx = node.x - pointerX;
        const dy = node.y - pointerY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < REPEL_DIST) {
          const force = ((REPEL_DIST - dist) / REPEL_DIST) * REPEL_STRENGTH;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }
      // Gentle damping keeps repulsion from accumulating into runaway speed.
      node.vx *= 0.98;
      node.vy *= 0.98;
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    }
  }

  function draw(): void {
    ctx!.clearRect(0, 0, width, height);
    const color = accentColor();
    const hasPointer = pointerActive();

    ctx!.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= LINK_DIST) continue;
        ctx!.globalAlpha = (1 - dist / LINK_DIST) * 0.3;
        ctx!.strokeStyle = color;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
    }

    if (hasPointer) {
      for (const node of nodes) {
        const dist = Math.hypot(node.x - pointerX, node.y - pointerY);
        if (dist >= CURSOR_LINK_DIST) continue;
        ctx!.globalAlpha = (1 - dist / CURSOR_LINK_DIST) * 0.55;
        ctx!.strokeStyle = color;
        ctx!.beginPath();
        ctx!.moveTo(node.x, node.y);
        ctx!.lineTo(pointerX, pointerY);
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

    if (hasPointer) {
      ctx!.globalAlpha = 0.9;
      ctx!.beginPath();
      ctx!.arc(pointerX, pointerY, 3, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  function loop(): void {
    if (paused) return;
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  resize();
  seed();

  if (prefersReducedMotion) {
    // Still render one frame so the effect isn't just a blank layer, but
    // skip the animation loop and all pointer-driven motion.
    draw();
  } else {
    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      lastPointerMove = performance.now();
    });
    loop();
  }

  window.addEventListener('resize', () => {
    resize();
    if (prefersReducedMotion || paused) draw();
  });

  return {
    // Cancels the RAF loop and hides the (fully covered) canvas host so it
    // isn't even composited — used while another full-viewport layer (e.g.
    // spaceship mode) is on top of it.
    pause() {
      if (paused) return;
      paused = true;
      cancelAnimationFrame(rafId);
      host.classList.add('bg-canvas-host--paused');
    },
    resume() {
      if (!paused) return;
      paused = false;
      host.classList.remove('bg-canvas-host--paused');
      if (prefersReducedMotion) draw();
      else loop();
    },
  };
}
