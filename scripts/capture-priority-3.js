const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

async function capturePriority3() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Bills List Mobile (390px)
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/bills`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bills-mobile-390.png'), fullPage: true });
  console.log('✓ bills-mobile-390.png');

  // 2. Click "Add Payment" on RS 08 to show modal on mobile
  const addPayButtons = await page.$$('button');
  for (const btn of addPayButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Add Payment')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bills-add-payment-modal.png'), fullPage: false });
      console.log('✓ bills-add-payment-modal.png');
      break;
    }
  }
  await page.close();

  // 3. Bills List Desktop
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/bills`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Expand payment drawer on RS 07 (which has part payments)
  const paymentsButtons = await page.$$('button');
  for (const btn of paymentsButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Payments')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      break;
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'bills-desktop.png'), fullPage: true });
  console.log('✓ bills-desktop.png');
  await page.close();

  // 4. Dev preview updated
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'), fullPage: false });
  console.log('✓ dev-preview-wide.png');
  await page.close();

  await browser.close();
  console.log('Priority 3 screenshots completed!');
}

capturePriority3().catch(console.error);
