import { CameraState } from '../domain/models';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export interface ConstructionFrame {
  visible: boolean;
  done: boolean;
  scale: number;
  rise: number;
  homeT: number;
}
export function constructionFrame(elapsed: number, reducedMotion = false): ConstructionFrame {
  if (reducedMotion || elapsed >= 2800)
    return { visible: true, done: true, scale: 1, rise: 0, homeT: 1 };
  const reveal = 1 - Math.pow(1 - clamp((elapsed - 450) / 1100), 3);
  return {
    visible: elapsed >= 450,
    done: false,
    scale: 0.92 + 0.08 * reveal,
    rise: -0.22 * (1 - reveal),
    homeT: 1 - Math.pow(1 - clamp(elapsed / 750), 3),
  };
}
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
