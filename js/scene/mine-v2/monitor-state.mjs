export const CATEGORY_COLORS = Object.freeze({
  'roof-sensor': 0x26d6c8,
  camera: 0x4aa8ff,
  person: 0x66df86,
  'equipment-status': 0xffb14d,
});

export const OPERATIONAL_COLORS = Object.freeze({
  normal: 0x22c55e,
  warning: 0xf5a623,
  danger: 0xef4444,
});

function metricValue(anchor, snapshot) {
  const metrics = snapshot.metrics;
  if (anchor.type === 'roof-pressure' || anchor.type === 'junction-stress' || anchor.type === 'chamber-pressure') return metrics.roofPressure;
  if (anchor.type === 'roof-separation') return metrics.roofSeparation;
  if (anchor.type === 'convergence') return metrics.roofSubsidence;
  if (anchor.type === 'support-load') return metrics.supportResistance;
  if (anchor.type === 'microseismic') return metrics.microseismicEnergy;
  return anchor.category === 'camera' ? 'online' : anchor.category === 'person' ? 'present' : 'running';
}

function formatValue(anchor, value) {
  return typeof value === 'number' ? `${value.toFixed(anchor.unit === 'kN' ? 0 : 1)} ${anchor.unit}` : value;
}

export function getMonitorOperationalState(anchor, snapshot) {
  const value = metricValue(anchor, snapshot);
  const categoryColor = CATEGORY_COLORS[anchor.category] ?? 0xffffff;
  if (typeof value !== 'number' || anchor.warn == null || anchor.danger == null) {
    return { value, text: formatValue(anchor, value), level: 'category', color: categoryColor, categoryColor };
  }
  const level = value >= anchor.danger ? 'danger' : value >= anchor.warn ? 'warning' : 'normal';
  return { value, text: formatValue(anchor, value), level, color: OPERATIONAL_COLORS[level], categoryColor };
}
