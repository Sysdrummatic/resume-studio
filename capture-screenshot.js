const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Scroll to resume preview section
    await page.evaluate(() => {
      const el = document.querySelector('.home-resume-preview');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    
    await page.waitForTimeout(800);
    const outPath = path.join(process.cwd(), 'resume-preview-screenshot.png');
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✓ Screenshot saved: ${outPath}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
