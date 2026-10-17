import { test, expect } from '@playwright/test';
import { openTown } from './support';
test.use({ timezoneId: 'Pacific/Auckland' });
test('displays the local calendar date east of UTC and rolls goals over at midnight', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-18T19:00:00Z') });
  await openTown(page);
  await expect(page.getByText('Monday, October 19', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Step outside for a little walk' }).click();
  await expect(page.getByTestId('daily-stars')).toHaveText('2 / 10');
  await page.clock.setSystemTime(new Date('2026-10-19T11:00:01Z'));
  await page.clock.runFor(30001);
  await expect(page.getByTestId('daily-stars')).toHaveText('0 / 10');
  await expect(page.getByText('Tuesday, October 20', { exact: true })).toBeVisible();
});
