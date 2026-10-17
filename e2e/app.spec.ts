import { test, expect } from '@playwright/test';
import { existingState as initialState, openTown } from './support';
import { completeHabit, createHabit } from '../src/app/domain/habits';
import { localDate } from '../src/app/domain/dates';
import { PROJECTS } from '../src/app/domain/progression';

test('renders the town and keeps progress and panel preference after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openTown(page);
  await expect(page.getByRole('heading', { name: 'Today’s foundations' })).toBeVisible();
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Complete Step outside for a little walk' }).click();
  await expect(page.getByTestId('daily-stars')).toHaveText('2 / 10');
  await page.reload();
  await expect(page.getByTestId('daily-stars')).toHaveText('2 / 10');
  await expect(
    page.getByRole('button', { name: 'Completed Step outside for a little walk' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Collapse habits' }).click();
  await expect(page.getByRole('button', { name: 'Expand habits' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand habits' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('creates, edits, pauses and archives a next-day habit', async ({ page }) => {
  await openTown(page);
  await page.getByRole('button', { name: 'Add a habit' }).click();
  await page.getByLabel('Habit name').fill('Read a few pages');
  await page.getByLabel('Frequency').selectOption('weekdays');
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await page.getByRole('button', { name: 'Save habit', exact: true }).click();
  await page.getByRole('button', { name: 'Manage habits' }).click();
  await expect(page.getByText('Read a few pages', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Read a few pages' }).click();
  await expect(page.getByLabel('Habit name')).toHaveValue('Read a few pages');
  await page.getByLabel('Habit name').fill('Read and rest');
  await page.getByLabel('Active habit').uncheck();
  await page.getByRole('button', { name: 'Save habit', exact: true }).click();
  await page.getByRole('button', { name: 'Manage habits' }).click();
  await page.getByRole('button', { name: 'Archive Read and rest' }).click();
  await expect(page.getByRole('button', { name: 'Restore Read and rest' })).toBeVisible();
});

test('preserves queued projects and changes designs freely', async ({ page }) => {
  // Synthetic non-personal progress fixture, injected only by the browser test.
  const today = localDate();
  let state = initialState(today);
  for (let day = 1; day <= 14; day++) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    for (let n = 0; n < 4; n++) {
      const h = createHabit(
        {
          name: 'Test habit',
          difficulty: 'hard',
          schedule: { kind: 'daily', days: [] },
          active: true,
        },
        date,
        true,
      );
      state.habits.push(h);
      state = completeHabit(state, h.id, date);
    }
  }
  await page.addInitScript((s) => localStorage.setItem('foundations.v1', JSON.stringify(s)), state);
  await openTown(page);
  await page.getByRole('button', { name: /Your town/ }).click();
  await page.getByRole('button', { name: 'Design Your backyard retreat' }).click();
  await page.getByRole('button', { name: /Quiet waters/ }).click();
  await expect(page.getByRole('heading', { name: 'Your growing town' })).toBeVisible();
  await expect(page.getByText('Quiet waters', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Design Your backyard retreat' }).click();
  await expect(page.getByRole('button', { name: /Quiet waters/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: /Woodland fort/ }).click();
  await expect(page.getByRole('heading', { name: 'Your growing town' })).toBeVisible();
  await expect(page.getByText('Woodland fort', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!));
  expect(saved.designs.backyard).toBe('fort');
  expect(saved.completions.reduce((s: number, c: { stars: number }) => s + c.stars, 0)).toBe(140);
  expect(Object.keys(saved.designs)).toHaveLength(2);
});

test('supports lighting, camera controls, and fitting portrait or landscape UI', async ({
  page,
}, info) => {
  await openTown(page);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(400);
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!));
  expect(state.preferences.camera.zoom).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Return to your first home' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Town lighting').selectOption('night');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('app-town')).toHaveAttribute('data-lighting', 'night');
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await page.screenshot({ path: `test-results/${info.project.name}-night.png` });
});

test('exports a backup and rejects invalid imports without losing progress', async ({ page }) => {
  await openTown(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^foundations-.*\.json$/);
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('backup');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByTestId('daily-stars')).toHaveText('0 / 10');
});

test('keeps a camera change when a habit is completed before its debounced save', async ({
  page,
}) => {
  await openTown(page);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.evaluate(() => {
    (document.querySelector('[aria-label="Rotate town clockwise"]') as HTMLButtonElement).click();
    (
      document.querySelector(
        '[aria-label="Complete Step outside for a little walk"]',
      ) as HTMLButtonElement
    ).click();
  });
  await expect(page.getByTestId('daily-stars')).toHaveText('2 / 10');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.angle,
      ),
    )
    .toBeCloseTo(Math.PI / 2);
});

test('pans with a drag, zooms with the wheel and restores home', async ({ page }) => {
  await openTown(page);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  const rect = (await canvas.boundingBox())!;
  const x = rect.x + rect.width * 0.6,
    y = rect.y + rect.height * 0.6;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 35, y + 25, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.x),
      ),
    )
    .toBeGreaterThan(0.1);
  await page.mouse.wheel(0, -250);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.zoom,
      ),
    )
    .toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Return to your first home' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.x),
    )
    .toBe(0);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!));
  expect(s.completions).toHaveLength(0);
});

test('supports touch pan and a two-finger pinch on the town', async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is exercised in the two phone viewports.');
  await openTown(page);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  const rect = (await canvas.boundingBox())!,
    x = rect.x + rect.width * 0.65,
    y = rect.y + rect.height * 0.55;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 5, y: y + i * 3, id: 1 }],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.x),
      ),
    )
    .toBeGreaterThan(0.1);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 20, y, id: 1 },
      { x: x + 20, y, id: 2 },
    ],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 20 - i * 4, y, id: 1 },
        { x: x + 20 + i * 4, y, id: 2 },
      ],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.zoom,
      ),
    )
    .toBeGreaterThan(1);
});

test('restores a validated backup after an explicit preview', async ({ page }) => {
  const date = localDate();
  let s = initialState(date);
  s = completeHabit(s, s.habits[2].id, date);
  s.preferences.camera = { x: 1, z: 2, zoom: 0.8, angle: Math.PI };
  await openTown(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(page.getByRole('heading', { name: 'Restore this town?' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace local data with this backup' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('daily-stars')).toHaveText('3 / 10');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('foundations.v1')!).preferences.camera.zoom,
      ),
    )
    .toBeCloseTo(0.96);
  await page.reload();
  await expect(page.getByTestId('daily-stars')).toHaveText('3 / 10');
});

test('does not duplicate a completion from two open tabs', async ({ page, context }) => {
  await openTown(page);
  const other = await context.newPage();
  await other.goto('./');
  const first = await page
    .getByRole('button', { name: 'Complete Step outside for a little walk' })
    .elementHandle();
  const second = await other
    .getByRole('button', { name: 'Complete Step outside for a little walk' })
    .elementHandle();
  await Promise.all([
    first!.evaluate((button) => button.click()),
    second!.evaluate((button) => button.click()),
  ]);
  await expect(page.getByTestId('daily-stars')).toHaveText('2 / 10');
  await expect(other.getByTestId('daily-stars')).toHaveText('2 / 10');
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem('foundations.v1')!).completions.length,
  );
  expect(count).toBe(1);
  await other.close();
});

test('renders every built project and each time of day', async ({ page }, info) => {
  let s = initialState('2026-09-01');
  s.habits = [0, 1, 2, 3].map(() =>
    createHabit(
      {
        name: 'Sample healthy habit',
        difficulty: 'hard',
        schedule: { kind: 'daily', days: [] },
        active: true,
      },
      '2026-09-01',
      true,
    ),
  );
  for (let day = 1; day <= 12; day++)
    for (const h of s.habits) s = completeHabit(s, h.id, `2026-09-${String(day).padStart(2, '0')}`);
  for (const p of PROJECTS) s.designs[p.id] = p.choices[0].id;
  s.preferences.panelOpen = false;
  s.preferences.camera = { x: 5, z: 1, zoom: 0.8, angle: Math.PI / 4 };
  s.preferences.lighting = 'day';
  await page.addInitScript((state) => {
    if (!localStorage.getItem('foundations.v1'))
      localStorage.setItem('foundations.v1', JSON.stringify(state));
  }, s);
  await openTown(page, s);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-complete-day.png` });
  await page.getByRole('button', { name: 'Settings' }).click();
  for (const light of ['sunrise', 'sunset', 'night']) {
    await page.getByLabel('Town lighting').selectOption(light);
    await expect(page.locator('app-town')).toHaveAttribute('data-lighting', light);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.screenshot({ path: `test-results/${info.project.name}-complete-${light}.png` });
    if (light !== 'night') await page.getByRole('button', { name: 'Settings' }).click();
  }
});
