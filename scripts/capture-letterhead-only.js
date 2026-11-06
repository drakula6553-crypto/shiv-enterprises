const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

async function captureRealLetterhead() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // Letterhead standalone screenshot at desktop width (1440px)
  let page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill?edit=inv_rs08`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const letterheadEl = await page.$('#invoice-printable-area');
  if (letterheadEl) {
    await letterheadEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'real-letterhead-replica.png') });
    console.log('✓ real-letterhead-replica.png');
  } else {
    console.log('letterhead element not found');
  }

  // Dev preview updated
  await page.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'), fullPage: false });
  console.log('✓ dev-preview-wide.png');

  await page.close();
  await browser.close();
  console.log('Completed!');
}

captureRealLetterhead().catch(err => {
  console.error(err);
  process.exit(1);
});
