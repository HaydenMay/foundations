import { expect, it } from 'vitest';
import { homeTransition, projectTransition, settleConstructionCamera } from './construction';

it('centers on the original home with a short rotation and bounded final zoom', () => {
  const from = { x: 8, z: -2, zoom: 1.8, angle: (Math.PI * 7) / 4 };
  expect(homeTransition(from, 0)).toMatchObject({ x: 8, z: -2, zoom: 1.8 });
  expect(homeTransition(from, 0).angle).toBeCloseTo(from.angle);
  const middle = homeTransition(from, 0.5);
  expect(middle.x).toBe(4);
  expect(middle.z).toBe(-1);
  expect(middle.zoom).toBeCloseTo(1.4);
  expect(middle.angle).toBeCloseTo(0);
  const end = homeTransition(from, 1);
  expect(end.x).toBe(0);
  expect(end.z).toBeCloseTo(0);
  expect(end.zoom).toBe(1);
  expect(end.angle).toBeCloseTo(Math.PI / 4);
});

it('focuses a selected project in the same lot coordinate system and clamps progress', () => {
  const from = { x: 6, z: -4, zoom: 0.8, angle: 0 },
    focus = { x: -7, z: -5, zoom: 1.35 };
  expect(projectTransition(from, focus, 0)).toMatchObject(from);
  const middle = projectTransition(from, focus, 0.5);
  expect(middle.x).toBe(-0.5);
  expect(middle.z).toBe(-4.5);
  expect(middle.zoom).toBeCloseTo(1.075);
  const end = projectTransition(from, focus, 1);
  expect(end).toMatchObject(focus);
  expect(end.angle).toBeCloseTo(Math.PI / 4);
  expect(projectTransition(from, focus, 2)).toEqual(projectTransition(from, focus, 1));
  const frontFocus = { ...focus, angle: (Math.PI * 7) / 4 };
  expect(projectTransition(from, frontFocus, 1).angle).toBeCloseTo((Math.PI * 7) / 4);
});

it('leaves the camera at a newly unlocked chapter while ordinary projects return home', () => {
  const from = { x: 0, z: 0, zoom: 1, angle: 0 },
    focus = { x: 31, z: 10, zoom: 0.62 };
  expect(settleConstructionCamera(from, focus, true)).toEqual(projectTransition(from, focus, 1));
  expect(settleConstructionCamera(from, focus, false)).toEqual(homeTransition(from, 1));
});
