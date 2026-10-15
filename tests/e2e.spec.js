const { test, expect } = require('@playwright/test');
const fs = require('fs');

test.describe('Kuro-chan studio smoke', () => {
  test('loads /studio and captures console output and screenshot', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      logs.push(text);
    });

    // Navigate to the studio route
    const url = process.env.BASE_URL || 'http://localhost:5173/studio';
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for main UI shell to render
    await page.waitForSelector('body');

    // Give the app a little extra time to initialize client-side scripts
    await page.waitForTimeout(1500);

    // Save a screenshot
    const outDir = 'tests/artifacts';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: `${outDir}/studio-load.png`, fullPage: true });

    // Write console logs
    fs.writeFileSync(`${outDir}/console.log`, logs.join('\n'));

    // Basic smoke assertions: page has loaded and screenshot produced
    expect(fs.existsSync(`${outDir}/studio-load.png`)).toBeTruthy();
  });
});
