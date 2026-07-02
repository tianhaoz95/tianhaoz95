import { PointerDragBehavior, PointerEventTypes, Scalar, Vector3, type Scene } from '@babylonjs/core';
import { THRUSTER_MAX_Y, THRUSTER_MIN_Y } from './cockpit';
import type { CockpitHandles, FlightInput } from './types';

const STICK_MAX_TILT = 0.5; // radians
const STICK_DRAG_RANGE_PX = 160;
const STICK_SPRING_SPEED = 6;

export interface ControlsRig {
  input: FlightInput;
  dispose: () => void;
}

/**
 * Merges three input sources into one FlightInput snapshot that flight.ts
 * reads each frame: WASD keys, the draggable steering stick (custom pointer
 * handling — needs a cone-clamped pivot rotation, not planar translation,
 * so PointerDragBehavior doesn't fit it), and the thruster lever
 * (PointerDragBehavior constrained to one axis, which fits it well).
 */
export function createControls(scene: Scene, cockpit: CockpitHandles): ControlsRig {
  const input: FlightInput = {
    yawKeys: 0,
    baseThrottle: 0,
    boost: 0,
    brake: 0,
    stickYaw: 0,
    stickPitch: 0,
  };

  const keys = new Set<string>();
  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.key.toLowerCase());
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key.toLowerCase());
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  let stickDragging = false;
  let stickStartX = 0;
  let stickStartY = 0;
  const pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
    const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      if (pickedMesh === cockpit.stickMesh) {
        stickDragging = true;
        stickStartX = scene.pointerX;
        stickStartY = scene.pointerY;
      }
    } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE && stickDragging) {
      input.stickYaw = Scalar.Clamp((scene.pointerX - stickStartX) / STICK_DRAG_RANGE_PX, -1, 1);
      input.stickPitch = Scalar.Clamp(-(scene.pointerY - stickStartY) / STICK_DRAG_RANGE_PX, -1, 1);
    } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
      stickDragging = false;
    }
  });

  // Thruster: real lever behavior — stays where you leave it, no spring-back.
  const thrusterDrag = new PointerDragBehavior({ dragAxis: new Vector3(0, 1, 0) });
  thrusterDrag.useObjectOrientationForDragging = false;
  thrusterDrag.moveAttached = false; // we own the position write, so the hard clamp always holds
  cockpit.thrusterHandle.addBehavior(thrusterDrag);
  let thrusterY = cockpit.thrusterHandle.position.y;
  thrusterDrag.onDragObservable.add((event) => {
    thrusterY = Scalar.Clamp(thrusterY + event.dragDistance, THRUSTER_MIN_Y, THRUSTER_MAX_Y);
    cockpit.thrusterHandle.position.y = thrusterY;
    input.baseThrottle = (thrusterY - THRUSTER_MIN_Y) / (THRUSTER_MAX_Y - THRUSTER_MIN_Y);
  });

  const renderObserver = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;

    input.yawKeys = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    input.boost = keys.has('w') ? 1 : 0;
    input.brake = keys.has('s') ? 1 : 0;

    if (!stickDragging) {
      const springLerp = Math.min(1, dt * STICK_SPRING_SPEED);
      input.stickYaw = Scalar.Lerp(input.stickYaw, 0, springLerp);
      input.stickPitch = Scalar.Lerp(input.stickPitch, 0, springLerp);
    }
    cockpit.stickPivot.rotation.z = -input.stickYaw * STICK_MAX_TILT;
    cockpit.stickPivot.rotation.x = input.stickPitch * STICK_MAX_TILT;
  });

  return {
    input,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      scene.onPointerObservable.remove(pointerObserver);
      scene.onBeforeRenderObservable.remove(renderObserver);
      thrusterDrag.onDragObservable.clear();
      cockpit.thrusterHandle.removeBehavior(thrusterDrag);
    },
  };
}
