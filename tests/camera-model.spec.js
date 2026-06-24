import { expect, test } from '@playwright/test';

test('boots the real camera permission path and default Python model path', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByTestId('ai-trail-app')).toBeVisible();
  await expect(page.getByTestId('camera-feed')).toBeVisible();
  await expect(page.getByText(/camera-live|requesting-camera/)).toBeVisible();
  await expect(page.getByText(/python-local|test-detector/)).toBeVisible({ timeout: 15000 });

  const modelText = await page.locator('.statusStrip').innerText();
  expect(modelText.toLowerCase()).toContain('python-local');
  expect(consoleErrors).toEqual([]);
});
