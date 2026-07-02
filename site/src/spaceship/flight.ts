import { Axis, Scalar, Space, type TransformNode } from '@babylonjs/core';
import type { FlightInput } from './types';

const MAX_SPEED = 26; // world units / second at full throttle
const ACCEL = 1.4; // how fast speed chases the throttle target
const MAX_YAW_RATE = 1.1; // radians/second at full yaw input
const MAX_PITCH_RATE = 0.9;
const MAX_PITCH = 0.6; // clamp so you can't flip the ship upside down
const MAX_BANK = 0.5; // cosmetic roll cap, radians
const BANK_RESPONSIVENESS = 4;

export interface FlightState {
  speed: number;
}

export function createFlightState(): FlightState {
  return { speed: 0 };
}

/**
 * Pure per-frame integration: FlightInput + dt -> shipNode/cockpitRig
 * mutation. Deliberately arcade rather than physically simulated — no mass,
 * no drag curve beyond a simple speed-chases-throttle lerp. Uses Euler
 * `rotation` exclusively (never `rotationQuaternion`): Babylon silently
 * prefers the quaternion once it's set on a node, which would turn any
 * later `.rotation.x = ...` write here into a silent no-op.
 */
export function stepFlight(
  shipNode: TransformNode,
  cockpitRig: TransformNode,
  input: FlightInput,
  state: FlightState,
  dt: number,
  reduceMotion: boolean,
): void {
  const throttle = Scalar.Clamp(input.baseThrottle + input.boost - input.brake, -0.3, 1);
  state.speed = Scalar.Lerp(state.speed, throttle * MAX_SPEED, Math.min(1, dt * ACCEL));

  const yawInput = Scalar.Clamp(input.yawKeys + input.stickYaw, -1, 1);
  const pitchInput = input.stickPitch;

  shipNode.rotation.y += yawInput * MAX_YAW_RATE * dt;
  shipNode.rotation.x = Scalar.Clamp(shipNode.rotation.x + pitchInput * MAX_PITCH_RATE * dt, -MAX_PITCH, MAX_PITCH);
  shipNode.translate(Axis.Z, state.speed * dt, Space.LOCAL);

  const targetBank = reduceMotion ? 0 : -yawInput * MAX_BANK;
  cockpitRig.rotation.z = Scalar.Lerp(cockpitRig.rotation.z, targetBank, Math.min(1, dt * BANK_RESPONSIVENESS));
}

export { MAX_SPEED };
