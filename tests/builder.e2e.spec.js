import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('builds a working finance app from chat through preview', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  const logs = [];
  fs.mkdirSync('tests/artifacts', { recursive: true });
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));

  const baseUrl = process.env.BASE_URL || 'http://localhost:5173/studio';
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('input-message')).toBeVisible();

  if (process.env.E2E_AI_KEY) {
    await page.getByTestId('tab-keys').click();
    await page.getByTestId('input-api-key').fill(process.env.E2E_AI_KEY);
    await page.getByTestId('button-add-key').click();
    await expect(page.locator('[data-testid^="card-key-"]')).not.toHaveCount(0, { timeout: 60_000 });
    await page.getByTestId('tab-preview').click();
    await expect(page.getByTestId('input-message')).toBeVisible();
  }

  const appRequest = [
    'Build a polished personal finance dashboard called Pennywise.',
    'It must have an interactive Add Transaction form with amount, description, category, and income/expense type.',
    'Saving a transaction must immediately update the balance, totals, and transaction list, and persist after refreshing the preview.',
    'Include useful sample transactions, category filters, responsive styling, and working form validation.',
    'Use local browser storage; no external backend is needed for this test.',
  ].join(' ');

  await page.getByTestId('input-message').fill(appRequest);
  await page.getByTestId('button-send').click();

  const brief = page.getByTestId('card-brief').first();
  const questions = page.getByTestId('card-questions').first();
  const assistantError = page.getByTestId('assistant-error').first();
  await expect.poll(async () => {
    if (await brief.count()) return 'brief';
    if (await questions.count()) return 'questions';
    if (await assistantError.count()) return 'error';
    return 'waiting';
  }, { timeout: 180_000, message: 'Talker should ask clarifying questions or propose an approved brief' }).not.toBe('waiting');

  if (await assistantError.count()) {
    const response = await assistantError.innerText();
    await page.screenshot({ path: 'tests/artifacts/builder-blocked.png', fullPage: true });
    fs.writeFileSync(
      path.join('tests/artifacts', 'builder-result.txt'),
      `${response}\n\n${logs.join('\n')}`,
    );
    if (/Missing Turnstile token/i.test(response)) {
      test.skip(true, 'Free starter is blocked by upstream browser verification; add a provider key to run the real builder flow.');
    }
    throw new Error(`The build request failed before the brief: ${response}`);
  }

  if (await questions.count()) {
    await page.getByTestId('button-you-decide').first().click();
    await expect(brief).toBeVisible({ timeout: 180_000 });
  }

  if (!(await brief.count())) {
    const body = await page.locator('body').innerText();
    await page.screenshot({ path: 'tests/artifacts/builder-no-brief.png', fullPage: true });
    throw new Error(`Talker did not produce a build brief. Visible response: ${body.slice(-2500)}`);
  }

  await page.screenshot({ path: 'tests/artifacts/builder-brief.png', fullPage: true });
  await page.getByTestId('button-build-it').first().click();
  await expect(page.getByTestId('agent-talker').filter({ hasText: 'Done' })).toBeVisible({ timeout: 8 * 60 * 1000 });

  await page.screenshot({ path: 'tests/artifacts/builder-complete.png', fullPage: true });

  const frame = page.frameLocator('[data-testid="iframe-preview"]');
  await expect(frame.getByText(/Pennywise|Personal finance/i).first()).toBeVisible({ timeout: 60_000 });
  await frame.getByRole('button', { name: /add transaction/i }).click();
  await expect(frame.getByRole('textbox', { name: /description/i })).toBeVisible();
  await frame.getByRole('textbox', { name: /description/i }).fill('Playwright test purchase');
  await frame.getByRole('textbox', { name: /amount/i }).fill('12.50');
  const saveButton = frame.getByRole('button', { name: /save transaction|add transaction/i }).last();
  await saveButton.click();
  await expect(frame.getByText('Playwright test purchase')).toBeVisible();

  await page.getByTestId('button-refresh-preview').click();
  await expect(page.frameLocator('[data-testid="iframe-preview"]').getByText('Playwright test purchase')).toBeVisible();

  fs.writeFileSync(path.join('tests/artifacts', 'builder-console.log'), logs.join('\n'));
});
