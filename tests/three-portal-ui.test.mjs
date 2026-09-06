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

test('enterprise portal exposes an explicit real-history replay workbench', () => {
  for (const id of [
    'replayWorkbench', 'replayTrendChart', 'replaySeek', 'replayPlayPause',
    'replayPrevious', 'replayNext', 'replaySpeed', 'replayLoop',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /真实监测数据历史回放/);
  assert.doesNotMatch(html, /实时数据回放/);
  assert.match(css, /body\.portal-enterprise[^}]*overflow-y:\s*auto/s);
  assert.match(css, /body\.portal-enterprise[^}]*height:\s*100%/s);
  assert.match(css, /\.replay-analysis[^}]*grid-template-columns:/s);
  assert.match(css, /#replayTrendChart[^}]*height:\s*320px/s);
});

test('enterprise main controller owns one replay controller and authenticated replay calls', () => {
  assert.match(main, /createReplayController/);
  assert.match(main, /\/api\/roof-risk\/replay\/meta/);
  assert.match(main, /\/api\/roof-risk\/replay\/frame/);
  assert.match(main, /applyReplayFrame/);
  assert.match(main, /liveRoofRiskApiPayload/);
  assert.match(main, /replayRoofRiskApiPayload/);
  assert.match(main, /activateReplayDisplay/);
  assert.doesNotMatch(main, /await replayController\.seek\(replayMeta\.default_index\);\s*replayController\.play\(\)/s);
});

test('replay summary risk color follows the active real record level', () => {
  assert.match(main, /workbench\.dataset\.riskLevel = payload\.risk\?\.level \|\| 'green'/);
  assert.match(css, /data-risk-level="yellow"/);
  assert.match(css, /data-risk-level="orange"/);
  assert.match(css, /data-risk-level="red"/);
});

test('replay frame updates do not refocus the Three.js camera', () => {
  assert.doesNotMatch(main, /const stageId = stageIdFromApiRisk\(payload\.risk\)/);
  assert.match(css, /body\.portal-enterprise \.replay-workbench[^}]*clear:\s*both/s);
  assert.match(css, /body\.portal-enterprise \.replay-workbench[^}]*width:\s*calc\(100% - 16px\)/s);
});

test('enterprise core monitoring is a full-width section below the main scene', () => {
  assert.match(html, /id="enterpriseCoreMonitoring"/);
  assert.match(html, /id="enterpriseCoreMonitoring"[\s\S]*?id="thresholdOverview"/);
  assert.match(css, /body\.portal-enterprise \.core-monitoring-workbench[^}]*width:\s*calc\(100% - 16px\)/s);
  assert.match(css, /body\.portal-enterprise \.core-monitoring-workbench[^}]*display:\s*block/s);
});

test('enterprise uses statistical reference language instead of calling percentiles safety thresholds', () => {
  assert.match(html, /统计参考偏离趋势/);
  assert.match(html, /100% = P05\/P95 统计参考边界/);
  assert.doesNotMatch(html, /P95 阈值|最高阈值指数|当前超 P95/);
});

test('enterprise command surface has one primary risk score and stable evidence landmarks', () => {
  assert.match(html, /class="skip-link"[^>]*href="#threeContainer"/);
  assert.match(html, /id="enterpriseAttentionSummary"/);
  assert.match(html, /id="currentModelLevel"/);
  assert.match(html, /id="modelEvidenceCount"/);
  assert.match(html, /data-metric-key="distance_to_water"/);
  assert.match(html, /class="env-state"/);
  assert.doesNotMatch(html, /id="roofWarningScore"/);
  assert.equal((html.match(/id="riskScore"/g) || []).length, 1);
});

test('enterprise attention summary distinguishes model evidence from statistical deviation', () => {
  assert.match(main, /metric\.isModelEvidence \|\| metric\.isReferenceDeviation/);
  assert.match(main, /模型证据/);
  assert.doesNotMatch(main, /metric\.isReferenceDeviation \|\| metric\.status !== 'safe'/);
});

test('core monitoring uses a dense rail layout rather than a grid of metric cards', () => {
  assert.match(css, /\.core-monitoring-workbench \.card-body[^}]*grid-template-columns:/s);
  assert.match(css, /\.metric-rail \.env-item[^}]*grid-template-columns:/s);
  assert.match(css, /\.metric-rail \.env-item[^}]*border-bottom:/s);
  assert.match(css, /\.attention-summary/);
});
