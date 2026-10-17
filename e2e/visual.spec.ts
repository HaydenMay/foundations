import { expect, test, type Page } from '@playwright/test';
import { initialState } from '../src/app/domain/state';
import { completeHabit } from '../src/app/domain/habits';
import type { WebGLRenderer, Scene, Camera } from 'three';

declare global {
  interface Window {
    __THREE_DEVTOOLS__: EventTarget;
    __townReview?: { renderer: WebGLRenderer; scene?: Scene; camera?: Camera };
  }
}
test.use({ timezoneId: 'Pacific/Auckland' });

async function choose(page: Page, project: string, choice: string) {
  await page.getByRole('button', { name: 'Your town', exact: true }).click();
  await page.getByRole('button', { name: `Design ${project}`, exact: true }).click();
  await page.getByRole('button', { name: new RegExp(choice) }).click();
  await expect(page.getByRole('heading', { name: 'Your growing town', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
}
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!));

test('all three house appearances are free, selectable and retained after reload', async ({
  page,
}) => {
  await page.goto('./');
  for (const [name, id] of [
    ['Classic Cottage', 'sage'],
    ['Modern Craftsman', 'cream'],
    ['Traditional Brick', 'blue'],
  ]) {
    await choose(page, 'A place to begin', name);
    await page.reload();
    await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
    expect((await saved(page)).designs.home).toBe(id);
    expect((await saved(page)).completions).toEqual([]);
    await page.getByRole('button', { name: 'Your town', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Design Your backyard retreat', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Design A place to begin', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(name) })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Close dialog' }).click();
  }
});

test('legacy v1 town keeps archived history, roof design and twelve stars through house and yard changes', async ({
  page,
}) => {
  let state = initialState('2026-09-01');
  for (const date of ['2026-09-01', '2026-09-02'])
    for (const h of state.habits) state = completeHabit(state, h.id, date);
  state.habits[0].archived = true;
  state.designs = { home: 'blue', backyard: 'fort', exterior: 'moss' };
  state.preferences.lighting = 'night';
  await page.addInitScript((s) => {
    if (!localStorage.getItem('foundations.v1'))
      localStorage.setItem('foundations.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
  for (const home of ['Classic Cottage', 'Modern Craftsman', 'Traditional Brick']) {
    await choose(page, 'A place to begin', home);
    for (const yard of ['Quiet waters', 'Woodland fort', 'A little lift'])
      await choose(page, 'Your backyard retreat', yard);
  }
  await page.reload();
  await expect(page.locator('app-town')).toHaveAttribute('data-lighting', 'night');
  const restored = await saved(page);
  expect(restored.version).toBe(1);
  expect(restored.habits).toEqual(state.habits);
  expect(restored.completions).toEqual(state.completions);
  expect(restored.completions.reduce((n: number, c: { stars: number }) => n + c.stars, 0)).toBe(12);
  expect(restored.designs).toEqual({ home: 'blue', backyard: 'trampoline', exterior: 'moss' });
});

test('device local clock follows four moods and manual override survives clock changes and reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-17T17:00:00Z') }); // 6 am in Auckland, not UTC.
  await page.goto('./');
  await expect(page.locator('app-town')).toHaveAttribute('data-lighting', 'sunrise');
  for (const [utc, mood] of [
    ['2026-10-17T23:00:00Z', 'day'],
    ['2026-10-18T05:00:00Z', 'sunset'],
    ['2026-10-18T09:00:00Z', 'night'],
  ]) {
    await page.clock.setSystemTime(new Date(utc));
    await page.clock.runFor(60001);
    await expect(page.locator('app-town')).toHaveAttribute('data-lighting', mood);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Town lighting').selectOption('sunset');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.clock.setSystemTime(new Date('2026-10-18T17:00:00Z'));
  await page.clock.runFor(60001);
  await page.reload();
  await expect(page.locator('app-town')).toHaveAttribute('data-lighting', 'sunset');
  expect((await saved(page)).preferences.lighting).toBe('sunset');
});

test('home stays visible with both panel states, no overlaid headline or WebGL errors', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', (event) => {
      const r = (event as CustomEvent<WebGLRenderer>).detail;
      if (!r.isWebGLRenderer) return;
      window.__townReview = { renderer: r };
      const render = r.render.bind(r);
      r.render = (scene, camera) => {
        render(scene, camera);
        Object.assign(window.__townReview!, { scene, camera });
      };
    });
  });
  await page.goto('./');
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  for (const collapsed of [false, true]) {
    if (collapsed) await page.getByRole('button', { name: 'Collapse habits' }).click();
    // Responsive grid transitions are short; wait until ResizeObserver sees the settled viewport.
    await page.waitForTimeout(400);
    const framing = await page.evaluate(() => {
      const { renderer, camera } = window.__townReview!;
      const points = [];
      // Envelope shared by all three houses, including the taller Craftsman chimney.
      for (const x of [-8.3, 0.5])
        for (const y of [0.13, 6.72])
          for (const z of [-7.85, -0.45]) {
            const p = camera!.position.clone().set(x, y, z).project(camera!);
            points.push({ x: p.x, y: p.y });
          }
      return {
        points,
        lost: renderer.getContext().isContextLost(),
        error: renderer.getContext().getError(),
        calls: renderer.info.render.calls,
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      };
    });
    expect(framing.lost).toBe(false);
    expect(framing.error).toBe(0);
    expect(framing.calls).toBeGreaterThan(0);
    expect(framing.scroll).toBeLessThanOrEqual(framing.width);
    for (const p of framing.points) {
      expect(Math.abs(p.x)).toBeLessThan(1);
      expect(Math.abs(p.y)).toBeLessThan(1);
    }
    const headline = await page.locator('.scene-heading').boundingBox();
    if (headline) {
      expect(headline.width).toBeLessThanOrEqual(1);
      expect(headline.height).toBeLessThanOrEqual(1);
    } else await expect(page.locator('.scene-heading')).toBeHidden();
    await page.screenshot({
      path: `test-results/${info.project.name}-home-${collapsed ? 'collapsed' : 'expanded'}.png`,
    });
  }
  expect(errors).toEqual([]);
});
