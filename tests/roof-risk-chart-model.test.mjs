import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRoofRiskChartModel } from '../js/roof-risk-chart-model.mjs';

const schema = [
  { key: 'roof_separation_rate', label: '顶板离层速率', unit: 'mm/d', p05: 1, p95: 3 },
  { key: 'support_resistance', label: '支架阻力', unit: 'MPa', p05: 0.4, p95: 0.8 },
  { key: 'microseismic_energy', label: '微震能量', unit: 'J', p05: 40, p95: 400 },
  { key: 'distance_to_water', label: '距水体/岩溶体距离', unit: 'm', p05: 20, p95: 120 },
  { key: 'data_quality', label: '数据质量', unit: null, categories: ['正常'] },
];

const current = {
  feature_schema: schema,
  metrics: {
    roof_separation_rate: { value: 4, unit: 'mm/d', status: 'danger' },
    support_resistance: { value: 0.6, unit: 'MPa', status: 'safe' },
    microseismic_energy: { value: 600, unit: 'J', status: 'danger' },
    distance_to_water: { value: 10, unit: 'm', status: 'danger' },
    data_quality: { value: '正常', unit: null, status: 'safe' },
  },
  model_output: {
    probabilities: { low: 0.001, general: 0.002, major: 0.007, severe: 0.99 },
  },
  feature_evidence: [
    { key: 'microseismic_energy', label: '微震能量', value: 600, unit: 'J', standardized_value: 3.25 },
    { key: 'roof_separation_rate', label: '顶板离层速率', value: 4, unit: 'mm/d', standardized_value: -2.1 },
  ],
};

const history = {
  feature_schema: schema,
  points: [
    {
      timestamp: '2025/11/8 14:20',
      metrics: {
        roof_separation_rate: { value: 2, unit: 'mm/d' },
        support_resistance: { value: 0.4, unit: 'MPa' },
        microseismic_energy: { value: 200, unit: 'J' },
        distance_to_water: { value: 120, unit: 'm' },
      },
    },
    {
      timestamp: '2025/11/8 14:22',
      metrics: {
        roof_separation_rate: { value: 4, unit: 'mm/d' },
        support_resistance: { value: 0.6, unit: 'MPa' },
        microseismic_energy: { value: 600, unit: 'J' },
        distance_to_water: { value: 10, unit: 'm' },
      },
    },
  ],
};

const events = {
  events: [
    { risk_level: 'red' },
    { risk_level: 'red' },
    { risk_level: 'yellow' },
    { risk_level: 'green' },
  ],
};

test('builds direction-aware statistical reference trends with raw evidence', () => {
  const model = buildRoofRiskChartModel(current, history, events);
  assert.equal(model.thresholdTrend.series.length, 4);
  assert.equal(model.thresholdTrend.series[0].label, '顶板离层速率');
  assert.equal(model.thresholdTrend.series[0].points[0].index, 50);
  assert.equal(model.thresholdTrend.series[0].points[1].index, 150);
  assert.equal(model.thresholdTrend.series[0].points[1].rawValue, 4);
  assert.equal(model.thresholdTrend.series[0].points[1].unit, 'mm/d');
  assert.equal(model.thresholdTrend.series[0].points[1].p05, 1);
  assert.equal(model.thresholdTrend.series[0].points[1].p95, 3);
  assert.equal(model.thresholdTrend.series[0].direction, 'high');
  const distance = model.thresholdTrend.series.find((item) => item.key === 'distance_to_water');
  assert.equal(distance.direction, 'low');
  assert.deepEqual(distance.points.map((point) => point.index), [0, 110]);
  assert.equal(distance.points[1].deviated, true);
  assert.ok(Number.isFinite(model.thresholdTrend.series[0].points[0].timestamp));
  assert.ok(model.thresholdTrend.series[0].points[0].timestamp < model.thresholdTrend.series[0].points[1].timestamp);
  assert.equal(model.thresholdTrend.mode, 'reference-deviation');
  assert.equal(model.thresholdTrend.sampleCount, 2);
  assert.equal(model.thresholdTrend.exceededCount, 3);
  assert.equal(model.thresholdTrend.peakIndex, 155.6);
});

test('omits metrics whose statistical reference range is unavailable', () => {
  const model = buildRoofRiskChartModel({
    feature_schema: [{ key: 'bad', label: '无效指标', unit: 'kN', p05: 5, p95: 5 }],
  }, {
    points: [{ timestamp: '2025/11/8 14:20', metrics: { bad: { value: 5, unit: 'kN' } } }],
  }, events);
  assert.equal(model.thresholdTrend.mode, 'empty');
  assert.deepEqual(model.thresholdTrend.series, []);
});

test('falls back to truthful risk-score history when an older API omits metric history', () => {
  const model = buildRoofRiskChartModel(current, {
    points: [
      { timestamp: '2025/11/8 14:20', score: 62 },
      { timestamp: '2025/11/8 14:22', score: 95 },
    ],
  }, events);
  assert.equal(model.thresholdTrend.mode, 'risk-score');
  assert.equal(model.thresholdTrend.series.length, 1);
  assert.equal(model.thresholdTrend.series[0].label, '综合风险分');
  assert.deepEqual(model.thresholdTrend.series[0].points.map((point) => point.rawValue), [62, 95]);
});

test('orders four-class probabilities from low to severe without rounding away detail', () => {
  const model = buildRoofRiskChartModel(current, history, events);
  assert.deepEqual(model.probabilities.map((item) => item.label), ['低风险', '一般风险', '较大风险', '重大风险']);
  assert.deepEqual(model.probabilities.map((item) => item.percent), [0.1, 0.2, 0.7, 99]);
});

test('labels evidence as standardized deviation rather than feature contribution', () => {
  const model = buildRoofRiskChartModel(current, history, events);
  assert.deepEqual(model.deviations, [
    { key: 'microseismic_energy', label: '微震能量', deviation: 3.25, rawValue: 600, unit: 'J' },
    { key: 'roof_separation_rate', label: '顶板离层速率', deviation: -2.1, rawValue: 4, unit: 'mm/d' },
  ]);
  assert.equal(JSON.stringify(model.deviations).includes('contribution'), false);
});

test('counts regulator risk levels in the fixed operational order', () => {
  const model = buildRoofRiskChartModel(current, history, events);
  assert.deepEqual(model.distribution, [
    { key: 'red', label: '重大风险', count: 2, percent: 50 },
    { key: 'orange', label: '较大风险', count: 0, percent: 0 },
    { key: 'yellow', label: '一般风险', count: 1, percent: 25 },
    { key: 'green', label: '低风险', count: 1, percent: 25 },
  ]);
});
