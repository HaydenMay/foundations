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
