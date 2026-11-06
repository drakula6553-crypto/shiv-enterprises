const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:3000';

async function captureRealLetterhead() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Open page and clear localStorage to pick up new seed data
  let page = await browser.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.close();

  // 2. Settings Mobile (390px)
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings-mobile-390.png'), fullPage: true });
  console.log('✓ settings-mobile-390.png');
  await page.close();

  // 3. Settings Desktop
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings-desktop.png'), fullPage: true });
  console.log('✓ settings-desktop.png');
  await page.close();

  // 4. New Bill Mobile (Form view)
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill?edit=inv_rs08`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'new-bill-mobile-390.png'), fullPage: true });
  console.log('✓ new-bill-mobile-390.png');

  // 5. New Bill Mobile Letterhead Sheet Modal
  const previewBtn = await page.$('button[title="Preview Letterhead"]');
  if (previewBtn) {
    await previewBtn.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'new-bill-mobile-preview.png'), fullPage: false });
    console.log('✓ new-bill-mobile-preview.png');
  }
  await page.close();

  // 6. New Bill Desktop (Side-by-side with exact letterhead replica of RS 08)
  page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill?edit=inv_rs08`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'new-bill-desktop.png'), fullPage: true });
  console.log('✓ new-bill-desktop.png');
  await page.close();

  // 7. Full Letterhead standalone screenshot for comparison with the user photo
  page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/new-bill?edit=inv_rs08`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const letterheadEl = await page.$('#invoice-printable-area');
  if (letterheadEl) {
    await letterheadEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'real-letterhead-replica.png') });
    console.log('✓ real-letterhead-replica.png');
  }
  await page.close();

  // 8. Dev preview updated
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'), fullPage: false });
  console.log('✓ dev-preview-wide.png');
  await page.close();

  await browser.close();
  console.log('All real letterhead screenshots captured!');
}

captureRealLetterhead().catch(err => {
  console.error(err);
  process.exit(1);
});
