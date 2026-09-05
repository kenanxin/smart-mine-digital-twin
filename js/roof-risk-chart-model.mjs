const PROBABILITY_META = [
  ['low', '低风险'],
  ['general', '一般风险'],
  ['major', '较大风险'],
  ['severe', '重大风险'],
];

const RISK_LEVEL_META = [
  ['red', '重大风险'],
  ['orange', '较大风险'],
  ['yellow', '一般风险'],
  ['green', '低风险'],
];

function round(value, precision = 2) {
  const scale = 10 ** precision;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function parseRoofRiskTimestamp(value) {
  const match = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return Number.NaN;
  const [, year, month, day, hour, minute, second = '0'] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
}

function buildThresholdTrend(current, history) {
  const schema = Array.isArray(history?.feature_schema) && history.feature_schema.length
    ? history.feature_schema
    : Array.isArray(current?.feature_schema) ? current.feature_schema : [];
  const points = Array.isArray(history?.points) ? history.points : [];

  const series = schema
    .filter((feature) => Number.isFinite(Number(feature.p95)) && Number(feature.p95) !== 0)
    .map((feature) => ({
      key: feature.key,
      label: feature.label || feature.key,
      unit: feature.unit || '',
      points: points
        .map((point) => {
          const timestamp = parseRoofRiskTimestamp(point.timestamp);
          const metric = point.metrics?.[feature.key];
          const rawValue = Number(metric?.value);
          if (!Number.isFinite(timestamp) || !Number.isFinite(rawValue)) return null;
          return {
            timestamp,
            index: round((rawValue / Number(feature.p95)) * 100),
            rawValue,
            unit: metric?.unit ?? feature.unit ?? '',
            sourceTimestamp: point.timestamp,
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.timestamp - right.timestamp),
    }))
    .filter((item) => item.points.length)
    .sort((left, right) => {
      const leftLatest = left.points.at(-1)?.index ?? Number.NEGATIVE_INFINITY;
      const rightLatest = right.points.at(-1)?.index ?? Number.NEGATIVE_INFINITY;
      return rightLatest - leftLatest;
    });

  if (series.length) {
    const peak = Math.max(...series.flatMap((item) => item.points.map((point) => point.index)));
    return {
      mode: 'p95',
      reference: 100,
      sampleCount: Math.max(...series.map((item) => item.points.length)),
      exceededCount: series.filter((item) => (item.points.at(-1)?.index ?? 0) >= 100).length,
      peakIndex: round(peak, 1),
      series,
    };
  }

  const scorePoints = points
    .map((point) => {
      const timestamp = parseRoofRiskTimestamp(point.timestamp);
      const score = Number(point.score);
      if (!Number.isFinite(timestamp) || !Number.isFinite(score)) return null;
      return { timestamp, index: score, rawValue: score, unit: '分', sourceTimestamp: point.timestamp };
    })
    .filter(Boolean)
    .sort((left, right) => left.timestamp - right.timestamp);

  if (scorePoints.length) {
    return {
      mode: 'risk-score',
      reference: 70,
      sampleCount: scorePoints.length,
      exceededCount: null,
      peakIndex: round(Math.max(...scorePoints.map((point) => point.index)), 1),
      series: [{ key: 'risk_score', label: '综合风险分', unit: '分', points: scorePoints }],
    };
  }

  return { mode: 'empty', reference: 100, sampleCount: 0, exceededCount: 0, peakIndex: null, series: [] };
}

function buildProbabilities(current) {
  return PROBABILITY_META.map(([key, label]) => {
    const probability = Number(current?.model_output?.probabilities?.[key]);
    return {
      key,
      label,
      probability: Number.isFinite(probability) ? probability : 0,
      percent: Number.isFinite(probability) ? round(probability * 100, 3) : 0,
    };
  });
}

function buildDeviations(current) {
  const evidence = Array.isArray(current?.feature_evidence) ? current.feature_evidence : [];
  return evidence
    .map((item) => ({
      key: item.key,
      label: item.label || item.key,
      deviation: Number(item.standardized_value),
      rawValue: Number(item.value),
      unit: item.unit || '',
    }))
    .filter((item) => Number.isFinite(item.deviation) && Number.isFinite(item.rawValue))
    .sort((left, right) => Math.abs(right.deviation) - Math.abs(left.deviation));
}

function buildDistribution(eventsPayload) {
  const events = Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
  const total = events.length;
  return RISK_LEVEL_META.map(([key, label]) => {
    const count = events.filter((event) => event.risk_level === key).length;
    return {
      key,
      label,
      count,
      percent: total ? round((count / total) * 100, 1) : 0,
    };
  });
}

export function buildRoofRiskChartModel(current = {}, history = {}, events = {}) {
  return {
    thresholdTrend: buildThresholdTrend(current, history),
    probabilities: buildProbabilities(current),
    deviations: buildDeviations(current),
    distribution: buildDistribution(events),
  };
}
