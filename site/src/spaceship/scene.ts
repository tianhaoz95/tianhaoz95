import {
  Color3,
  Color4,
  Constants,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { paintFlareTexture, paintStarfield } from './textures';
import { themeColorHex } from './themeColors';

export interface SceneRig {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
  glow: GlowLayer;
  dispose: () => void;
}

/**
 * Engine/scene/canvas bootstrap, plus the ambient stuff every other module
 * leans on (starfield skybox, lights, bloom/glow, resize handling, render
 * loop). Cockpit geometry and space objects are built by other modules
 * against the returned `scene`.
 */
export function createSceneRig(host: HTMLElement): SceneRig {
  const canvas = document.createElement('canvas');
  canvas.className = 'spaceship-canvas';
  host.appendChild(canvas);

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);

  // Deep-space ambient fill so cockpit geometry reads as shaped surfaces
  // rather than disappearing into the black void — deliberately not
  // parented to the ship: real ambient "sky" light wouldn't rotate with
  // every maneuver. The dashboard's own point light lives in cockpit.ts,
  // parented to the rig so it actually travels with the ship.
  const ambient = new HemisphericLight('spaceship-ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.55;
  ambient.groundColor = new Color3(0.1, 0.1, 0.14);

  // A small blurKernelSize matters here: the default (32px) blooms small
  // cockpit details (buttons, stick, thruster — a few tens of pixels on
  // screen) into shapeless glowing blobs that swallow their own geometry.
  // 12px keeps the glow a tight rim around each mesh instead.
  const glow = new GlowLayer('spaceship-glow', scene, { blurKernelSize: 12 });
  glow.intensity = 0.55;

  // Starfield: one large inverted sphere with a procedurally-painted
  // emissive texture. `infiniteDistance` recenters it on the camera every
  // frame automatically, so it never needs manual per-frame repositioning
  // and there's no parallax mismatch as the ship moves.
  const skybox = MeshBuilder.CreateSphere('spaceship-skybox', { diameter: 4000, sideOrientation: Mesh.BACKSIDE }, scene);
  skybox.infiniteDistance = true;
  skybox.isPickable = false;
  const skyMat = new StandardMaterial('spaceship-sky-mat', scene);
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyMat.emissiveTexture = paintStarfield(scene);
  skybox.material = skyMat;

  // A distant glowing nebula core, the reference image's centerpiece — a
  // camera-facing billboard, additively blended so it reads as pure glow
  // rather than a flat sprite, anchored to a fixed *world* direction via
  // infiniteDistance (same trick as the skybox) so it never gets closer as
  // the ship flies toward it, but does drift across the window as the ship
  // turns — like a real distant light source would.
  const flare = MeshBuilder.CreatePlane('spaceship-flare', { size: 160 }, scene);
  flare.position.set(120, 40, 820);
  flare.billboardMode = Mesh.BILLBOARDMODE_ALL;
  flare.infiniteDistance = true;
  flare.isPickable = false;
  const flareMat = new StandardMaterial('spaceship-flare-mat', scene);
  flareMat.disableLighting = true;
  flareMat.backFaceCulling = false;
  flareMat.alphaMode = Constants.ALPHA_ADD;
  const flareTexture = paintFlareTexture(scene, themeColorHex('--accent-2', '#06b6d4'), '#d946ef');
  flareMat.emissiveTexture = flareTexture;
  flareMat.opacityTexture = flareTexture;
  flare.material = flareMat;
  glow.addIncludedOnlyMesh(flare);

  function resize() {
    engine.resize();
  }
  window.addEventListener('resize', resize);

  engine.runRenderLoop(() => {
    scene.render();
  });

  return {
    engine,
    scene,
    canvas,
    glow,
    dispose() {
      window.removeEventListener('resize', resize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}
