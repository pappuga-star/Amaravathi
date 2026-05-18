import { expect, test } from '@playwright/test';

async function loginIfCredentialsProvided(page: import('@playwright/test').Page) {
  const username = process.env.PLAYWRIGHT_LOGIN_EMAIL;
  const password = process.env.PLAYWRIGHT_LOGIN_PASSWORD;
  if (!username || !password) return false;

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForLoadState('networkidle');
  return true;
}

async function assertHeaderVisible(page: import('@playwright/test').Page) {
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.height).toBeGreaterThan(0);
}

test.describe('UI layout regression', () => {
  test('desktop: dashboard/header/scroll/search modal', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    await page.goto('/');
    await assertHeaderVisible(page);
    await page.screenshot({ path: 'tests/__screenshots__/desktop-dashboard-initial.png', fullPage: true });

    await page.mouse.wheel(0, 1200);
    await assertHeaderVisible(page);
    await page.screenshot({ path: 'tests/__screenshots__/desktop-dashboard-scrolled.png', fullPage: true });

    const searchFab = page.getByRole('button', { name: /search/i }).first();
    if (await searchFab.isVisible()) {
      await searchFab.click();
      await page.screenshot({ path: 'tests/__screenshots__/desktop-global-search-open.png', fullPage: true });
      await page.keyboard.press('Escape');
    }
  });

  test('desktop: protected pages layout (when login env is provided)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    const loggedIn = await loginIfCredentialsProvided(page);
    test.skip(!loggedIn, 'Set PLAYWRIGHT_LOGIN_EMAIL and PLAYWRIGHT_LOGIN_PASSWORD for protected routes');

    for (const route of ['/purchase-batch', '/general-items', '/modules']) {
      await page.goto(route);
      await assertHeaderVisible(page);
      await page.screenshot({
        path: `tests/__screenshots__/desktop-${route.replace('/', '') || 'home'}-initial.png`,
        fullPage: true,
      });
      await page.mouse.wheel(0, 1000);
      await assertHeaderVisible(page);
      await page.screenshot({
        path: `tests/__screenshots__/desktop-${route.replace('/', '') || 'home'}-scrolled.png`,
        fullPage: true,
      });
    }
  });

  test('mobile: header + sidebar layout', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    await page.goto('/');
    await assertHeaderVisible(page);
    await page.screenshot({ path: 'tests/__screenshots__/mobile-dashboard-initial.png', fullPage: true });

    const menuButton = page.getByRole('button', { name: /open navigation/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.screenshot({ path: 'tests/__screenshots__/mobile-sidebar-open.png', fullPage: true });
    }
  });
});

