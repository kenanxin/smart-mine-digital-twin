const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const outputPath = path.resolve(process.argv[2] || 'tools/.generated/project-roadway-source.png');
const debugPath = path.join(path.dirname(outputPath), 'capture-project-roadway.log');
const baseUrl = new URL(process.argv[3] || 'http://localhost:8080/');
const username = process.env.ROADWAY_CAPTURE_USERNAME;
const password = process.env.ROADWAY_CAPTURE_PASSWORD;
const proxyServer = process.env.ROADWAY_CAPTURE_PROXY || 'http://127.0.0.1:7897';

if (!username || !password) {
  throw new Error('ROADWAY_CAPTURE_USERNAME and ROADWAY_CAPTURE_PASSWORD are required');
}

function trace(message) {
  fs.mkdirSync(path.dirname(debugPath), { recursive: true });
  fs.appendFileSync(debugPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
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
  fs.writeFileSync(debugPath, '', 'utf8');
  trace('launch browser');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-gpu-driver-bug-workarounds'],
    proxy: { server: proxyServer, bypass: '127.0.0.1,localhost' },
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    page.on('console', message => trace(`console ${message.type()}: ${message.text()}`));
    page.on('pageerror', error => trace(`pageerror: ${error.message}`));
    page.on('requestfailed', request => trace(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`));
    trace('browser page ready');
    page.setDefaultTimeout(40_000);
    await login(page);
    trace('login complete');
    const sceneUrl = new URL('/?scene=v2&view=underground&field=risk&portal=enterprise&capture=roadway', baseUrl);
    await page.goto(sceneUrl.href, { waitUntil: 'domcontentloaded' });
    trace(`scene document loaded: ${page.url()}`);
    await page.waitForFunction(() => typeof window.__mineCameraState === 'function');
    trace('scene runtime ready');
    await page.waitForFunction(() => Boolean(document.querySelector('#threeContainer canvas')));
    trace('canvas ready');

    await page.addStyleTag({ content: `
      html, body { width: 1600px !important; height: 1000px !important; margin: 0 !important; overflow: hidden !important; background: #05080a !important; }
      body > .header, body > .disaster-toolbar, body > footer,
      .panel-left, .panel-right, .scene-overlay-top, .roof-field-panel,
      .roof-warning-card, .view-toggle, .scene-overlay-bottom, .scene-tips,
      .mine-v2-label { display: none !important; }
      .main-container { display: block !important; width: 1600px !important; height: 1000px !important; margin: 0 !important; padding: 0 !important; }
      #threeContainer { position: relative !important; display: block !important; width: 1600px !important; height: 1000px !important; min-height: 1000px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; overflow: hidden !important; }
      #threeContainer canvas { width: 1600px !important; height: 1000px !important; display: block !important; }
    ` });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#threeContainer canvas');
      return canvas?.width >= 1500 && canvas?.height >= 900;
    });
    await page.waitForTimeout(3_500);
    trace('capture layout settled');

    const canvasStats = await page.locator('#threeContainer canvas').evaluate(canvas => {
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return { width: canvas.width, height: canvas.height, hasContext: Boolean(context) };
    });
    if (!canvasStats.hasContext || canvasStats.width < 1000 || canvasStats.height < 600) {
      throw new Error(`Three.js canvas is not ready: ${JSON.stringify(canvasStats)}`);
    }

    await page.locator('#threeContainer').screenshot({ path: outputPath, type: 'png' });
    trace('screenshot saved');
    console.log(outputPath);
  } finally {
    trace('close browser');
    await browser.close();
  }
}

main().catch(error => {
  trace(`error: ${error.stack || error.message}`);
  console.error(error);
  process.exit(1);
});
