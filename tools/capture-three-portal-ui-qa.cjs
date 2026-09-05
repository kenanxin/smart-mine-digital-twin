const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp = require('C:/Users/欣/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const baseUrl = process.argv[2] || 'http://127.0.0.1:8092';
const outputDir = path.resolve(process.argv[3] || 'tools/.generated/three-portal-ui');
const accounts = [
  { role: 'enterprise', username: 'enterprise_operator', password: process.env.ENTERPRISE_QA_PASSWORD || 'Mine@2026', charts: ['thresholdTrendChart'] },
  { role: 'regulator', username: 'regulator_officer', password: process.env.REGULATOR_QA_PASSWORD || 'Safe@2026', charts: ['regulatorDistributionChart'] },
  { role: 'expert', username: 'expert_analyst', password: process.env.EXPERT_QA_PASSWORD || 'Model@2026', charts: ['expertProbabilityChart', 'expertDeviationChart', 'expertHistoryChart'] },
];

async function login(page, account) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(account.username);
  await page.locator('#password').fill(account.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith('/login'), { waitUntil: 'domcontentloaded', timeout: 30_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function inspectRole(browser, account, viewport, suffix) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (response.status() === 401 && url.endsWith('/api/auth/session')) return;
    if (response.status() === 404 && url.endsWith('/favicon.ico')) return;
    httpErrors.push(`${response.status()} ${url}`);
  });

  await login(page, account);
  await page.waitForFunction(() => document.getElementById('apiStatusText')?.textContent === '接口在线', null, { timeout: 30_000 });
  for (const chartId of account.charts) {
    await page.waitForFunction((id) => {
      const host = document.getElementById(id);
      const canvas = host?.querySelector('canvas');
      return Boolean(canvas && host.clientWidth > 0 && host.clientHeight > 0 && canvas.width > 0 && canvas.height > 0);
    }, chartId, { timeout: 30_000 });
  }
  if (account.role === 'enterprise') {
    await page.waitForFunction(() => Boolean(document.querySelector('#threeContainer canvas')) && typeof window.__mineCameraState === 'function', null, { timeout: 45_000 });
    await page.waitForTimeout(3_000);
  }

  const beforeResize = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const canvas = document.querySelector(`#${id} canvas`);
    return [id, canvas ? [canvas.width, canvas.height] : null];
  })), account.charts);
  await page.evaluate((ids) => ids.forEach((id) => {
    const host = document.getElementById(id);
    if (host) host.style.width = '82%';
  }), account.charts);
  await page.waitForTimeout(350);
  const afterResize = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const canvas = document.querySelector(`#${id} canvas`);
    return [id, canvas ? [canvas.width, canvas.height] : null];
  })), account.charts);
  await page.evaluate((ids) => ids.forEach((id) => {
    const host = document.getElementById(id);
    if (host) host.style.width = '';
  }), account.charts);
  await page.waitForTimeout(200);

  const layout = await page.evaluate((ids) => ({
    viewport: [document.documentElement.clientWidth, document.documentElement.clientHeight],
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    charts: Object.fromEntries(ids.map((id) => {
      const host = document.getElementById(id);
      return [id, host ? [host.clientWidth, host.clientHeight] : null];
    })),
    scene: (() => {
      const canvas = document.querySelector('#threeContainer canvas');
      return canvas ? [canvas.width, canvas.height] : null;
    })(),
  }), account.charts);

  const screenshot = path.join(outputDir, `${account.role}-${suffix}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  let scenePixels = null;
  if (account.role === 'enterprise') {
    const sceneScreenshot = path.join(outputDir, `${account.role}-${suffix}-scene.png`);
    await page.locator('#threeContainer').screenshot({ path: sceneScreenshot });
    const stats = await sharp(sceneScreenshot).stats();
    scenePixels = {
      screenshot: sceneScreenshot,
      mean: stats.channels.slice(0, 3).map((channel) => Number(channel.mean.toFixed(2))),
      stdev: stats.channels.slice(0, 3).map((channel) => Number(channel.stdev.toFixed(2))),
    };
  }
  await context.close();

  return {
    role: account.role,
    viewport,
    screenshot,
    layout,
    scenePixels,
    resized: account.charts.every((id) => JSON.stringify(beforeResize[id]) !== JSON.stringify(afterResize[id])),
    consoleErrors,
    pageErrors,
    failedRequests,
    httpErrors,
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-gpu-driver-bug-workarounds'],
    proxy: { server: process.env.THREE_PORTAL_QA_PROXY || 'http://127.0.0.1:7897', bypass: '127.0.0.1,localhost' },
  });
  try {
    const results = [];
    for (const account of accounts) {
      results.push(await inspectRole(browser, account, { width: 1440, height: 900 }, 'desktop'));
      results.push(await inspectRole(browser, account, { width: 390, height: 844 }, 'mobile'));
    }
    const failures = results.flatMap((result) => {
      const overflow = Math.max(result.layout.documentWidth, result.layout.bodyWidth) > result.layout.viewport[0] + 1;
      const issues = [];
      if (overflow) issues.push('horizontal overflow');
      if (!result.resized) issues.push('chart did not resize');
      if (result.scenePixels && Math.max(...result.scenePixels.stdev) < 12) issues.push('Three.js canvas pixel variance is too low');
      const unexpectedConsoleErrors = result.consoleErrors.filter((message) => !message.startsWith('Failed to load resource:'));
      if (unexpectedConsoleErrors.length) issues.push(`console errors: ${unexpectedConsoleErrors.join(' | ')}`);
      if (result.pageErrors.length) issues.push(`page errors: ${result.pageErrors.join(' | ')}`);
      if (result.failedRequests.length) issues.push(`failed requests: ${result.failedRequests.join(' | ')}`);
      if (result.httpErrors.length) issues.push(`HTTP errors: ${result.httpErrors.join(' | ')}`);
      return issues.map((issue) => `${result.role} ${result.viewport.width}px: ${issue}`);
    });
    fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify(results, null, 2));
    if (failures.length) throw new Error(failures.join('\n'));
    console.log(JSON.stringify({ outputDir, cases: results.length, status: 'PASS' }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
