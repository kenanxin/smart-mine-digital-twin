import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('enterprise portal exposes the real metric rail, trend chart, and provenance strip', () => {
  assert.match(html, /id="enterpriseMetricRail"/);
  assert.match(html, /data-metric-slot="6"/);
  assert.match(html, /id="thresholdTrendChart"/);
  assert.match(html, /id="enterpriseProvenance"/);
  assert.match(html, /id="enterpriseSourceName"/);
  assert.match(html, /id="enterpriseRecordId"/);
  assert.match(html, /id="enterpriseRecordTime"/);
  assert.match(html, /id="enterpriseDeviceId"/);
  assert.match(html, /id="enterpriseSourceHash"/);
  assert.match(html, /id="threeContainer"/);
});

test('regulator and expert portals expose role-specific chart work surfaces', () => {
  assert.match(html, /id="regulatorDistributionChart"/);
  assert.match(html, /id="regulatorEvidence"/);
  assert.match(html, /id="expertProbabilityChart"/);
  assert.match(html, /id="expertDeviationChart"/);
  assert.match(html, /id="expertHistoryChart"/);
  assert.match(html, /标准化偏离/);
  assert.doesNotMatch(html, /特征贡献/);
});

test('UI uses industrial tokens without CSS gradients and defines responsive stable chart sizes', () => {
  assert.match(css, /--telemetry-cyan:\s*#32c7d9/i);
  assert.match(css, /--risk-red:\s*#f05b5b/i);
  assert.match(css, /\.role-chart\s*\{[^}]*height:/s);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /(?:linear|radial|conic|repeating-linear)-gradient\(/);
});

test('main controller fetches current history and events then updates charts from API payloads', () => {
  assert.match(main, /authFetch\(['"]\/api\/roof-risk\/history['"]/);
  assert.match(main, /authFetch\(['"]\/api\/roof-risk\/events['"]/);
  assert.match(main, /updateRoofRiskCharts/);
  assert.match(main, /clearRoofRiskCharts/);
  assert.doesNotMatch(main, /initEnvChart|initProdChart|initAlertChart|updateCharts\(/);
});
