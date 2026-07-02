import type { Mesh, Scene, TransformNode } from '@babylonjs/core';
import type { ChatUIController } from '../chat/ui';
import type { Profile } from '../data/profile';

/** Per-frame merged control state, written by controls.ts, read by flight.ts. */
export interface FlightInput {
  /** -1..1, additive with the stick's left/right tilt. */
  yawKeys: number;
  /** 0..1 base throttle set by the thruster lever position (persists). */
  baseThrottle: number;
  /** 0/1, momentary boost from W. */
  boost: number;
  /** 0/1, momentary brake from S. */
  brake: number;
  /** -1..1, steering stick left/right tilt. */
  stickYaw: number;
  /** -1..1, steering stick forward/back tilt. */
  stickPitch: number;
}

export type CockpitButtonId = 'about' | 'skills' | 'projects' | 'contact';

export interface CockpitHandles {
  /** Ship's real position/heading — camera, console, and all fixtures ride on this. */
  shipNode: TransformNode;
  /** Child of shipNode; owns only cosmetic roll (bank), never fed back into steering. */
  cockpitRig: TransformNode;
  /** Pivot the steering-stick mesh rotates around; controls.ts tilts this directly. */
  stickPivot: TransformNode;
  /** The visible/pickable stick mesh, a child of stickPivot — picking targets this. */
  stickMesh: Mesh;
  /** The thruster lever mesh; controls.ts clamps/reads its local Y position. */
  thrusterHandle: Mesh;
  /** Console button meshes keyed by section, for ActionManager wiring + hover glow. */
  buttons: Record<CockpitButtonId, Mesh>;
  /** The physical exit lever mesh, separate from the always-present HTML exit button. */
  exitButton: Mesh;
}

export interface SpaceshipContext {
  scene: Scene;
  cockpit: CockpitHandles;
  input: FlightInput;
  profile: Profile;
}

export interface StartSpaceshipModeOptions {
  profile: Profile;
  chatUi: ChatUIController;
  onExit: () => void;
}

export interface SpaceshipController {
  dispose: () => void;
}
