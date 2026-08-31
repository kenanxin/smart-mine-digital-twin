const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const outputDir = process.argv[2] || 'D:/矿业/重排截图/roof-stage-qa-current';
const baseUrl = process.argv[3] || 'http://localhost:8080/';

const shots = [
  ['support-risk', 'supportResistanceAlarm', 'risk'],
  ['fall-risk', 'roofFallWarning', 'risk'],
];

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: false,
    args: ['--disable-session-crashed-bubble'],
  });
  const page = await browser.newPage({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20000);

  for (const [name, stage, field] of shots) {
    const url = `${baseUrl}?scene=v2&view=underground&stage=${stage}&field=${field}&rev=inspection-view`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__roofDemoStage === 'function' && typeof window.__mineCameraState === 'function', null, { timeout: 36000 });
    const expected = await page.evaluate((stageId) => window.__roofDemoStage?.(stageId)?.focusResult?.preset ?? null, stage);
    await page.waitForFunction((preset) => {
      const cam = window.__mineCameraState?.();
      return Boolean(preset && cam
        && Math.abs(cam.position[0] - preset.position[0]) < 0.3
        && Math.abs(cam.position[1] - preset.position[1]) < 0.3
        && Math.abs(cam.position[2] - preset.position[2]) < 0.3);
    }, expected, { timeout: 36000 });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
  }

  await browser.close();
  console.log(outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
