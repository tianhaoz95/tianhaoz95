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

export type HudScreenVariant = 'radar' | 'bars' | 'wave' | 'grid' | 'gauge';

/**
 * Small embedded "console screen" readouts — the cyberpunk reference this
 * pass is styled after is full of these (radar sweeps, equalizer bars,
 * data grids) scattered across the dashboard/header/pillars. Content is
 * decorative noise, not real telemetry — the point is visual density, in
 * the same "generate it, don't ship an asset" spirit as every other
 * texture in this file.
 */
export function paintHudScreen(scene: Scene, variant: HudScreenVariant, accentHex: string): DynamicTexture {
  return makeTexture(`spaceship-hud-${variant}-${Math.random().toString(36).slice(2)}`, scene, 256, (ctx, size) => {
    ctx.fillStyle = '#050914';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = accentHex;
    ctx.fillStyle = accentHex;
    ctx.lineWidth = 2;

    if (variant === 'radar') {
      const cx = size / 2;
      const cy = size / 2;
      ctx.globalAlpha = 0.45;
      for (let r = size * 0.12; r < size * 0.46; r += size * 0.11) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.06);
      ctx.lineTo(cx, size * 0.94);
      ctx.moveTo(size * 0.06, cy);
      ctx.lineTo(size * 0.94, cy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const sweep = Math.random() * Math.PI * 2;
      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.46);
      sweepGradient.addColorStop(0, accentHex);
      sweepGradient.addColorStop(1, 'transparent');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, size * 0.46, -0.35, 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * size * 0.38 + size * 0.05;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (variant === 'bars') {
      const bars = 9;
      const gap = size * 0.03;
      const bw = (size * 0.86) / bars - gap;
      for (let i = 0; i < bars; i++) {
        const h = Math.random() * size * 0.6 + size * 0.12;
        const x = size * 0.07 + i * (bw + gap);
        ctx.globalAlpha = 0.55 + Math.random() * 0.4;
        ctx.fillRect(x, size * 0.9 - h, bw, h);
      }
      ctx.globalAlpha = 1;
    } else if (variant === 'wave') {
      const phase = Math.random() * Math.PI * 2;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const y = size / 2 + Math.sin(x * 0.045 + phase) * size * 0.16 + Math.sin(x * 0.11 + phase) * size * 0.05;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      for (let gx = size * 0.1; gx < size; gx += size / 7) {
        ctx.beginPath();
        ctx.moveTo(gx, size * 0.1);
        ctx.lineTo(gx, size * 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (variant === 'grid') {
      const cols = 6;
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.4) {
            ctx.globalAlpha = Math.random() * 0.55 + 0.2;
            ctx.fillRect(
              size * 0.08 + c * ((size * 0.84) / cols),
              size * 0.08 + r * ((size * 0.84) / rows),
              ((size * 0.84) / cols) * 0.75,
              ((size * 0.84) / rows) * 0.75,
            );
          }
        }
      }
      ctx.globalAlpha = 1;
    } else if (variant === 'gauge') {
      const cx = size / 2;
      const cy = size * 0.62;
      const radius = size * 0.36;
      ctx.lineWidth = size * 0.055;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const pct = 0.25 + Math.random() * 0.65;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, Math.PI + Math.PI * pct);
      ctx.stroke();
    }

    // A frame border and CRT-style scanlines tie every variant together.
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentHex;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < size; y += 4) ctx.fillRect(0, y, size, 1);
    ctx.globalAlpha = 1;
  });
}

/** A soft glowing disc for a distant "sun"/nebula-core light source seen
 * through the window — mirrors the reference image's bright pink glow at
 * the center of the view. Left fully transparent outside the gradient
 * (no opaque background fill) so it composites as a glow, not a card. */
export function paintFlareTexture(scene: Scene, coreHex: string, glowHex: string): DynamicTexture {
  const texture = new DynamicTexture('spaceship-flare', { width: 512, height: 512 }, scene, false);
  texture.hasAlpha = true;
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const size = 512;
  const cx = size / 2;
  const cy = size / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.12, coreHex);
  gradient.addColorStop(0.4, glowHex);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.update(false);
  return texture;
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
