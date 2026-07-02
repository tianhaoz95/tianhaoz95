import { DynamicTexture, type Scene } from '@babylonjs/core';

/**
 * Procedural texture "recipes" — plain 2D canvas drawing wrapped in a
 * Babylon DynamicTexture, the same technique bgCanvas.ts already uses for
 * the site's particle background. Keeps every visual asset generated in
 * code instead of shipping binary textures/models.
 */

function makeTexture(name: string, scene: Scene, size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): DynamicTexture {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  paint(ctx, size);
  texture.update(false);
  return texture;
}

export function paintStarfield(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('spaceship-starfield', { width: 2048, height: 1024 }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const w = 2048;
  const h = 1024;

  ctx.fillStyle = '#01010a';
  ctx.fillRect(0, 0, w, h);

  // A few soft nebula blobs in the site's own accent colors, so the deep
  // scene still carries the brand's indigo/cyan identity.
  const nebulae: Array<[string, number]> = [
    ['rgba(79, 70, 229, 0.22)', 0.28],
    ['rgba(6, 182, 212, 0.16)', 0.22],
    ['rgba(168, 85, 247, 0.14)', 0.2],
  ];
  for (const [color, radiusFrac] of nebulae) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const r = w * radiusFrac;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // Stars: mostly tiny dim dots, a handful of bright ones.
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const bright = Math.random() > 0.97;
    const r = bright ? Math.random() * 1.6 + 0.8 : Math.random() * 0.9 + 0.2;
    ctx.globalAlpha = bright ? 1 : Math.random() * 0.6 + 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  texture.update(false);
  return texture;
}

/** A handful of shared rocky textures, round-robin'd across meteors (which
 * spawn frequently) instead of painting a fresh one per instance. */
export function createMeteorTexturePool(scene: Scene, count = 5): DynamicTexture[] {
  return Array.from({ length: count }, (_, i) =>
    makeTexture(`spaceship-meteor-${i}`, scene, 256, (ctx, size) => {
      ctx.fillStyle = '#3a332e';
      ctx.fillRect(0, 0, size, size);
      for (let i2 = 0; i2 < 140; i2++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 10 + 2;
        const shade = Math.floor(Math.random() * 40 + 20);
        ctx.fillStyle = `rgba(${shade + 20}, ${shade + 12}, ${shade}, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // A few glowing cracks for a bit of sci-fi flair.
      ctx.strokeStyle = 'rgba(255, 140, 60, 0.5)';
      ctx.lineWidth = 1.5;
      for (let i2 = 0; i2 < 3; i2++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        for (let j = 0; j < 4; j++) ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
    }),
  );
}

export type PlanetRecipe = 'gas-giant' | 'rocky';

export function paintPlanetTexture(scene: Scene, recipe: PlanetRecipe, hue: number): DynamicTexture {
  return makeTexture(`spaceship-planet-${Math.random().toString(36).slice(2)}`, scene, 512, (ctx, size) => {
    if (recipe === 'gas-giant') {
      const bandCount = 10;
      for (let i = 0; i < bandCount; i++) {
        const lightness = 35 + Math.sin(i * 1.7) * 15;
        ctx.fillStyle = `hsl(${hue}, 55%, ${lightness}%)`;
        ctx.fillRect(0, (i / bandCount) * size, size, size / bandCount + 1);
      }
      // Soft turbulence streaks.
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `hsla(${hue}, 60%, 80%, ${Math.random() * 0.15})`;
        ctx.lineWidth = Math.random() * 3 + 1;
        const y = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 30, size * 0.7, y + (Math.random() - 0.5) * 30, size, y);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = `hsl(${hue}, 30%, 28%)`;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 14 + 3;
        ctx.fillStyle = `hsla(${hue + (Math.random() * 20 - 10)}, 30%, ${20 + Math.random() * 25}%, 0.6)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function paintAccretionDiskTexture(scene: Scene, accentA: string, accentB: string): DynamicTexture {
  return makeTexture('spaceship-blackhole-disk', scene, 1024, (ctx, size) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.5);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.15, accentB);
    gradient.addColorStop(0.5, accentA);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Swirl streaks for a bit of motion-suggestion even on a static texture
    // (the mesh itself also spins).
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (0.15 + Math.random() * 0.3), angle, angle + 0.6);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  });
}

export function paintCreatureTexture(scene: Scene, accent: string): DynamicTexture {
  return makeTexture(`spaceship-creature-${Math.random().toString(36).slice(2)}`, scene, 256, (ctx, size) => {
    ctx.fillStyle = 'rgba(4, 6, 16, 1)';
    ctx.fillRect(0, 0, size, size);
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, 'rgba(4,6,16,0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
