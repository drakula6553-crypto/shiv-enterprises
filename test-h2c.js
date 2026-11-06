const puppeteer = require('puppeteer');

async function testHtml2Canvas() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto('http://127.0.0.1:3000/new-bill', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById('invoice-printable-area');
      if (!el) return { error: 'Element #invoice-printable-area not found' };
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: true,
      });
      return { success: true, width: canvas.width, height: canvas.height };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });

  console.log('EVAL RESULT:', JSON.stringify(result, null, 2));
  await browser.close();
}

testHtml2Canvas().catch(console.error);
