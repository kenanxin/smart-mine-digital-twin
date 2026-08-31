const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const SIMULATION_NOTE = '比赛演示模拟阈值，非生产安全标准';

export const EQUIPMENT = Object.freeze([
  { id: 'EQ-01', name: '采煤机 MG650/1620', status: 'running', load: 86.2, location: '工作面出口约 8m', sceneObjectName: 'shearer' },
  { id: 'EQ-02', name: '刮板输送机 SGZ1000', status: 'running', load: 82.5, location: '工作面煤壁前', sceneObjectName: 'scraperConveyor' },
  { id: 'EQ-03', name: '液压支架组 ZY12000', status: 'running', load: 91.0, location: '工作面出口段 12 架', sceneObjectName: 'hydraulicSupportArray' },
  { id: 'EQ-04', name: '带式输送机 DSJ120', status: 'running', load: 78.7, location: '运输顺槽 21-50m', sceneObjectName: 'undergroundBeltDSJ120' },
  { id: 'EQ-05', name: '转载机 SZZ1200', status: 'running', load: 74.6, location: '运输顺槽 1-12m', sceneObjectName: 'stageLoaderSZZ1200' },
  { id: 'EQ-06', name: '破碎机 PLM3000', status: 'running', load: 71.4, location: '运输顺槽 14-19m', sceneObjectName: 'crusherPLM3000' },
  { id: 'MON-01', name: '顶板离层仪 01', status: 'running', load: 18.0, location: '运输顺槽 4m 顶板中线', sceneObjectName: 'roofSeparation01' },
  { id: 'MON-02', name: '顶板离层仪 02', status: 'maintain', load: null, location: '运输顺槽 10m 顶板中线', sceneObjectName: 'roofSeparation02' },
  { id: 'MON-03', name: '顶板离层仪 03', status: 'fault', load: 38.0, location: '运输顺槽 16m 顶板中线', sceneObjectName: 'roofSeparation03' },
  { id: 'MON-04', name: '巷道收敛监测 01', status: 'maintain', load: null, location: '运输顺槽 10m 两帮-顶板测线', sceneObjectName: 'convergence01' },
  { id: 'MON-05', name: '锚索受力监测 01', status: 'maintain', load: null, location: '运输顺槽 12m 顶板锚索', sceneObjectName: 'anchorLoad01' },
  { id: 'MON-06', name: '微震监测 01', status: 'maintain', load: null, location: '运输顺槽 18m 左帮', sceneObjectName: 'microseismic01' },
  { id: 'MON-07', name: '出口 CCTV 01', status: 'running', load: 100, location: '工作面出口顶板支架', sceneObjectName: 'cctv01' },
]);

export const METRICS = Object.freeze({
  roofPressure: { label: '顶板压力', unit: 'MPa', normal: [8, 22], warn: 22, danger: 28, base: 16.4, amplitude: 1.1 },
  separation: { label: '顶板离层量', unit: 'mm', normal: [5, 25], warn: 25, danger: 32, base: 12.8, amplitude: 1.4 },
  subsidence: { label: '顶板下沉量', unit: 'mm', normal: [3, 18], warn: 18, danger: 25, base: 8.6, amplitude: 1.0 },
  supportResistance: { label: '支架工作阻力', unit: 'kN', normal: [6500, 9500], warn: 9500, danger: 10500, base: 8240, amplitude: 240 },
  anchorLoad: { label: '锚索载荷', unit: 'kN', normal: [120, 220], warn: 220, danger: 260, base: 176, amplitude: 9 },
  microseismicEnergy: { label: '微震能量', unit: 'J', normal: [50, 800], warn: 800, danger: 1200, base: 286, amplitude: 75 },
});

export const MONITOR_POINTS = Object.freeze([
  { id: 'RP-01', metric: 'roofPressure', location: '运输顺槽 4m 顶板', position: [-15, 7.0, -3] },
  { id: 'RP-02', metric: 'roofPressure', location: '运输顺槽 10m 顶板', position: [8, -1.6, -5] },
  { id: 'RP-03', metric: 'roofPressure', location: '1206 工作面出口顶板', position: [10, -20.0, -13] },
  { id: 'DS-01', metric: 'separation', location: '运输顺槽前段离层点', position: [-8, -10.8, 1] },
  { id: 'DS-02', metric: 'separation', location: '运输顺槽深部离层点', position: [-8, -10.8, -13] },
  { id: 'DS-03', metric: 'subsidence', location: '1206 回风侧下沉点', position: [0, -20.0, -13] },
  { id: 'SR-01', metric: 'supportResistance', location: '液压支架 35 号', position: [3, -20.0, -12.5] },
  { id: 'SR-02', metric: 'supportResistance', location: '液压支架 87 号', position: [12, -20.0, -12.5] },
  { id: 'CAM-01', metric: 'roofPressure', location: '变电硐室入口视频点', type: 'camera', position: [14, -10.2, -8] },
  { id: 'CAM-02', metric: 'separation', location: '转载硐室入口视频点', type: 'camera', position: [-8, -10.2, 4] },
  { id: 'PER-01', metric: 'subsidence', location: '运输顺槽巡检位', type: 'person', position: [8, -2.5, 1] },
  { id: 'PER-02', metric: 'anchorLoad', location: '1206 工作面巡检位', type: 'person', position: [6, -20.8, -5] },
]);

const current = {};
const history = [];
let elapsed = 0;

export function updateMineState(deltaSeconds = 0) {
  elapsed += Math.min(Math.max(deltaSeconds, 0), 1);
  Object.entries(METRICS).forEach(([key, metric], index) => {
    const wave = Math.sin(elapsed * (0.055 + index * 0.006) + index * 0.91);
    const secondary = Math.sin(elapsed * 0.017 + index * 1.7) * 0.32;
    current[key] = metric.base + metric.amplitude * (wave * 0.68 + secondary);
  });
  if (!history.length || elapsed - history[history.length - 1].elapsed >= 2) {
    history.push({ elapsed, roofPressure: current.roofPressure, separation: current.separation, supportResistance: current.supportResistance });
    if (history.length > 30) history.shift();
  }
  return getMineState();
}

function metricRatio(key) {
  const metric = METRICS[key];
  return clamp((current[key] - metric.normal[0]) / (metric.danger - metric.normal[0]), 0, 1);
}

export function getMetricLevel(key, value = current[key]) {
  const metric = METRICS[key];
  if (value >= metric.danger) return 'danger';
  if (value >= metric.warn) return 'warn';
  return 'safe';
}

export function getEquipmentSummary() {
  return EQUIPMENT.reduce((summary, item) => {
    summary.total += 1;
    summary[item.status] += 1;
    return summary;
  }, { total: 0, running: 0, maintain: 0, fault: 0, offline: 0 });
}

export function getMineState() {
  if (!Object.keys(current).length) updateMineState(0);
  const riskScore = Math.round((metricRatio('roofPressure') * 0.45 + metricRatio('separation') * 0.35 + metricRatio('supportResistance') * 0.20) * 100);
  return {
    metrics: { ...current },
    riskScore,
    riskLevel: riskScore >= 80 ? 'danger' : riskScore >= 50 ? 'warn' : 'safe',
    equipment: EQUIPMENT,
    equipmentSummary: getEquipmentSummary(),
    monitorPoints: MONITOR_POINTS,
    history: history.map(item => ({ ...item })),
    simulationNote: SIMULATION_NOTE,
  };
}

updateMineState(0);
