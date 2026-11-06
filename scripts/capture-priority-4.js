const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

async function capturePriority4() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Contractors Directory Mobile
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/contractors`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contractors-mobile-390.png'), fullPage: true });
  console.log('✓ contractors-mobile-390.png');

  // 2. Open Record Work Bill modal
  const workButtons = await page.$$('button');
  for (const btn of workButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Work Bill')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contractor-record-bill-modal.png'), fullPage: false });
      console.log('✓ contractor-record-bill-modal.png');
      break;
    }
  }

  // Close modal by clicking X
  const closeBtn = await page.$('button[type="button"]');
  await page.reload({ waitUntil: 'networkidle0' });

  // 3. Open Ledger for Rajesh Kumar
  const ledgerButtons = await page.$$('button');
  for (const btn of ledgerButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Ledger History')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contractor-ledger-mobile.png'), fullPage: true });
      console.log('✓ contractor-ledger-mobile.png');
      break;
    }
  }
  await page.close();

  // 4. Contractors Directory Desktop
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/contractors`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contractors-desktop.png'), fullPage: true });
  console.log('✓ contractors-desktop.png');

  // Open Ledger on desktop
  const dtLedgerButtons = await page.$$('button');
  for (const btn of dtLedgerButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Ledger History')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contractor-ledger-desktop.png'), fullPage: true });
      console.log('✓ contractor-ledger-desktop.png');
      break;
    }
  }
  await page.close();

  // 5. Dev preview updated
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'), fullPage: false });
  console.log('✓ dev-preview-wide.png');
  await page.close();

  await browser.close();
  console.log('Priority 4 screenshots completed!');
}

capturePriority4().catch(console.error);
