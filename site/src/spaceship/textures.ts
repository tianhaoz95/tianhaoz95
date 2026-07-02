import { DynamicTexture, type Scene } from '@babylonjs/core';

/**
 * Procedural texture "recipes" — plain 2D canvas drawing wrapped in a
 * Babylon DynamicTexture, the same technique bgCanvas.ts already uses for
 * the site's particle background. Keeps every visual asset generated in
 * code instead of shipping binary textures/models.
 *
 * Surfaces that need to react to light (hull metal, rocks, rocky planets)
 * come as a diffuse + normal-map pair generated from one shared feature
 * layout, so grooves/craters land in exactly the same place in both maps.
 */

function makeTexture(name: string, scene: Scene, size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): DynamicTexture {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  paint(ctx, size);
  texture.update(false);
  return texture;
}

function offscreen(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas.getContext('2d')!;
}

/**
 * Converts a grayscale height map (painted onto an offscreen canvas) into a
 * tangent-space normal map via central differences. This is what lets flat
 * StandardMaterial boxes/spheres pick up per-pixel surface relief from the
 * scene lights without any extra geometry.
 */
function normalFromHeight(name: string, scene: Scene, heightCtx: CanvasRenderingContext2D, size: number, strength: number): DynamicTexture {
  const src = heightCtx.getImageData(0, 0, size, size).data;
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const out = ctx.createImageData(size, size);
  const heightAt = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * strength;
      const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      out.data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      out.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  texture.update(false);
  return texture;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export interface SurfaceTextures {
  diffuse: DynamicTexture;
  bump: DynamicTexture;
}

/**
 * Spaceship hull metal: panel seams, rivets, brushed streaks and scuffs.
 * `panelScale` < 1 gives smaller, busier panels (used for trim surfaces).
 */
export function createHullSurface(scene: Scene, name: string, baseHex: string, panelScale = 1): SurfaceTextures {
  const size = 512;
  const [br, bg, bb] = hexToRgb(baseHex);

  // Shared feature layout used by both the color and the height pass.
  const xs: number[] = [0];
  for (let x = 0; x < size; ) {
    x += size * (0.14 + Math.random() * 0.2) * panelScale;
    xs.push(Math.min(x, size));
  }
  const ys: number[] = [0];
  for (let y = 0; y < size; ) {
    y += size * (0.16 + Math.random() * 0.22) * panelScale;
    ys.push(Math.min(y, size));
  }
  const cellShade = xs.map(() => ys.map(() => (Math.random() - 0.5) * 14));
  const rivets: Array<[number, number]> = [];
  for (let i = 1; i < xs.length - 1; i++) {
    for (let j = 1; j < ys.length - 1; j++) {
      if (Math.random() > 0.3) rivets.push([xs[i] + 7, ys[j] + 7]);
      if (Math.random() > 0.6) rivets.push([xs[i] - 7, ys[j] - 7]);
    }
  }
  const scratches = Array.from({ length: 12 }, () => {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const a = Math.random() * Math.PI;
    const len = 18 + Math.random() * 70;
    return [sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len] as const;
  });

  const diffuse = makeTexture(`${name}-diffuse`, scene, size, (ctx) => {
    ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
    ctx.fillRect(0, 0, size, size);
    // Per-panel tonal variation so the surface doesn't read as one slab.
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const d = cellShade[i][j];
        ctx.fillStyle = `rgb(${br + d}, ${bg + d}, ${bb + d + 2})`;
        ctx.fillRect(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]);
      }
    }
    // Brushed-metal streaks.
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * size;
      const lighter = Math.random() > 0.5;
      ctx.globalAlpha = Math.random() * 0.04 + 0.01;
      ctx.fillStyle = lighter ? '#aab2cc' : '#000000';
      ctx.fillRect(x, 0, 1, size);
    }
    ctx.globalAlpha = 1;
    // Panel seams.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of xs.slice(1, -1)) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
    }
    for (const y of ys.slice(1, -1)) {
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
    }
    ctx.stroke();
    // Rivets: a lighter dot with a top-left highlight glint.
    for (const [rx, ry] of rivets) {
      ctx.fillStyle = `rgb(${br + 26}, ${bg + 26}, ${bb + 30})`;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220, 228, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, 2, Math.PI * 0.9, Math.PI * 1.6);
      ctx.stroke();
    }
    // Scuffs of exposed lighter metal.
    ctx.strokeStyle = `rgba(${br + 40}, ${bg + 40}, ${bb + 44}, 0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of scratches) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  });

  const heightCtx = offscreen(size);
  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, size, size);
  heightCtx.strokeStyle = '#4a4a4a';
  heightCtx.lineWidth = 3;
  heightCtx.beginPath();
  for (const x of xs.slice(1, -1)) {
    heightCtx.moveTo(x, 0);
    heightCtx.lineTo(x, size);
  }
  for (const y of ys.slice(1, -1)) {
    heightCtx.moveTo(0, y);
    heightCtx.lineTo(size, y);
  }
  heightCtx.stroke();
  for (const [rx, ry] of rivets) {
    const dome = heightCtx.createRadialGradient(rx, ry, 0, rx, ry, 3.2);
    dome.addColorStop(0, '#c8c8c8');
    dome.addColorStop(1, '#808080');
    heightCtx.fillStyle = dome;
    heightCtx.beginPath();
    heightCtx.arc(rx, ry, 3.2, 0, Math.PI * 2);
    heightCtx.fill();
  }
  heightCtx.strokeStyle = '#6a6a6a';
  heightCtx.lineWidth = 1;
  heightCtx.beginPath();
  for (const [x1, y1, x2, y2] of scratches) {
    heightCtx.moveTo(x1, y1);
    heightCtx.lineTo(x2, y2);
  }
  heightCtx.stroke();

  return { diffuse, bump: normalFromHeight(`${name}-bump`, scene, heightCtx, size, 2.2) };
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

  // A faint milky-way band cutting diagonally across the sky.
  const bandAngle = -0.32;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(bandAngle);
  const band = ctx.createLinearGradient(0, -h * 0.24, 0, h * 0.24);
  band.addColorStop(0, 'transparent');
  band.addColorStop(0.5, 'rgba(186, 196, 235, 0.09)');
  band.addColorStop(1, 'transparent');
  ctx.fillStyle = band;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();

  // Stars: mostly tiny dim dots with realistic color-temperature variety,
  // a handful of bright ones, and a dense sprinkle along the band.
  const starColors = ['#ffffff', '#ffffff', '#cfe0ff', '#ffe9c9', '#ffd9d0'];
  function star(x: number, y: number, r: number, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = starColors[Math.floor(Math.random() * starColors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 2200; i++) {
    const bright = Math.random() > 0.97;
    star(
      Math.random() * w,
      Math.random() * h,
      bright ? Math.random() * 1.6 + 0.8 : Math.random() * 0.9 + 0.2,
      bright ? 1 : Math.random() * 0.6 + 0.2,
    );
  }
  const cos = Math.cos(bandAngle);
  const sin = Math.sin(bandAngle);
  for (let i = 0; i < 1600; i++) {
    const along = (Math.random() - 0.5) * w * 1.7;
    // Sum of three uniforms approximates a gaussian falloff off the band.
    const perp = (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.13;
    star(w / 2 + along * cos - perp * sin, h / 2 + along * sin + perp * cos, Math.random() * 0.7 + 0.2, Math.random() * 0.45 + 0.1);
  }
  ctx.globalAlpha = 1;

  texture.update(false);
  return texture;
}

/** A handful of shared rocky diffuse+normal pairs, round-robin'd across
 * meteors (which spawn frequently) instead of painting a fresh one per
 * instance. */
export function createMeteorTexturePool(scene: Scene, count = 5): SurfaceTextures[] {
  return Array.from({ length: count }, (_, i) => {
    const size = 256;
    // Shared feature layout: craters + broad lumps, drawn into both maps.
    const craters = Array.from({ length: 16 }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      r: 6 + Math.random() * 22,
    }));
    const lumps = Array.from({ length: 8 }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      r: 30 + Math.random() * 60,
      up: Math.random() > 0.5,
    }));

    const diffuse = makeTexture(`spaceship-meteor-${i}-diffuse`, scene, size, (ctx) => {
      const warm = Math.random() * 14;
      ctx.fillStyle = `rgb(${58 + warm}, ${52 + warm * 0.7}, ${46 + warm * 0.4})`;
      ctx.fillRect(0, 0, size, size);
      for (const lump of lumps) {
        const g = ctx.createRadialGradient(lump.x, lump.y, 0, lump.x, lump.y, lump.r);
        g.addColorStop(0, lump.up ? 'rgba(112, 102, 92, 0.35)' : 'rgba(20, 18, 16, 0.35)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      for (const c of craters) {
        // Dark floor with a sunlit-looking rim.
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        g.addColorStop(0, 'rgba(14, 12, 11, 0.7)');
        g.addColorStop(0.7, 'rgba(30, 27, 24, 0.4)');
        g.addColorStop(0.85, 'rgba(120, 110, 98, 0.45)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fine regolith speckle.
      for (let s = 0; s < 500; s++) {
        const shade = Math.floor(Math.random() * 60 + 20);
        ctx.fillStyle = `rgba(${shade + 20}, ${shade + 12}, ${shade}, ${Math.random() * 0.4 + 0.1})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
      }
    });

    const heightCtx = offscreen(size);
    heightCtx.fillStyle = '#808080';
    heightCtx.fillRect(0, 0, size, size);
    for (const lump of lumps) {
      const g = heightCtx.createRadialGradient(lump.x, lump.y, 0, lump.x, lump.y, lump.r);
      g.addColorStop(0, lump.up ? 'rgba(200, 200, 200, 0.5)' : 'rgba(60, 60, 60, 0.5)');
      g.addColorStop(1, 'transparent');
      heightCtx.fillStyle = g;
      heightCtx.fillRect(0, 0, size, size);
    }
    for (const c of craters) {
      const g = heightCtx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, 'rgba(30, 30, 30, 0.85)');
      g.addColorStop(0.75, 'rgba(90, 90, 90, 0.5)');
      g.addColorStop(0.88, 'rgba(220, 220, 220, 0.7)');
      g.addColorStop(1, 'transparent');
      heightCtx.fillStyle = g;
      heightCtx.beginPath();
      heightCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      heightCtx.fill();
    }
    for (let s = 0; s < 350; s++) {
      const shade = Math.floor(Math.random() * 90 + 80);
      heightCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.5)`;
      heightCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    return { diffuse, bump: normalFromHeight(`spaceship-meteor-${i}-bump`, scene, heightCtx, size, 3) };
  });
}

export type PlanetRecipe = 'gas-giant' | 'rocky';

export interface PlanetSurface {
  diffuse: DynamicTexture;
  bump: DynamicTexture | null;
}

export function createPlanetSurface(scene: Scene, recipe: PlanetRecipe, hue: number): PlanetSurface {
  const size = 512;
  const id = Math.random().toString(36).slice(2);

  if (recipe === 'gas-giant') {
    const diffuse = makeTexture(`spaceship-planet-${id}`, scene, size, (ctx) => {
      // Smooth latitudinal bands: one vertical gradient with a stop pair
      // per band, so adjacent bands blend into each other like real
      // gas-giant zonal flows instead of hard fillRect stripes.
      const bandCount = 12;
      const gradient = ctx.createLinearGradient(0, 0, 0, size);
      for (let i = 0; i <= bandCount; i++) {
        const lightness = 34 + Math.sin(i * 1.9) * 13 + (Math.random() - 0.5) * 8;
        const sat = 42 + Math.sin(i * 0.8) * 14;
        gradient.addColorStop(Math.min(i / bandCount, 1), `hsl(${hue + (Math.random() - 0.5) * 12}, ${sat}%, ${lightness}%)`);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      // Turbulent streaks smeared along the bands.
      for (let i = 0; i < 60; i++) {
        const y = Math.random() * size;
        ctx.strokeStyle = `hsla(${hue + (Math.random() - 0.5) * 20}, 55%, ${Math.random() > 0.5 ? 72 : 26}%, ${Math.random() * 0.14})`;
        ctx.lineWidth = Math.random() * 4 + 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 24, size * 0.7, y + (Math.random() - 0.5) * 24, size, y + (Math.random() - 0.5) * 10);
        ctx.stroke();
      }
      // One or two great-spot storm ovals.
      const storms = 1 + (Math.random() > 0.6 ? 1 : 0);
      for (let i = 0; i < storms; i++) {
        const sx = Math.random() * size;
        const sy = size * (0.3 + Math.random() * 0.4);
        const rx = 24 + Math.random() * 30;
        const ry = rx * 0.55;
        ctx.save();
        ctx.translate(sx, sy);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, `hsla(${hue + 25}, 65%, 62%, 0.85)`);
        g.addColorStop(0.6, `hsla(${hue + 15}, 55%, 45%, 0.7)`);
        g.addColorStop(1, 'transparent');
        ctx.scale(1, ry / rx);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    return { diffuse, bump: null };
  }

  // Rocky world: shared continents + craters drawn into both maps.
  const continents = Array.from({ length: 10 }, () => ({
    x: Math.random() * size,
    y: Math.random() * size,
    r: 40 + Math.random() * 90,
  }));
  // Dense, mostly-small craters with a few large basins — sparse same-size
  // craters read as decorative bubbles rather than terrain.
  const craters = Array.from({ length: 90 }, () => ({
    x: Math.random() * size,
    y: Math.random() * size,
    r: Math.random() > 0.85 ? 10 + Math.random() * 14 : 2 + Math.random() * 6,
  }));

  const diffuse = makeTexture(`spaceship-planet-${id}`, scene, size, (ctx) => {
    ctx.fillStyle = `hsl(${hue}, 28%, 26%)`;
    ctx.fillRect(0, 0, size, size);
    for (const cont of continents) {
      const g = ctx.createRadialGradient(cont.x, cont.y, 0, cont.x, cont.y, cont.r);
      g.addColorStop(0, `hsla(${hue + 14}, 30%, 38%, 0.55)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    for (const c of craters) {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `hsla(${hue}, 25%, 14%, 0.7)`);
      g.addColorStop(0.8, `hsla(${hue}, 22%, 48%, 0.5)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Icy polar caps, faded toward the equator. On a sphere's UV wrap the
    // texture's top/bottom edges are exactly the poles.
    for (const top of [true, false]) {
      const g = ctx.createLinearGradient(0, top ? 0 : size, 0, top ? size * 0.14 : size * 0.86);
      g.addColorStop(0, 'rgba(225, 235, 245, 0.85)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, top ? 0 : size * 0.86, size, size * 0.14);
    }
  });

  const heightCtx = offscreen(size);
  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, size, size);
  for (const cont of continents) {
    const g = heightCtx.createRadialGradient(cont.x, cont.y, 0, cont.x, cont.y, cont.r);
    g.addColorStop(0, 'rgba(180, 180, 180, 0.45)');
    g.addColorStop(1, 'transparent');
    heightCtx.fillStyle = g;
    heightCtx.fillRect(0, 0, size, size);
  }
  for (const c of craters) {
    const g = heightCtx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, 'rgba(40, 40, 40, 0.8)');
    g.addColorStop(0.8, 'rgba(210, 210, 210, 0.6)');
    g.addColorStop(1, 'transparent');
    heightCtx.fillStyle = g;
    heightCtx.beginPath();
    heightCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    heightCtx.fill();
  }

  return { diffuse, bump: normalFromHeight(`spaceship-planet-${id}-bump`, scene, heightCtx, size, 2.6) };
}

/**
 * A flat annulus of concentric ring bands with an empty (transparent)
 * center — meant for an alpha-blended disc mesh lying in the planet's
 * equatorial plane, the way actual planetary rings are shaped. Band
 * brightness follows a smoothed random walk with a Cassini-style gap.
 */
export function paintPlanetRingTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const texture = new DynamicTexture(`spaceship-ring-${Math.random().toString(36).slice(2)}`, { width: size, height: size }, scene, false);
  texture.hasAlpha = true;
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const half = size / 2;
  const innerFrac = 0.55;
  const outerFrac = 0.98;

  let level = 0.5;
  for (let r = half * innerFrac; r <= half * outerFrac; r += 1) {
    level = Math.min(0.9, Math.max(0.06, level + (Math.random() - 0.5) * 0.16));
    const frac = (r / half - innerFrac) / (outerFrac - innerFrac);
    // Fade the annulus in/out at its edges, and carve a gap ~3/4 out.
    const edgeFade = Math.min(1, frac * 8, (1 - frac) * 8);
    const gap = 1 - 0.85 * Math.exp(-(((frac - 0.72) / 0.05) ** 2));
    const alpha = level * edgeFade * gap * 0.8;
    if (alpha < 0.01) continue;
    const tone = 150 + level * 90;
    ctx.strokeStyle = `rgba(${tone}, ${tone * 0.94}, ${tone * 0.82}, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  texture.update(false);
  return texture;
}

/**
 * Accretion disk for a flat disc mesh (not a torus): transparent center
 * hole, white-hot inner edge cooling outward through the accent colors,
 * plus a Doppler-beaming brightness asymmetry — the side of the disk
 * spinning toward the viewer is visibly brighter, the single most
 * recognizable feature of real black-hole imagery.
 */
export function paintAccretionDiskTexture(scene: Scene, accentA: string, accentB: string): DynamicTexture {
  const size = 512;
  const texture = new DynamicTexture('spaceship-blackhole-disk', { width: size, height: size }, scene, false);
  texture.hasAlpha = true;
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;

  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, size / 2);
  gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.34, '#fff7ea');
  gradient.addColorStop(0.42, accentB);
  gradient.addColorStop(0.62, accentA);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cx, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Orbiting-matter streaks, brighter toward the inner edge.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const rFrac = 0.32 + Math.random() * 0.16;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(255, 244, 228, ${(0.55 - rFrac) * 0.8})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(cx, cx, size * rFrac, angle, angle + 0.5 + Math.random() * 0.8);
    ctx.stroke();
  }
  // Doppler beaming: one half of the disk glows hotter.
  const doppler = ctx.createLinearGradient(0, 0, size, 0);
  doppler.addColorStop(0, 'rgba(255, 250, 240, 0.5)');
  doppler.addColorStop(0.5, 'rgba(0,0,0,0)');
  doppler.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = doppler;
  ctx.beginPath();
  ctx.arc(cx, cx, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  texture.update(false);
  return texture;
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
