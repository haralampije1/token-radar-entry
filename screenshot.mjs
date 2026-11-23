import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

async function takeScreenshots() {
  const outDir = join(process.cwd(), 'out');
  const shotsDir = join(process.cwd(), 'screenshots');
  mkdirSync(shotsDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set viewport for screenshots (long side at most 1440, short side at least 800)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // Load the dashboard
  const fileUrl = 'file://' + join(outDir, 'dashboard', 'index.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait for data to load and render
  await page.waitForFunction(() => window.RADAR && document.querySelector('#board .shell'));
  await new Promise(r => setTimeout(r, 500));

  // 1. Board view (default) - viewport screenshot, not fullPage
  await page.screenshot({
    path: join(shotsDir, '1-board.png'),
    fullPage: false,
    type: 'png'
  });
  console.log('Saved 1-board.png');

  // 2. Detail view - click first row
  await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr');
    if (rows[0]) rows[0].click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: join(shotsDir, '2-detail.png'),
    fullPage: false,
    type: 'png'
  });
  console.log('Saved 2-detail.png');

  // 3. Filtered view - search for something
  await page.evaluate(() => {
    const input = document.getElementById('q');
    if (input) {
      input.value = 'lend';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: join(shotsDir, '3-filtered.png'),
    fullPage: false,
    type: 'png'
  });
  console.log('Saved 3-filtered.png');

  await browser.close();
  console.log('All screenshots saved!');
}

takeScreenshots().catch(err => {
  console.error(err);
  process.exit(1);
});