import { chromium } from '/tmp/browser-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const variant = process.argv[2];
const app = spawn('npm', ['run', 'start'], { env: { ...process.env, PORT: '3000' }, stdio: 'inherit' });
let browser;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch('http://localhost:3000')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ headless: true });
  await mkdir('screenshots', { recursive: true });
  const report = [];
  for (const [device, width, height] of [['desktop', 1280, 900], ['mobile', 375, 812]]) {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme });
      const hydrationErrors = [];
      page.on('console', message => { if (/hydration|did not match|server rendered/i.test(message.text()) && message.type() === 'error') hydrationErrors.push(message.text()); });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      if (device === 'mobile') await page.getByRole('button', { name: 'Toggle navigation' }).click();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width) throw new Error(`Horizontal overflow: ${variant}/${device}/${colorScheme}: ${scrollWidth}`);
      if (hydrationErrors.length) throw new Error(hydrationErrors.join('\n'));
      await page.screenshot({ path: `screenshots/${variant}-${device}-${colorScheme}.png`, fullPage: true });
      report.push({ variant, device, width, colorScheme, scrollWidth, hydrationErrors });
      await page.close();
    }
  }
  await writeFile(`screenshots/report-${variant}.json`, JSON.stringify(report, null, 2));
  console.log(`Screenshots and hydration/overflow checks passed: ${variant}`);
} finally {
  await browser?.close();
  app.kill('SIGTERM');
}
