import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { initialState } from '../src/app/domain/state';
import { completeHabit } from '../src/app/domain/habits';
import { selectDesign } from '../src/app/domain/progression';
const raw = (page: Page) => page.evaluate(() => localStorage.getItem('foundations.v1'));
async function seed(page: Page) {
  let s = initialState('2026-09-01');
  s = completeHabit(s, s.habits[0].id, '2026-09-01');
  s = selectDesign(s, 'home', 'blue');
  await page.addInitScript((state) => {
    if (!localStorage.getItem('foundations.v1'))
      localStorage.setItem('foundations.v1', JSON.stringify(state));
  }, s);
  await page.goto('./');
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  await page.waitForTimeout(300);
}
async function enter(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Enter Developer Preview', exact: true }).click();
  await expect(page.getByTestId('preview-badge')).toBeVisible();
}
test('preview changes, real backup export and a late camera event cannot change genuine storage', async ({
  page,
}) => {
  await seed(page);
  const before = (await raw(page))!;
  await enter(page);
  await page.getByLabel('Simulated lifetime stars').fill('999');
  await page.getByRole('button', { name: 'Apply simulated stars', exact: true }).click();
  await page.getByLabel('Jump to milestone').selectOption('circle');
  await page.getByLabel('Preview house style').selectOption('cream');
  await page.getByLabel('Preview backyard').selectOption('trampoline');
  await page.getByLabel('Preview lighting').selectOption('night');
  await page.getByRole('button', { name: 'Preview construction', exact: true }).click();
  await page.getByRole('button', { name: 'Skip construction', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const file = await download;
  expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual(JSON.parse(before));
  await expect(page.getByLabel('Import backup file')).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Rotate town clockwise' }).click();
  await page.getByRole('button', { name: 'Exit Developer Preview', exact: true }).click();
  await page.waitForTimeout(500);
  expect(await raw(page)).toBe(before);
  await expect(page.getByTestId('preview-badge')).not.toBeVisible();
  expect(JSON.parse((await raw(page))!).designs).toEqual({ home: 'blue' });
});
test('reload discards preview and another tab stays genuine while real updates survive exit', async ({
  page,
  context,
}) => {
  await seed(page);
  const before = await raw(page);
  await enter(page);
  await page.getByRole('button', { name: 'Unlock all existing milestones', exact: true }).click();
  const other = await context.newPage();
  await other.goto('./');
  await expect(other.getByTestId('preview-badge')).not.toBeVisible();
  expect(await raw(other)).toBe(before);
  await other
    .getByRole('button', { name: 'Complete Make a moment to unwind', exact: true })
    .click();
  await expect.poll(async () => JSON.parse((await raw(page))!).completions.length).toBe(2);
  await page.getByRole('button', { name: 'Exit Developer Preview', exact: true }).click();
  expect(JSON.parse((await raw(page))!).designs).toEqual({ home: 'blue' });
  await enter(page);
  await page.getByLabel('Preview house style').selectOption('sage');
  await page.reload();
  await expect(page.getByTestId('preview-badge')).not.toBeVisible();
  expect(JSON.parse((await raw(page))!).designs).toEqual({ home: 'blue' });
  expect(JSON.parse((await raw(page))!).completions).toHaveLength(2);
  await other.close();
});
test('all five preview scenarios render, controls collapse and layout stays usable', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await seed(page);
  const before = await raw(page);
  await enter(page);
  for (const scenario of ['new', 'ready', 'home', 'several', 'all']) {
    await page.getByLabel('Test scenario').selectOption(scenario);
    if (scenario === 'ready')
      await page.getByRole('button', { name: 'Choose later', exact: true }).click();
    await expect(page.locator('app-town')).toHaveAttribute(
      'data-home-visible',
      scenario === 'new' || scenario === 'ready' ? 'false' : 'true',
    );
    await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Collapse preview controls', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Expand preview controls', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-developer-all.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await raw(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('visibility toggles hide and restore preview projects without reopening onboarding', async ({
  page,
}) => {
  await seed(page);
  const before = await raw(page);
  await enter(page);
  await page.getByLabel('Show first house', { exact: true }).uncheck();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'false');
  await expect(
    page.getByRole('heading', { name: 'Your first home is ready!', exact: true }),
  ).not.toBeVisible();
  await page.getByLabel('Show first house', { exact: true }).check();
  await expect(page.locator('app-town')).toHaveAttribute('data-home-visible', 'true');
  await page.getByLabel('Preview backyard', { exact: true }).selectOption('trampoline');
  await page.getByLabel('Show backyard project', { exact: true }).uncheck();
  await expect(page.getByLabel('Show backyard project', { exact: true })).not.toBeChecked();
  await page.getByLabel('Show backyard project', { exact: true }).check();
  await expect(page.getByLabel('Show backyard project', { exact: true })).toBeChecked();
  expect(await raw(page)).toBe(before);
});
