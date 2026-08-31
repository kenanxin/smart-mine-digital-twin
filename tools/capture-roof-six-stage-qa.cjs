const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const outputDir = process.argv[2] || 'D:/矿业/重排截图/roof-six-stage-qa-current';
const baseUrl = process.argv[3] || 'http://localhost:8080/';

const shots = [
  ['01-normal-stress', 'normalMonitor', 'stress'],
  ['02-pressure-stress', 'roofPressureRise', 'stress'],
  ['03-separation-displacement', 'roofSeparationAlarm', 'displacement'],
  ['04-support-risk', 'supportResistanceAlarm', 'risk'],
  ['05-fall-risk', 'roofFallWarning', 'risk'],
  ['06-emergency-risk', 'emergencyResponse', 'risk'],
];

async function waitForStageReady(page, stage) {
  await page.waitForFunction(() => typeof window.__roofDemoStage === 'function' && typeof window.__mineCameraState === 'function', null, { timeout: 36000 });
  const expected = await page.evaluate((stageId) => window.__roofDemoStage(stageId)?.focusResult?.preset ?? null, stage);
  if (!expected) {
    await page.waitForTimeout(3200);
    return;
  }
  if (expected.position) {
    await page.waitForFunction((preset) => {
      const cam = window.__mineCameraState?.();
      return Boolean(cam
        && Math.abs(cam.position[0] - preset.position[0]) < 0.35
        && Math.abs(cam.position[1] - preset.position[1]) < 0.35
        && Math.abs(cam.position[2] - preset.position[2]) < 0.35);
    }, expected, { timeout: 36000 });
  } else {
    await page.waitForTimeout(3200);
  }
}

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
    const url = `${baseUrl}?scene=v2&view=underground&stage=${stage}&field=${field}&rev=six-stage-qa`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitForStageReady(page, stage);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
  }

  await browser.close();
  console.log(outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
