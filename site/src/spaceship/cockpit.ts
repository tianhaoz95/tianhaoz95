import {
  Color3,
  GlowLayer,
  Mesh,
  MeshBuilder,
  PointLight,
  StandardMaterial,
  TransformNode,
  UniversalCamera,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import { paintHudScreen, type HudScreenVariant } from './textures';
import { themeColor3, themeColorHex } from './themeColors';
import type { CockpitButtonId, CockpitHandles } from './types';

// Cyberpunk-dark rather than mid-grey: real contrast comes from the neon
// trim/screens below, not from the base surfaces being bright. (An earlier,
// much darker pass was indistinguishable from the black void outside —
// this is deliberately a middle ground informed by that.)
const HULL_COLOR = new Color3(0.07, 0.08, 0.11);
const TRIM_COLOR = new Color3(0.12, 0.13, 0.18);
const MAGENTA = '#e026c9';

// Single source of truth for the thruster's travel range, in cockpitRig-
// local space — controls.ts imports these rather than duplicating the
// numbers, so the clamp range can never drift out of sync with where the
// track mesh actually is.
const THRUSTER_BASE_Y = 1.14;
const THRUSTER_TRAVEL = 0.18;
export const THRUSTER_MIN_Y = THRUSTER_BASE_Y - THRUSTER_TRAVEL;
export const THRUSTER_MAX_Y = THRUSTER_BASE_Y + THRUSTER_TRAVEL;

interface ButtonSpec {
  id: CockpitButtonId;
  label: string;
  x: number;
  color: Color3;
}

function unlitMaterial(scene: Scene, name: string, color: Color3, emissive?: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.05, 0.05, 0.06);
  if (emissive) mat.emissiveColor = emissive;
  return mat;
}

export function buildCockpit(scene: Scene, glow: GlowLayer): CockpitHandles {
  const shipNode = new TransformNode('spaceship-ship', scene);
  const cockpitRig = new TransformNode('spaceship-rig', scene);
  cockpitRig.parent = shipNode;

  const camera = new UniversalCamera('spaceship-camera', new Vector3(0, 1.4, -0.6), scene);
  camera.parent = cockpitRig;
  camera.setTarget(new Vector3(0, 1.4, 10));
  camera.fov = 1.05;
  scene.activeCamera = camera;
  // Deliberately never call camera.attachControl() — Babylon's own
  // mouse-look/WASD would fight the custom flight scheme in controls.ts.

  // Parented to the rig (unlike scene.ts's ambient light) so it actually
  // travels with the ship instead of being left behind in world space the
  // moment the ship moves.
  const dashLight = new PointLight('spaceship-dash-light', new Vector3(0, 1.6, 0.4), scene);
  dashLight.parent = cockpitRig;
  dashLight.intensity = 0.75;
  dashLight.diffuse = new Color3(0.75, 0.8, 1);

  const hullMat = unlitMaterial(scene, 'spaceship-hull-mat', HULL_COLOR);
  const trimMat = unlitMaterial(scene, 'spaceship-trim-mat', TRIM_COLOR, new Color3(0.015, 0.02, 0.035));

  const accentHex = themeColorHex('--accent', '#4f46e5');
  const accent2Hex = themeColorHex('--accent-2', '#06b6d4');
  const accent = Color3.FromHexString(accentHex);
  const accent2 = Color3.FromHexString(accent2Hex);

  // --- Neon trim: thin glowing seams along panel edges, the single
  // biggest "cyberpunk" signature of the reference image. ---
  function neonStrip(name: string, parent: TransformNode, w: number, h: number, d: number, pos: Vector3, colorHex: string) {
    const strip = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    strip.parent = parent;
    strip.position.copyFrom(pos);
    const color = Color3.FromHexString(colorHex);
    strip.material = unlitMaterial(scene, `${name}-mat`, color, color);
    glow.addIncludedOnlyMesh(strip);
    return strip;
  }

  // --- Embedded HUD screens: small procedurally-textured readouts
  // scattered across the console, mirroring the reference's busy bank of
  // radar/bar/wave displays. Decorative only — not pickable. ---
  function hudScreen(
    name: string,
    parent: TransformNode,
    pos: Vector3,
    rot: Vector3,
    width: number,
    height: number,
    variant: HudScreenVariant,
    colorHex: string,
  ) {
    const bezel = MeshBuilder.CreateBox(`${name}-bezel`, { width: width * 1.16, height: height * 1.16, depth: 0.02 }, scene);
    bezel.parent = parent;
    bezel.position.copyFrom(pos);
    bezel.rotation.copyFrom(rot);
    bezel.material = trimMat;
    bezel.isPickable = false;

    const screen = MeshBuilder.CreatePlane(name, { width, height, sideOrientation: Mesh.DOUBLESIDE }, scene);
    screen.parent = bezel;
    screen.position.z = -0.012;
    screen.isPickable = false;
    const mat = new StandardMaterial(`${name}-mat`, scene);
    mat.disableLighting = true;
    // emissiveColor left at its default (black) deliberately — the same
    // pattern the starfield/planet/meteor materials use. Setting it to
    // white here ADDS flat white on top of the texture rather than letting
    // the texture alone show through, which is what actually produced
    // blank white screens on the first pass of this.
    mat.emissiveTexture = paintHudScreen(scene, variant, colorHex);
    screen.material = mat;
    glow.addIncludedOnlyMesh(screen);
    return bezel;
  }

  function greebleLight(name: string, parent: TransformNode, pos: Vector3, colorHex: string) {
    const light = MeshBuilder.CreateSphere(name, { diameter: 0.035 }, scene);
    light.parent = parent;
    light.position.copyFrom(pos);
    light.isPickable = false;
    const color = Color3.FromHexString(colorHex);
    light.material = unlitMaterial(scene, `${name}-mat`, color, color);
    glow.addIncludedOnlyMesh(light);
    return light;
  }

  function knob(name: string, parent: TransformNode, pos: Vector3) {
    const k = MeshBuilder.CreateCylinder(name, { diameter: 0.05, height: 0.03 }, scene);
    k.parent = parent;
    k.position.copyFrom(pos);
    k.isPickable = false;
    k.material = trimMat;
    return k;
  }

  // Dashboard: angled console surface below/ahead of the camera.
  const dashboard = MeshBuilder.CreateBox('spaceship-dashboard', { width: 2.8, height: 0.5, depth: 1.1 }, scene);
  dashboard.parent = cockpitRig;
  dashboard.position.set(0, 0.7, 1.0);
  dashboard.rotation.x = -0.32;
  dashboard.material = hullMat;

  // Glowing seam along the dashboard's front-top edge, and a second row of
  // small data screens set slightly further back than the physical
  // buttons — a "buttons in front, readouts behind" layered console.
  neonStrip('spaceship-dash-trim', dashboard, 2.7, 0.015, 0.02, new Vector3(0, 0.255, -0.5), accent2Hex);
  const dashScreens: Array<[number, HudScreenVariant, string]> = [
    [-1.25, 'wave', accent2Hex],
    [-0.63, 'grid', accentHex],
    [0, 'gauge', MAGENTA],
    [0.63, 'bars', accent2Hex],
    [1.25, 'radar', accentHex],
  ];
  for (const [x, variant, colorHex] of dashScreens) {
    hudScreen(`spaceship-dash-screen-${x}`, dashboard, new Vector3(x, 0.27, 0.18), new Vector3(Math.PI / 2, 0, 0), 0.34, 0.24, variant, colorHex);
  }

  // Header + side pillars frame the window into a cockpit-shaped opening
  // without needing an actual transparent windshield mesh.
  const header = MeshBuilder.CreateBox('spaceship-header', { width: 3.6, height: 0.35, depth: 1.6 }, scene);
  header.parent = cockpitRig;
  header.position.set(0, 2.35, 0.9);
  header.material = trimMat;
  neonStrip('spaceship-header-trim', header, 3.5, 0.02, 0.02, new Vector3(0, -0.17, -0.75), MAGENTA);
  // Two monitors hanging from the header, angled down toward the pilot —
  // the reference's ceiling-mounted screens.
  hudScreen('spaceship-header-screen-l', header, new Vector3(-0.9, -0.17, -0.55), new Vector3(-Math.PI / 2 + 0.4, 0, 0), 0.4, 0.28, 'gauge', accentHex);
  hudScreen('spaceship-header-screen-r', header, new Vector3(0.9, -0.17, -0.55), new Vector3(-Math.PI / 2 + 0.4, 0, 0), 0.4, 0.28, 'bars', accent2Hex);
  for (let i = 0; i < 5; i++) {
    greebleLight(`spaceship-header-light-${i}`, header, new Vector3(-1.5 + i * 0.75, -0.17, -0.2), i % 2 === 0 ? accent2Hex : MAGENTA);
  }

  for (const side of [-1, 1]) {
    // Depth/rotation kept modest deliberately: an earlier version (depth
    // 1.8, rotation 0.18) swept far enough inward at its near-camera end to
    // visually occlude the thruster sitting at x=-0.7 — confirmed via a
    // cropped screenshot showing the pillar drawn right over it.
    const pillar = MeshBuilder.CreateBox(`spaceship-pillar-${side}`, { width: 0.3, height: 1.7, depth: 1.1 }, scene);
    pillar.parent = cockpitRig;
    pillar.position.set(side * 1.9, 1.55, 0.75);
    pillar.rotation.y = side * 0.1;
    pillar.material = trimMat;

    neonStrip(`spaceship-pillar-trim-${side}`, pillar, 0.02, 1.55, 0.02, new Vector3(-side * 0.16, 0, -0.4), side > 0 ? accentHex : accent2Hex);
    hudScreen(
      `spaceship-pillar-screen-${side}`,
      pillar,
      new Vector3(-side * 0.16, 0.35, 0.1),
      new Vector3(0, side * Math.PI * 0.5, 0),
      0.24,
      0.32,
      side > 0 ? 'grid' : 'wave',
      side > 0 ? MAGENTA : accentHex,
    );
    for (let i = 0; i < 3; i++) {
      knob(`spaceship-pillar-knob-${side}-${i}`, pillar, new Vector3(-side * 0.16, -0.3 + i * 0.22, 0.35));
    }
  }

  // Steering stick: a pivot at the base, visible shaft+ball as a child so
  // rotating the pivot tilts the whole stick like a real yoke.
  const stickPivot = new TransformNode('spaceship-stick-pivot', scene);
  stickPivot.parent = cockpitRig;
  stickPivot.position.set(0.55, 0.98, 0.62);

  const stickBase = MeshBuilder.CreateCylinder('spaceship-stick-base', { diameter: 0.16, height: 0.03 }, scene);
  stickBase.parent = cockpitRig;
  stickBase.position.set(0.55, 0.955, 0.62);
  stickBase.material = trimMat;

  const stickBaseRing = MeshBuilder.CreateTorus('spaceship-stick-base-ring', { diameter: 0.17, thickness: 0.008, tessellation: 24 }, scene);
  stickBaseRing.parent = stickBase;
  stickBaseRing.position.y = 0.02;
  const stickRingColor = Color3.FromHexString(accent2Hex);
  stickBaseRing.material = unlitMaterial(scene, 'spaceship-stick-base-ring-mat', stickRingColor, stickRingColor);
  glow.addIncludedOnlyMesh(stickBaseRing);

  const stickShaft = MeshBuilder.CreateCylinder('spaceship-stick-shaft', { diameterTop: 0.025, diameterBottom: 0.04, height: 0.26 }, scene);
  stickShaft.parent = stickPivot;
  stickShaft.position.y = 0.13;
  stickShaft.material = trimMat;

  const stickBall = MeshBuilder.CreateSphere('spaceship-stick-ball', { diameter: 0.09 }, scene);
  stickBall.parent = stickPivot;
  stickBall.position.y = 0.28;
  stickBall.material = unlitMaterial(scene, 'spaceship-stick-ball-mat', accent, accent.scale(0.6));
  glow.addIncludedOnlyMesh(stickBall);
  // Picking targets the ball directly (the biggest, easiest-to-grab part).
  const stickMesh = stickBall;

  // Thruster: a static track + a draggable handle riding along it.
  const thrusterTrack = MeshBuilder.CreateBox('spaceship-thruster-track', { width: 0.06, height: 0.4, depth: 0.06 }, scene);
  thrusterTrack.parent = cockpitRig;
  thrusterTrack.position.set(-0.7, THRUSTER_BASE_Y, 0.62);
  thrusterTrack.material = trimMat;
  neonStrip('spaceship-thruster-rail', cockpitRig, 0.012, 0.4, 0.012, new Vector3(-0.7, THRUSTER_BASE_Y, 0.66), accent2Hex);

  // Pulled slightly in front of the track (z 0.56 vs the track's 0.62) so
  // it doesn't sit flush/coplanar with it — at idle, a same-plane handle
  // was nearly indistinguishable from the track itself.
  const thrusterHandle = MeshBuilder.CreateBox('spaceship-thruster-handle', { width: 0.16, height: 0.06, depth: 0.13 }, scene);
  thrusterHandle.parent = cockpitRig;
  thrusterHandle.position.set(-0.7, THRUSTER_MIN_Y, 0.56); // idle/off position
  thrusterHandle.material = unlitMaterial(scene, 'spaceship-thruster-handle-mat', accent2, accent2.scale(0.8));
  glow.addIncludedOnlyMesh(thrusterHandle);

  // Console buttons: one per profile section, color-matched to the HUD
  // legend strip (see hud.ts) so the mapping is learnable without needing
  // in-3D text labels.
  const buttonSpecs: ButtonSpec[] = [
    { id: 'about', label: 'ABOUT', x: -0.95, color: themeColor3('--accent', '#4f46e5') },
    { id: 'skills', label: 'SKILLS', x: -0.32, color: themeColor3('--accent-2', '#06b6d4') },
    { id: 'projects', label: 'PROJECTS', x: 0.32, color: Color3.FromHexString('#a855f7') },
    { id: 'contact', label: 'CONTACT', x: 0.95, color: Color3.FromHexString('#f59e0b') },
  ];

  const buttons = {} as Record<CockpitButtonId, Mesh>;
  for (const spec of buttonSpecs) {
    const button = MeshBuilder.CreateCylinder(`spaceship-button-${spec.id}`, { diameter: 0.1, height: 0.035 }, scene);
    button.parent = dashboard;
    // Local to the (rotated) dashboard box, sitting just above its top face.
    button.position.set(spec.x, 0.28, -0.15);
    button.material = unlitMaterial(scene, `spaceship-button-${spec.id}-mat`, spec.color, spec.color.scale(0.55));
    glow.addIncludedOnlyMesh(button);
    buttons[spec.id] = button;

    const ring = MeshBuilder.CreateTorus(`spaceship-button-${spec.id}-ring`, { diameter: 0.13, thickness: 0.006, tessellation: 24 }, scene);
    ring.parent = dashboard;
    ring.position.set(spec.x, 0.265, -0.15);
    ring.material = unlitMaterial(scene, `spaceship-button-${spec.id}-ring-mat`, spec.color, spec.color);
    glow.addIncludedOnlyMesh(ring);
  }

  const exitButton = MeshBuilder.CreateBox('spaceship-exit-button', { width: 0.16, height: 0.04, depth: 0.11 }, scene);
  exitButton.parent = dashboard;
  exitButton.position.set(1.3, 0.28, -0.15);
  const exitColor = Color3.FromHexString('#ef4444');
  exitButton.material = unlitMaterial(scene, 'spaceship-exit-button-mat', exitColor, exitColor.scale(0.5));
  glow.addIncludedOnlyMesh(exitButton);

  return {
    shipNode,
    cockpitRig,
    stickPivot,
    stickMesh,
    thrusterHandle,
    buttons,
    exitButton,
  };
}
