export const BUSINESS_METRIC_ORDER = Object.freeze([
  'roof_separation_rate',
  'bolt_axial_force_increment',
  'cable_axial_force_increment',
  'support_resistance',
  'water_inflow',
  'microseismic_energy',
  'distance_to_water',
  'data_quality',
]);

const LOW_SIDE_METRICS = new Set(['distance_to_water']);

export function referenceDirection(key) {
  return LOW_SIDE_METRICS.has(key) ? 'low' : 'high';
}

export function hasReferenceRange(schema) {
  const p05 = Number(schema?.p05);
  const p95 = Number(schema?.p95);
  return Number.isFinite(p05) && Number.isFinite(p95) && p95 > p05;
}

export function referencePosition(value, schema) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !hasReferenceRange(schema)) return null;
  const p05 = Number(schema.p05);
  const p95 = Number(schema.p95);
  const ratio = (numericValue - p05) / (p95 - p05);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

export function referenceIndex(value, schema) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !hasReferenceRange(schema)) return null;
  const p05 = Number(schema.p05);
  const p95 = Number(schema.p95);
  const ratio = referenceDirection(schema.key) === 'low'
    ? (p95 - numericValue) / (p95 - p05)
    : (numericValue - p05) / (p95 - p05);
  return ratio * 100;
}

export function referenceDeviationSide(value, schema) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || !hasReferenceRange(schema)) return null;
  const direction = referenceDirection(schema.key);
  if (direction === 'low' && numericValue < Number(schema.p05)) return 'low';
  if (direction === 'high' && numericValue > Number(schema.p95)) return 'high';
  return null;
}

export function sortFeatureSchema(schema = []) {
  const order = new Map(BUSINESS_METRIC_ORDER.map((key, index) => [key, index]));
  return [...schema].sort((left, right) => (
    (order.get(left?.key) ?? BUSINESS_METRIC_ORDER.length)
    - (order.get(right?.key) ?? BUSINESS_METRIC_ORDER.length)
  ));
}
