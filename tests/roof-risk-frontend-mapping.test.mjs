import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapRoofRiskViewModel,
  unavailableRoofRiskViewModel,
} from '../js/roof-risk-view-model.mjs';

const samplePayload = {
  data_source: 'teacher_real_csv_xgboost',
  timestamp: '2025/11/08 14:22',
  feature_schema: [
    { key: 'roof_separation_rate', label: '顶板离层速率', unit: 'mm/d', p05: 0, p95: 20 },
    { key: 'bolt_axial_force_increment', label: '锚杆轴力增量', unit: 'kN', p05: 0, p95: 40 },
    { key: 'cable_axial_force_increment', label: '锚索轴力增量', unit: 'kN', p05: 0, p95: 40 },
    { key: 'support_resistance', label: '支架阻力', unit: 'MPa', p05: 0, p95: 10 },
    { key: 'water_inflow', label: '涌水量', unit: 'm3/h', p05: 0, p95: 50 },
    { key: 'microseismic_energy', label: '微震能量', unit: 'J', p05: 0, p95: 1000 },
    { key: 'distance_to_water', label: '距水体/岩溶体距离', unit: 'm', p05: 0, p95: 130 },
    { key: 'data_quality', label: '数据质量', unit: null, categories: ['正常'] },
  ],
  metrics: {
    roof_separation_rate: { value: 12.4, model_value: 12.1, unit: 'mm/d', status: 'warning' },
    bolt_axial_force_increment: { value: 24, model_value: 23.8, unit: 'kN', status: 'safe' },
    cable_axial_force_increment: { value: 19, model_value: 18.9, unit: 'kN', status: 'safe' },
    support_resistance: { value: 8.6, model_value: 8.5, unit: 'MPa', status: 'danger' },
    water_inflow: { value: 32, model_value: 31.7, unit: 'm3/h', status: 'warning' },
    microseismic_energy: { value: 850, model_value: 842, unit: 'J', status: 'danger' },
    distance_to_water: { value: 42, model_value: 42.2, unit: 'm', status: 'warning' },
    data_quality: { value: '正常', unit: null, status: 'safe' },
  },
  model_output: {
    best_model: 'xgboost',
    model_accuracy: 0.99325,
    confidence: 0.91,
    true_class: '重大风险',
    predicted_class: '重大风险',
    matches_label: true,
    record_id: 'REC-202511081422-01751',
    probabilities: { low: 0.01, general: 0.02, major: 0.06, severe: 0.91 },
  },
  provenance: {
    source_sha256: '86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A',
    original_timestamp: '2025/11/08 14:22',
    device_id: '监测1',
    record_id: 'REC-202511081422-01751',
  },
};

test('maps all eight real inputs with their actual labels and units', () => {
  const view = mapRoofRiskViewModel(samplePayload);
  assert.equal(view.metrics.length, 8);
  assert.equal(view.metrics[0].label, '顶板离层速率');
  assert.equal(view.metrics[0].text, '12.4 mm/d');
  assert.equal(view.metrics[3].text, '8.6 MPa');
  assert.equal(view.metrics[7].text, '正常');
  assert.equal(view.metrics[0].percent, 62);
});

test('maps model probabilities in the fixed low-to-severe order', () => {
  const view = mapRoofRiskViewModel(samplePayload);
  assert.deepEqual(view.model.probabilities.map((item) => item.label), [
    '低风险', '一般风险', '较大风险', '重大风险',
  ]);
  assert.equal(view.model.probabilities[3].percent, 91);
  assert.equal(view.model.confidenceText, '91.00%');
  assert.equal(view.model.accuracyText, '99.33%');
});

test('maps audit agreement and traceable provenance', () => {
  const view = mapRoofRiskViewModel(samplePayload);
  assert.equal(view.model.labelAgreement, '预测与真实标签一致');
  assert.equal(view.model.auditState, 'match');
  assert.equal(view.provenance.source, '老师提供的真实监测数据');
  assert.equal(view.provenance.hashShort, '86D4C2FB1927');
  assert.equal(view.provenance.recordId, 'REC-202511081422-01751');
});

test('unavailable state contains no simulated numeric fallback', () => {
  const view = unavailableRoofRiskViewModel('接口连接失败');
  assert.equal(view.available, false);
  assert.equal(view.metrics.length, 0);
  assert.equal(view.model.probabilities.length, 0);
  assert.equal(view.message, '接口连接失败');
});
