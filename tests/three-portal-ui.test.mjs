import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const warningDemoUiSource = fs.readFileSync(new URL('../js/warning-demo-ui.mjs', import.meta.url), 'utf8');

test('enterprise portal exposes the current diagnosis rail, model probability chart, and provenance strip', () => {
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
  assert.match(html, /id="expertMechanismHeatmap"/);
  assert.match(html, /id="expertViolinChart"/);
  assert.match(html, /id="generateExpertAdvice"/);
  assert.match(html, /标准化偏离/);
  assert.doesNotMatch(html, /特征贡献/);
});

test('regulator dashboard rows grow with content instead of overlapping in Chrome', () => {
  assert.match(css, /\.regulator-grid\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /\.regulator-grid\s*\{[^}]*grid-auto-rows:\s*max-content/s);
  assert.match(css, /\.regulator-grid\s*\{[^}]*align-items:\s*start/s);
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
  assert.match(html, /真实历史数据回放/);
  assert.doesNotMatch(html, /实时数据回放/);
  assert.match(css, /body\.portal-enterprise[^}]*overflow-y:\s*auto/s);
  assert.match(css, /body\.portal-enterprise[^}]*height:\s*100%/s);
  assert.match(css, /\.replay-analysis[^}]*grid-template-columns:/s);
  assert.match(css, /replay-chart-pane #replayTrendChart[^}]*height:\s*380px/s);
});

test('current diagnosis and historical replay have distinct jobs without duplicate metric grids', () => {
  assert.match(html, /CURRENT DIAGNOSIS · 单条记录/);
  assert.match(html, /当前风险诊断/);
  assert.match(html, /当前记录 · XGBoost 风险概率/);
  assert.match(html, /HISTORY REPLAY · 全量序列/);
  assert.match(html, /id="replaySyncNotice"/);
  assert.match(html, /id="replayViewDiagnosis"/);
  assert.match(html, /id="replayReturnLive"/);
  assert.match(html, /id="replaySeek"[^>]*aria-label="历史数据回放进度"/);
  assert.doesNotMatch(html, /id="replayMetricGrid"/);
  assert.doesNotMatch(html, /id="thresholdSampleCount"|id="thresholdPeakIndex"/);
});

test('enterprise main controller owns one replay controller and authenticated replay calls', () => {
  assert.match(main, /createReplayController/);
  assert.match(main, /\/api\/roof-risk\/replay\/meta/);
  assert.match(main, /\/api\/roof-risk\/replay\/frame/);
  assert.match(main, /applyReplayFrame/);
  assert.match(main, /liveRoofRiskApiPayload/);
  assert.match(main, /replayRoofRiskApiPayload/);
  assert.match(main, /activateReplayDisplay/);
  assert.match(main, /deactivateReplayDisplay/);
  assert.match(main, /replayReturnLive/);
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

test('enterprise keeps P05 and P95 inside metric references and historical replay', () => {
  assert.match(html, /P05\/P95 统计参考偏离/);
  assert.match(html, /P05-P95 参考范围/);
  assert.doesNotMatch(html, /P95 阈值|最高阈值指数|当前超 P95/);
});

test('enterprise command surface has one primary risk score and stable evidence landmarks', () => {
  assert.match(html, /class="skip-link"[^>]*href="#threeContainer"/);
  assert.match(html, /id="enterpriseAttentionSummary"/);
  assert.match(html, /id="currentModelLevel"/);
  assert.match(html, /id="currentModelConfidence"/);
  assert.match(html, /id="modelEvidenceCount"/);
  assert.match(html, /data-metric-key="distance_to_water"/);
  assert.match(html, /class="env-state"/);
  assert.doesNotMatch(html, /id="roofWarningScore"/);
  assert.equal((html.match(/id="riskScore"/g) || []).length, 1);
});

test('enterprise attention summary distinguishes model evidence from statistical deviation', () => {
  assert.match(main, /metric\.isModelEvidence \|\| metric\.isReferenceDeviation/);
  assert.match(main, /metrics\.filter\(\(metric\) => metric\.isReferenceDeviation\)\.length/);
  assert.match(main, /模型证据/);
  assert.doesNotMatch(main, /metric\.isReferenceDeviation \|\| metric\.status !== 'safe'/);
});

test('core monitoring uses a dense rail layout rather than a grid of metric cards', () => {
  assert.match(css, /\.core-monitoring-workbench \.card-body[^}]*grid-template-columns:/s);
  assert.match(css, /\.metric-rail \.env-item[^}]*grid-template-columns:/s);
  assert.match(css, /\.metric-rail \.env-item[^}]*border-bottom:/s);
  assert.match(css, /\.attention-summary/);
});

test('orange warning demo exposes accessible role-specific workflow surfaces', () => {
  for (const id of [
    'warningDemoLauncher', 'warningDemoStatus', 'warningDemoRail',
    'enterpriseWarningDialog', 'enterpriseDisposalDrawer', 'enterpriseDisposalForm',
    'regulatorDemoBanner', 'regulatorVerificationPanel', 'regulatorReviewForm',
    'expertDemoEventStrip', 'expertSimilarCases', 'expertArchiveAction',
  ]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} must exist exactly once`);
  }
  assert.match(html, /id="enterpriseWarningDialog"[^>]*aria-labelledby="enterpriseWarningTitle"/);
  assert.match(html, /id="enterpriseDisposalForm"[\s\S]*?<label[^>]*for="disposalMeasures"/);
  assert.match(html, /id="disposalPhotos"[^>]*accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html, /id="regulatorReviewOpinion"/);
  assert.match(html, /id="regulatorRectificationDeadline"/);
  assert.match(html, /id="expertArchiveConclusion"/);
});

test('warning demo forms provide stable names, autofill policy, and bounded dialogs', () => {
  assert.match(html, /<form id="enterpriseDisposalForm" autocomplete="off">/);
  assert.match(html, /id="disposalMeasures" name="measures"[^>]+autocomplete="off"/);
  assert.match(html, /id="disposalPhotos" name="photos"[^>]+autocomplete="off"/);
  assert.match(html, /id="regulatorReviewOpinion" name="reviewOpinion"[^>]+autocomplete="off"/);
  assert.match(html, /id="expertArchiveConclusion" name="archiveConclusion"[^>]+autocomplete="off"/);
  assert.match(css, /\.warning-demo-dialog,[\s\S]*?overscroll-behavior:\s*contain/);
  assert.match(warningDemoUiSource, /image\.width = 160;[\s\S]*?image\.height = 120;[\s\S]*?image\.loading = 'lazy';/);
});

test('warning demo layout is bounded, in-flow for analysis, and does not resize Three.js', () => {
  assert.match(css, /\.warning-demo-strip\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /\.warning-demo-dialog\s*\{[^}]*max-height:\s*min\(/s);
  assert.match(css, /\.warning-demo-drawer\s*\{[^}]*width:\s*min\(/s);
  assert.match(css, /\.regulator-verification-panel\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.expert-demo-event\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(css, /(?:linear|radial|conic|repeating-linear)-gradient\(/);
});
