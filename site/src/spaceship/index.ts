import {
  ActionManager,
  Color4,
  DefaultRenderingPipeline,
  ExecuteCodeAction,
  type Mesh,
  type StandardMaterial,
} from '@babylonjs/core';
import './spaceship.css';
import { buildCockpit } from './cockpit';
import { createControls } from './controls';
import { enterCopilotMode, exitCopilotMode } from './copilot';
import { createFlightState, stepFlight } from './flight';
import { createHud } from './hud';
import { createSceneRig } from './scene';
import { createSpaceObjects } from './spaceObjects';
import type { CockpitButtonId, SpaceshipController, StartSpaceshipModeOptions } from './types';

/**
 * Composition root: wires scene/cockpit/controls/space-objects/HUD/co-pilot
 * together and owns the single `dispose()` that tears every piece of it
 * back down. This is the only export — everything else in this directory
 * is an implementation detail reached through here.
 */
export function startSpaceshipMode(opts: StartSpaceshipModeOptions): SpaceshipController {
  const host = document.body;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sceneRig = createSceneRig(host);
  const cockpit = buildCockpit(sceneRig.scene, sceneRig.glow);

  // Built here rather than in scene.ts because it needs a camera, and the
  // camera doesn't exist until buildCockpit() runs — the pipeline itself is
  // still a scene-wide cinematic finish, not cockpit geometry.
  const pipeline = new DefaultRenderingPipeline('spaceship-pipeline', true, sceneRig.scene, [sceneRig.scene.activeCamera!]);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.7;
  pipeline.bloomWeight = 0.22;
  pipeline.imageProcessing.vignetteEnabled = true;
  pipeline.imageProcessing.vignetteWeight = 2.2;
  pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1);
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = 6;

  const controlsRig = createControls(sceneRig.scene, cockpit);
  const spaceObjectsRig = createSpaceObjects(sceneRig.scene, cockpit.shipNode, sceneRig.glow);
  const flightState = createFlightState();
  const hud = createHud(host, opts.profile, () => opts.onExit());

  const flightObserver = sceneRig.scene.onBeforeRenderObservable.add(() => {
    const dt = sceneRig.scene.getEngine().getDeltaTime() / 1000;
    stepFlight(cockpit.shipNode, cockpit.cockpitRig, controlsRig.input, flightState, dt, prefersReducedMotion);
    hud.setSpeed(flightState.speed);
  });

  function wireButton(mesh: Mesh, onPick: () => void, hoverGlow: boolean) {
    mesh.actionManager = new ActionManager(sceneRig.scene);
    mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, onPick));
    if (hoverGlow) {
      const material = mesh.material as StandardMaterial;
      const baseEmissive = material.emissiveColor.clone();
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          material.emissiveColor = baseEmissive.scale(1.8);
        }),
      );
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          material.emissiveColor = baseEmissive;
        }),
      );
    }
  }

  for (const [id, mesh] of Object.entries(cockpit.buttons) as [CockpitButtonId, Mesh][]) {
    wireButton(mesh, () => hud.showPanel(id), true);
  }
  wireButton(cockpit.exitButton, () => opts.onExit(), true);

  enterCopilotMode(opts.chatUi);

  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      sceneRig.scene.onBeforeRenderObservable.remove(flightObserver);
      controlsRig.dispose();
      spaceObjectsRig.dispose();
      hud.dispose();
      pipeline.dispose();
      sceneRig.dispose();
      exitCopilotMode(opts.chatUi);
    },
  };
}
