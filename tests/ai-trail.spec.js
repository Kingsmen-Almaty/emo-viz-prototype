import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('renders the test camera feed, sentiment overlay, diagnostics, and LED simulator', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/?mode=test');

  await expect(page.getByTestId('ai-trail-app')).toBeVisible();
  await expect(page.getByTestId('camera-feed')).toBeVisible();
  await expect(page.getByTestId('sentiment-overlay')).toBeVisible();
  await expect(page.getByTestId('sentiment-result')).toContainText(/future of AI|You seem/);
  await expect(page.getByTestId('diagnostics-panel')).toContainText('Real-time calculation');
  await expect(page.getByTestId('led-simulator')).toBeVisible();
  await expect(page.getByTestId('backend-sample-panel')).toBeVisible();
  await expect(page.getByTestId('feature-engine-status')).toContainText('backend-yunet');
  await expect(page.getByTestId('emotion-engine-select')).toHaveValue('ferplus-assisted');

  await expect.poll(async () => {
    return page.getByTestId('sentiment-result').innerText();
  }).toMatch(/You seem (Thoughtful|Excited|Curious|Concerned|Anxious|Resistant|Distrustful)/);

  const overlayBox = await page.getByTestId('sentiment-overlay').boundingBox();
  expect(overlayBox.width).toBeGreaterThan(800);
  expect(overlayBox.height).toBeGreaterThan(500);
  expect(consoleErrors).toEqual([]);
});

test('has nonblank visual pixels in the camera and overlay stage', async ({ page }) => {
  await page.goto('/?mode=test');
  await page.waitForTimeout(1200);

  const screenshot = await page.locator('.experienceStage').screenshot();
  const png = PNG.sync.read(screenshot);
  let minBrightness = Number.POSITIVE_INFINITY;
  let maxBrightness = 0;
  let coloured = 0;
  for (let i = 0; i < png.data.length; i += 400) {
    const red = png.data[i];
    const green = png.data[i + 1];
    const blue = png.data[i + 2];
    const value = red + green + blue;
    minBrightness = Math.min(minBrightness, value);
    maxBrightness = Math.max(maxBrightness, value);
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) coloured += 1;
  }

  expect(maxBrightness - minBrightness).toBeGreaterThan(300);
  expect(coloured).toBeGreaterThan(0);
});

test('keeps a result visible while the tracked test face shifts laterally and in depth', async ({ page }) => {
  await page.goto('/?mode=test');

  const readings = [];
  for (let index = 0; index < 5; index += 1) {
    await page.waitForTimeout(900);
    readings.push(await page.getByTestId('sentiment-result').innerText());
  }

  expect(readings.every((text) => /You seem/.test(text))).toBe(true);
  await expect(page.getByTestId('diagnostics-panel')).not.toContainText('idle');
});

test('can switch between the two Python emotion modes', async ({ page }) => {
  await page.goto('/?mode=test');
  await page.getByTestId('emotion-engine-select').selectOption('ferplus-raw');
  await expect.poll(async () => (await page.getByTestId('emotion-engine-status').innerText()).toLowerCase()).toContain('backend-ferplus-test');
  await page.getByTestId('emotion-engine-select').selectOption('ferplus-assisted');
  await expect.poll(async () => (await page.getByTestId('emotion-engine-status').innerText()).toLowerCase()).toContain('backend-assisted-test');
  await expect.poll(async () => page.getByTestId('sentiment-result').innerText()).toMatch(/You seem/);
});

test('uses backend YuNet multi-face feature placement', async ({ page }) => {
  await page.goto('/?mode=test');
  await expect.poll(async () => (await page.getByTestId('feature-engine-status').innerText()).toLowerCase()).toContain('backend-yunet-test');
  await expect.poll(async () => page.getByTestId('diagnostics-panel').innerText()).toContain('faces\n2');
  await expect.poll(async () => page.getByTestId('sentiment-result').innerText()).toMatch(/You seem/);
});

test('creates a small backend sample and can switch to backend emotion mode', async ({ page }) => {
  await page.goto('/?mode=test');
  await expect(page.getByTestId('backend-sample-image')).toBeVisible();
  await expect(page.getByTestId('backend-sample-panel')).toContainText('192x192');
  await page.getByTestId('emotion-engine-select').selectOption('ferplus-assisted');
  await expect.poll(async () => (await page.getByTestId('emotion-engine-status').innerText()).toLowerCase()).toContain('backend-assisted-test');
  await expect.poll(async () => page.getByTestId('sentiment-result').innerText()).toMatch(/You seem/);
});
