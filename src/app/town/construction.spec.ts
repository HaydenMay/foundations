import { expect, it } from 'vitest';
import { constructionFrame, homeTransition } from './construction';

it('briefly prepares an empty lot, reveals the home gently and always settles', () => {
  expect(constructionFrame(0)).toMatchObject({ visible: false, done: false });
  const reveal = constructionFrame(600);
  expect(reveal.visible).toBe(true);
  expect(reveal.scale).toBeGreaterThan(0.9);
  expect(reveal.scale).toBeLessThan(1);
  expect(constructionFrame(2800)).toEqual({
    visible: true,
    done: true,
    scale: 1,
    rise: 0,
    homeT: 1,
  });
  expect(constructionFrame(400000).done).toBe(true);
});
it('completes immediately for reduced motion without a transient hidden house', () => {
  expect(constructionFrame(0, true)).toEqual({
    visible: true,
    done: true,
    scale: 1,
    rise: 0,
    homeT: 1,
  });
});
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
