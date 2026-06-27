import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.acquireVsCodeApi = () => ({
      postMessage: () => {},
      setState: () => {},
      getState: () => undefined,
    });
  });
});

test('webview loads and shows welcome content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('mssgs');
  await expect(page.getByText('Welcome to mssgs')).toBeVisible();
});

test('webview root container is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeAttached();
});
