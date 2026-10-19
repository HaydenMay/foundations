import { CameraState } from '../domain/models';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function homeTransition(from: CameraState, progress: number): CameraState {
  const t = clamp(progress),
    turn = Math.PI * 2,
    target = Math.PI / 4;
  const delta = ((target - from.angle + Math.PI * 3) % turn) - Math.PI;
  return {
    x: from.x * (1 - t),
    z: from.z * (1 - t),
    zoom: from.zoom + (1 - from.zoom) * t,
    angle: (((from.angle + delta * t) % turn) + turn) % turn,
  };
}

export function projectTransition(
  from: CameraState,
  focus: { x: number; z: number; zoom: number; angle?: number },
  progress: number,
): CameraState {
  const t = clamp(progress),
    targetAngle = focus.angle ?? Math.PI / 4,
    turn = Math.PI * 2,
    delta = ((targetAngle - from.angle + Math.PI * 3) % turn) - Math.PI;
  return {
    x: from.x + (focus.x - from.x) * t,
    z: from.z + (focus.z - from.z) * t,
    zoom: from.zoom + (focus.zoom - from.zoom) * t,
    angle: (((from.angle + delta * t) % turn) + turn) % turn,
  };
}

/** Settle chapter reveals at their new district while ordinary projects return to the original home. */
export function settleConstructionCamera(
  from: CameraState,
  focus: { x: number; z: number; zoom: number; angle?: number } | undefined,
  remainAtFocus: boolean,
): CameraState {
  if (remainAtFocus && focus) return projectTransition(from, focus, 1);
  return homeTransition(from, 1);
}
