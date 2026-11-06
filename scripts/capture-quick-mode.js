const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

async function captureNewBillQuickMode() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Mobile (390px) Quick Fill view
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'new-bill-quick-mobile.png'), fullPage: true });
  console.log('✓ new-bill-quick-mobile.png');

  // 2. Desktop Quick Fill + Live Letterhead view
  await page.setViewport({ width: 1366, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'new-bill-quick-desktop.png'), fullPage: true });
  console.log('✓ new-bill-quick-desktop.png');

  await page.close();
  await browser.close();
}

captureNewBillQuickMode().catch(console.error);
