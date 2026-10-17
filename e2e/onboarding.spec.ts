import { expect, test, type Page } from '@playwright/test';
import { initialState } from '../src/app/domain/state';
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('foundations.v1')!));
async function firstStep(page: Page, name = 'Make a moment to unwind') {
  await page.goto('./');
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.getByRole('button', { name: `Complete ${name}`, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your first home is ready!', exact: true }),
  ).toBeVisible();
}
test('new players preview three houses and save before a skippable first construction', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-17T09:00:00') });
  await firstStep(page);
  expect((await saved(page)).completions[0].stars).toBe(1);
  for (const name of ['Classic Cottage', 'Traditional Brick', 'Modern Craftsman']) {
    await page.getByRole('button', { name: `Preview ${name}`, exact: true }).click();
    expect((await saved(page)).designs.home).toBeUndefined();
  }
  // Own the short animation's clock so software rendering cannot expire Skip before a click.
  await page.clock.pauseAt(new Date('2026-10-17T12:00:00'));
  await page.getByRole('button', { name: 'Build my home', exact: true }).click();
  await expect.poll(async () => (await saved(page)).designs.home).toBe('cream');
  await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Skip construction', exact: true })).toBeVisible();
  expect((await saved(page)).designs.home).toBe('cream');
  await page.getByRole('button', { name: 'Skip construction', exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
  await page.clock.resume();
  await page.reload();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
  await expect(page.getByRole('heading', { name: 'Your first home is ready!' })).not.toBeVisible();
  expect((await saved(page)).completions).toHaveLength(1);
});
test('pending selection survives reload and can be resumed after choosing later', async ({
  page,
}) => {
  await firstStep(page, 'Step outside for a little walk');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your first home is ready!' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose later', exact: true }).click();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'false');
  await page.getByRole('button', { name: 'Your town', exact: true }).click();
  await page.getByRole('button', { name: 'Design Your First Home', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Traditional Brick', exact: true }).click();
  await page.getByRole('button', { name: 'Build my home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Skip construction', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
  await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
  expect((await saved(page)).designs.home).toBe('blue');
});
test('reduced motion builds immediately without a hidden or unfinished home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await firstStep(page, 'Move in a way you enjoy');
  await page.getByRole('button', { name: 'Build my home', exact: true }).click();
  await expect.poll(async () => (await saved(page)).designs.home).toBe('sage');
  await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
  await expect(
    page.getByRole('button', { name: 'Skip construction', exact: true }),
  ).not.toBeVisible();
  expect((await saved(page)).designs.home).toBe('sage');
  expect((await saved(page)).completions[0].stars).toBe(3);
});
test('an existing zero-star v1 home bypasses onboarding and remains freely reversible', async ({
  page,
}) => {
  const legacy = {
    ...initialState('2026-09-01'),
    version: 1,
    designs: { home: 'blue' },
    extension: { keep: 'synthetic' },
  };
  delete (legacy as { onboarding?: unknown }).onboarding;
  await page.addInitScript((s) => {
    if (!localStorage.getItem('foundations.v1'))
      localStorage.setItem('foundations.v1', JSON.stringify(s));
  }, legacy);
  await page.goto('./');
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
  await expect(page.getByRole('heading', { name: 'Your first home is ready!' })).not.toBeVisible();
  const migrated = await saved(page);
  expect(migrated.version).toBe(2);
  expect(migrated.designs.home).toBe('blue');
  expect(migrated.extension).toEqual(legacy.extension);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('foundations.pre-v2')!).version),
  ).toBe(1);
  await page.getByRole('button', { name: 'Your town', exact: true }).click();
  await page.getByRole('button', { name: 'Design Your First Home', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Classic Cottage', exact: true }).click();
  await page.getByRole('button', { name: 'Save house style', exact: true }).click();
  await expect(page.locator('app-town')).toHaveAttribute('data-construction', 'idle');
  await page.reload();
  expect((await saved(page)).designs.home).toBe('sage');
  expect((await saved(page)).completions).toEqual([]);
});
test('two tabs record one first completion and synchronize the confirmed house', async ({
  page,
  context,
}) => {
  await page.goto('./');
  const other = await context.newPage();
  await other.goto('./');
  const one = await page
    .getByRole('button', { name: 'Complete Make a moment to unwind', exact: true })
    .elementHandle();
  const two = await other
    .getByRole('button', { name: 'Complete Make a moment to unwind', exact: true })
    .elementHandle();
  await Promise.all([one!.evaluate((b) => b.click()), two!.evaluate((b) => b.click())]);
  await expect(page.getByRole('button', { name: 'Build my home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Build my home', exact: true }).click();
  await expect.poll(async () => (await saved(other)).designs.home).toBe('sage');
  await expect(other.getByRole('button', { name: 'Build my home', exact: true })).not.toBeVisible();
  expect((await saved(page)).completions).toHaveLength(1);
  await other.close();
});

test('a failed durable home save leaves the reward pending across reload', async ({ page }) => {
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'foundations.v1' && JSON.parse(value).designs.home)
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await firstStep(page);
  await page.getByRole('button', { name: 'Build my home', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Your home could not be saved' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build my home', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Skip construction', exact: true }),
  ).not.toBeVisible();
  expect((await saved(page)).designs.home).toBeUndefined();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your first home is ready!', exact: true }),
  ).toBeVisible();
  expect((await saved(page)).onboarding.firstHomeUnlocked).toBe(true);
  expect((await saved(page)).completions).toHaveLength(1);
  await page.getByRole('button', { name: 'Choose later', exact: true }).click();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'false');
});
