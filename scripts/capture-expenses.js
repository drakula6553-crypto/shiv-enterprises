const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://127.0.0.1:3000';

async function captureExpenses() {
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Mobile (390px) Expenses list
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/expenses`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-mobile-390.png'), fullPage: true });
  console.log('✓ expenses-mobile-390.png');

  // 2. Open Record Purchase modal on mobile
  const addBtn = await page.$('button');
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text && text.includes('Record Purchase')) {
      await b.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-add-modal.png'), fullPage: false });
      console.log('✓ expenses-add-modal.png');
      break;
    }
  }
  await page.close();

  // 3. Desktop Expenses list
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/expenses`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expenses-desktop.png'), fullPage: true });
  console.log('✓ expenses-desktop.png');
  await page.close();

  // 4. Updated Home page Mobile
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'home-mobile-390.png'), fullPage: true });
  console.log('✓ home-mobile-390.png');
  await page.close();

  // 5. Dev preview updated with 6 tabs
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/dev-preview`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dev-preview-wide.png'), fullPage: false });
  console.log('✓ dev-preview-wide.png');
  await page.close();

  await browser.close();
  console.log('Expenses screenshots completed!');
}

captureExpenses().catch(console.error);
