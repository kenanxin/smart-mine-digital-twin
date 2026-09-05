import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const charts = fs.readFileSync(new URL('../js/charts.js', import.meta.url), 'utf8');

test('charts use a shared theme, rich-text tooltips, time axes, and container resize observation', () => {
  assert.match(charts, /registerTheme\(['"]smartMineIndustrial['"]/);
  assert.match(charts, /renderMode:\s*['"]richText['"]/);
  assert.match(charts, /type:\s*['"]time['"]/);
  assert.match(charts, /new ResizeObserver/);
  assert.match(charts, /getInstanceByDom/);
  assert.match(charts, /\.disconnect\(\)/);
  assert.match(charts, /\.dispose\(\)/);
});

test('charts expose the four role-focused containers and contain no legacy simulated fixtures', () => {
  for (const id of [
    'thresholdTrendChart',
    'regulatorDistributionChart',
    'expertProbabilityChart',
    'expertDeviationChart',
  ]) assert.match(charts, new RegExp(id));

  assert.doesNotMatch(charts, /buildRiskTrend/);
  assert.doesNotMatch(charts, /7\/10|7\/11|预警次数|Array\.from\(\{ length: 12 \}/);
  assert.doesNotMatch(charts, /LinearGradient/);
});

test('chart data updates are built from the RoofRisk chart model', () => {
  assert.match(charts, /buildRoofRiskChartModel/);
  assert.match(charts, /updateRoofRiskCharts/);
  assert.match(charts, /dataset:/);
  assert.match(charts, /sampling:\s*['"]lttb['"]/);
  assert.match(charts, /replayTrendChart/);
  assert.match(charts, /updateReplayChart/);
  assert.match(charts, /dataZoom:/);
});
