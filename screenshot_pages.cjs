const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const pages = [
    { name: 'rapports', navText: 'Rapports' },
    { name: 'ventes', navText: 'Ventes' },
    { name: 'stock', navText: 'Stock' },
    { name: 'finances', navText: 'Finances' },
    { name: 'marche', navText: 'Marché' },
    { name: 'fournisseurs', navText: 'Achats' },
  ];

  const p = await browser.newPage();
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto('http://localhost:5173');
  await p.evaluate(() => localStorage.setItem('pap_session', JSON.stringify({ role: 'admin' })));
  await p.reload();
  await p.waitForTimeout(3000);

  for (const { name, navText } of pages) {
    const buttons = await p.$$('nav button, aside button');
    for (const btn of buttons) {
      const txt = await btn.textContent();
      if (txt && txt.trim() === navText) {
        await btn.click();
        break;
      }
    }
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `/tmp/after_${name}.png` });
    console.log(`Screenshot: ${name}`);
  }

  await browser.close();
  console.log('All done');
})().catch(e => { console.error(e.message); process.exit(1); });
