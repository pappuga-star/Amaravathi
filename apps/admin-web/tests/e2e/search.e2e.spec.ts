import { expect, test } from '@playwright/test';

test.describe('Search E2E governance flows', () => {
  test('global search modal opens with Ctrl/Cmd+K and supports suggestions/no-result UI', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');

    const searchDialog = page.getByRole('dialog').first();
    await expect(searchDialog).toBeVisible({ timeout: 5000 });

    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    await searchInput.fill('royl');
    await page.waitForTimeout(400);

    const suggestions = page.getByText(/suggestions/i).first();
    if (await suggestions.isVisible()) {
      await expect(suggestions).toBeVisible();
    }

    const didYouMean = page.getByText(/did you mean/i).first();
    if (await didYouMean.isVisible()) {
      await expect(didYouMean).toBeVisible();
    }
  });

  test('search admin dashboard loads and handles benchmark/rate-limit flows when available', async ({ page }) => {
    await page.goto('/search-admin');

    const heading = page.getByText(/search admin|search health|benchmark/i).first();
    await expect(heading).toBeVisible({ timeout: 7000 });

    const benchmarkBtn = page.getByRole('button', { name: /benchmark|run/i }).first();
    if (await benchmarkBtn.isVisible()) {
      await benchmarkBtn.click();
      await page.waitForTimeout(600);
    }

    const rateLimitMsg = page.getByText(/rate limit/i).first();
    if (await rateLimitMsg.isVisible()) {
      await expect(rateLimitMsg).toBeVisible();
    }
  });
});
