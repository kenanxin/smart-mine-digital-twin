const PROBABILITY_META = [
  ['low', '低风险'],
  ['general', '一般风险'],
  ['major', '较大风险'],
  ['severe', '重大风险'],
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function metricPrecision(unit, value) {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'J') return Math.abs(value) >= 100 ? 0 : 1;
  return 1;
}

function formatMetricValue(value, unit) {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '--';
  const formatted = value.toFixed(metricPrecision(unit, value));
  return unit ? `${formatted} ${unit}` : formatted;
}

function metricPercent(value, schema) {
  if (!Number.isFinite(value)) return null;
  const low = Number(schema?.p05);
  const high = Number(schema?.p95);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return 0;
  return Math.round(clamp((value - low) / (high - low), 0, 1) * 100);
}

function statusClass(status) {
  if (status === 'danger') return 'danger';
  if (status === 'warning') return 'warn';
  return 'safe';
}

function percentText(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '--';
}

export function unavailableRoofRiskViewModel(message = '真实数据接口暂不可用') {
  return {
    available: false,
    message,
    metrics: [],
    model: {
      name: '--',
      confidenceText: '--',
      accuracyText: '--',
      trueClass: '--',
      predictedClass: '--',
      labelAgreement: '等待真实数据',
      auditState: 'unavailable',
      probabilities: [],
    },
    provenance: {
      source: '真实数据接口暂不可用',
      hashShort: '--',
      recordId: '--',
      timestamp: '--',
      deviceId: '--',
    },
  };
}

export function mapRoofRiskViewModel(payload) {
  if (!payload || payload.data_source !== 'teacher_real_csv_xgboost') {
    return unavailableRoofRiskViewModel('接口未返回老师提供的真实监测数据');
  }

  const schema = Array.isArray(payload.feature_schema) ? payload.feature_schema : [];
  const schemaByKey = new Map(schema.map((item) => [item.key, item]));
  const metrics = schema.map((item) => {
    const metric = payload.metrics?.[item.key] || {};
    return {
      key: item.key,
      label: item.label || item.key,
      value: metric.value,
      modelValue: metric.model_value,
      unit: metric.unit ?? item.unit ?? null,
      text: formatMetricValue(metric.value, metric.unit ?? item.unit ?? null),
      status: statusClass(metric.status),
      percent: metricPercent(Number(metric.value), schemaByKey.get(item.key)),
    };
  });

  const modelOutput = payload.model_output || {};
  const probabilities = PROBABILITY_META.map(([key, label]) => {
    const probability = Number(modelOutput.probabilities?.[key]);
    return {
      key,
      label,
      probability: Number.isFinite(probability) ? probability : 0,
      percent: Number.isFinite(probability) ? Math.round(probability * 100) : 0,
      text: Number.isFinite(probability) ? `${(probability * 100).toFixed(2)}%` : '--',
    };
  });
  const matches = modelOutput.matches_label === true;
  const hash = String(payload.provenance?.source_sha256 || '');

  return {
    available: true,
    message: '',
    metrics,
    model: {
      name: String(modelOutput.best_model || '').toUpperCase() || '--',
      confidence: Number(modelOutput.confidence),
      confidenceText: percentText(Number(modelOutput.confidence)),
      accuracyText: percentText(Number(modelOutput.model_accuracy)),
      trueClass: modelOutput.true_class || '--',
      predictedClass: modelOutput.predicted_class || '--',
      labelAgreement: matches ? '预测与真实标签一致' : '预测与真实标签不一致',
      auditState: matches ? 'match' : 'mismatch',
      recordId: modelOutput.record_id || '--',
      probabilities,
    },
    provenance: {
      source: '老师提供的真实监测数据',
      hashShort: hash ? hash.slice(0, 12) : '--',
      sourceHash: hash || '--',
      recordId: payload.provenance?.record_id || modelOutput.record_id || '--',
      timestamp: payload.provenance?.original_timestamp || payload.timestamp || '--',
      deviceId: payload.provenance?.device_id || payload.face_id || '--',
      inferenceBuiltAt: payload.provenance?.inference_built_at || '--',
    },
  };
}
