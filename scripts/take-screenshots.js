const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://127.0.0.1:3000';

const pages = [
  { path: '/', name: 'home' },
  { path: '/new-bill', name: 'new-bill' },
  { path: '/bills', name: 'bills' },
  { path: '/expenses', name: 'expenses' },
  { path: '/contractors', name: 'contractors' },
  { path: '/settings', name: 'settings' },
  { path: '/dev-preview', name: 'dev-preview' },
];

const viewports = [
  { width: 390, height: 844, label: 'mobile-390' },
  { width: 1280, height: 900, label: 'desktop' },
];

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const page of pages) {
    for (const vp of viewports) {
      if (page.name === 'dev-preview' && vp.label.startsWith('mobile')) continue;

      const tab = await browser.newPage();
      await tab.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      try {
        await tab.goto(`${BASE_URL}${page.path}`, { waitUntil: 'load', timeout: 20000 });
        await new Promise(r => setTimeout(r, 600));

        const filename = `${page.name}-${vp.label}.png`;
        await tab.screenshot({
          path: path.join(SCREENSHOTS_DIR, filename),
          fullPage: page.name !== 'dev-preview',
        });
        console.log(`✓ ${filename}`);
      } catch (err) {
        console.error(`Error on ${page.path} (${vp.label}):`, err.message);
      } finally {
        await tab.close();
      }
    }
  }

  // dev-preview wide
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await tab.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'load', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1000));
  await tab.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'),
    fullPage: false,
  });
  console.log('✓ dev-preview-wide.png');
  await tab.close();

  await browser.close();
  console.log('\nAll screenshots saved to /screenshots/');
}

takeScreenshots().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
