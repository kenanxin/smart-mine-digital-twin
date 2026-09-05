const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const outputPath = path.resolve(process.argv[2] || 'images/login-underground.jpg');
const baseUrl = new URL(process.argv[3] || 'http://localhost:8092/');
const username = process.env.LOGIN_CAPTURE_USERNAME;
const password = process.env.LOGIN_CAPTURE_PASSWORD;
const proxyServer = process.env.LOGIN_CAPTURE_PROXY || 'http://127.0.0.1:7897';

if (!username || !password) {
  throw new Error('LOGIN_CAPTURE_USERNAME and LOGIN_CAPTURE_PASSWORD are required');
}

async function login(page) {
  await page.goto(new URL('/login', baseUrl).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20_000, waitUntil: 'domcontentloaded' }),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-gpu-driver-bug-workarounds'],
    proxy: { server: proxyServer, bypass: '127.0.0.1,localhost' },
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(40_000);
    await login(page);

    const sceneUrl = new URL('/?scene=v2&view=underground&portal=enterprise&capture=login-background', baseUrl);
    await page.goto(sceneUrl.href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__mineCameraState === 'function');
    await page.waitForFunction(() => Boolean(document.querySelector('#threeContainer canvas')));

    await page.evaluate(async () => {
      const { setRoofFieldVisible } = await import('/js/scene.js');
      setRoofFieldVisible(false);
      window.__roofDemoStage?.('normalMonitor');
    });
    await page.addStyleTag({ content: `
      html, body { width: 1600px !important; height: 1000px !important; margin: 0 !important; overflow: hidden !important; background: #05080a !important; }
      body > .header, body > .disaster-toolbar, body > footer,
      .panel-left, .panel-right, .scene-overlay-top, .roof-field-panel,
      .roof-warning-card, .view-toggle, .scene-overlay-bottom, .scene-tips,
      .mine-v2-label, #threeContainer > div { display: none !important; }
      .main-container { display: block !important; width: 1600px !important; height: 1000px !important; margin: 0 !important; padding: 0 !important; }
      #threeContainer { position: relative !important; display: block !important; width: 1600px !important; height: 1000px !important; min-height: 1000px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; overflow: hidden !important; }
      #threeContainer canvas { width: 1600px !important; height: 1000px !important; display: block !important; }
    ` });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#threeContainer canvas');
      return canvas?.width >= 1500 && canvas?.height >= 900;
    });
    await page.waitForTimeout(4_000);

    await page.locator('#threeContainer').screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 92,
    });
    console.log(outputPath);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
