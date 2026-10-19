import { describe, expect, it } from 'vitest';
import { lightAt } from './lighting';
import { clampCamera } from './camera';
describe('time and camera', () => {
  it('follows dawn, day, dusk and night on the local clock', () => {
    expect(lightAt('auto', 6).label).toBe('sunrise');
    expect(lightAt('auto', 12).label).toBe('day');
    expect(lightAt('auto', 18).label).toBe('sunset');
    expect(lightAt('auto', 23).label).toBe('night');
  });
  it('allows manual lighting independently of the clock', () => {
    expect(lightAt('night', 12).windows).toBeGreaterThan(0.5);
    expect(lightAt('day', 0).windows).toBe(0);
  });
  it('blends intensity over a transition rather than snapping', () => {
    const before = lightAt('auto', 6.49),
      after = lightAt('auto', 6.51);
    expect(Math.abs(after.sunPower - before.sunPower)).toBeLessThan(0.03);
  });
  it('bounds camera movement and zoom and normalizes rotation', () => {
    const c = clampCamera({ x: 300, z: -100, zoom: 8, angle: Math.PI * 10 });
    expect(c.x).toBe(60);
    expect(c.z).toBe(-40);
    expect(c.zoom).toBe(2.5);
    expect(c.angle).toBeCloseTo(0);
    expect(clampCamera({ x: 0, z: 0, zoom: 0.01, angle: -Math.PI / 2 }).zoom).toBe(0.3);
  });
});
