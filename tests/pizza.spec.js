import { test, expect } from 'playwright-test-coverage';

test('test', async ({ page }) => {

  await page.goto('http://localhost:5173/');

  await expect(page).toHaveTitle('JWT Pizza');
});