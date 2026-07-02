import {
  Color3,
  Mesh,
  MeshBuilder,
  PointLight,
  StandardMaterial,
  TransformNode,
  UniversalCamera,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import { themeColor3 } from './themeColors';
import type { CockpitButtonId, CockpitHandles } from './types';

// Bright enough to read as distinct shaded surfaces against the near-black
// space backdrop — the first pass here was dark enough to be visually
// indistinguishable from the void, leaving buttons looking like they were
// floating disconnected from any surface.
const HULL_COLOR = new Color3(0.16, 0.18, 0.24);
const TRIM_COLOR = new Color3(0.26, 0.28, 0.36);

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

export function buildCockpit(scene: Scene): CockpitHandles {
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
  dashLight.intensity = 0.7;
  dashLight.diffuse = new Color3(0.75, 0.8, 1);

  const hullMat = unlitMaterial(scene, 'spaceship-hull-mat', HULL_COLOR);
  const trimMat = unlitMaterial(scene, 'spaceship-trim-mat', TRIM_COLOR, new Color3(0.02, 0.03, 0.05));

  // Dashboard: angled console surface below/ahead of the camera.
  const dashboard = MeshBuilder.CreateBox('spaceship-dashboard', { width: 2.8, height: 0.5, depth: 1.1 }, scene);
  dashboard.parent = cockpitRig;
  dashboard.position.set(0, 0.7, 1.0);
  dashboard.rotation.x = -0.32;
  dashboard.material = hullMat;

  // Header + side pillars frame the window into a cockpit-shaped opening
  // without needing an actual transparent windshield mesh.
  const header = MeshBuilder.CreateBox('spaceship-header', { width: 3.6, height: 0.35, depth: 1.6 }, scene);
  header.parent = cockpitRig;
  header.position.set(0, 2.35, 0.9);
  header.material = trimMat;

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
  }

  // Steering stick: a pivot at the base, visible shaft+ball as a child so
  // rotating the pivot tilts the whole stick like a real yoke.
  const stickPivot = new TransformNode('spaceship-stick-pivot', scene);
  stickPivot.parent = cockpitRig;
  stickPivot.position.set(0.55, 0.98, 0.62);

  const stickShaft = MeshBuilder.CreateCylinder('spaceship-stick-shaft', { diameterTop: 0.025, diameterBottom: 0.04, height: 0.26 }, scene);
  stickShaft.parent = stickPivot;
  stickShaft.position.y = 0.13;
  stickShaft.material = trimMat;

  const stickBall = MeshBuilder.CreateSphere('spaceship-stick-ball', { diameter: 0.09 }, scene);
  stickBall.parent = stickPivot;
  stickBall.position.y = 0.28;
  const accent = themeColor3('--accent', '#4f46e5');
  stickBall.material = unlitMaterial(scene, 'spaceship-stick-ball-mat', accent, accent.scale(0.6));
  // Picking targets the ball directly (the biggest, easiest-to-grab part).
  const stickMesh = stickBall;

  // Thruster: a static track + a draggable handle riding along it.
  const thrusterTrack = MeshBuilder.CreateBox('spaceship-thruster-track', { width: 0.06, height: 0.4, depth: 0.06 }, scene);
  thrusterTrack.parent = cockpitRig;
  thrusterTrack.position.set(-0.7, THRUSTER_BASE_Y, 0.62);
  thrusterTrack.material = trimMat;

  // Pulled slightly in front of the track (z 0.56 vs the track's 0.62) so
  // it doesn't sit flush/coplanar with it — at idle, a same-plane handle
  // was nearly indistinguishable from the track itself.
  const accent2 = themeColor3('--accent-2', '#06b6d4');
  const thrusterHandle = MeshBuilder.CreateBox('spaceship-thruster-handle', { width: 0.16, height: 0.06, depth: 0.13 }, scene);
  thrusterHandle.parent = cockpitRig;
  thrusterHandle.position.set(-0.7, THRUSTER_MIN_Y, 0.56); // idle/off position
  thrusterHandle.material = unlitMaterial(scene, 'spaceship-thruster-handle-mat', accent2, accent2.scale(0.8));

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
    buttons[spec.id] = button;
  }

  const exitButton = MeshBuilder.CreateBox('spaceship-exit-button', { width: 0.16, height: 0.04, depth: 0.11 }, scene);
  exitButton.parent = dashboard;
  exitButton.position.set(1.3, 0.28, -0.15);
  const exitColor = Color3.FromHexString('#ef4444');
  exitButton.material = unlitMaterial(scene, 'spaceship-exit-button-mat', exitColor, exitColor.scale(0.5));

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
