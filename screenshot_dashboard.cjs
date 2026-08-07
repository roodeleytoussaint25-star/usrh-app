const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const p = await browser.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('http://localhost:5173');
  await p.evaluate(() => localStorage.setItem('pap_session', JSON.stringify({ role: 'admin' })));
  await p.reload();
  await p.waitForTimeout(4000);
  await p.screenshot({ path: '/tmp/dash_mobile.png', fullPage: true });
  console.log('done');
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
