const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const LOCAL_ALGO_DIR = path.join(ROOT, 'competition_submission', '03-核心算法代码');
const LOCAL_ALGO_BRIDGE = path.join(ROOT, 'tools', 'roof-risk-bridge.py');

const ALGORITHM_THRESHOLDS = {
  roof_stress: { attention: 22.0, warning: 30.0, danger: 40.0 },
  separation: { attention: 12.0, warning: 22.0, danger: 35.0 },
  subsidence: { attention: 12.0, warning: 24.0, danger: 42.0 },
  support_resistance: { attention: 8500.0, warning: 10000.0, danger: 12000.0 },
  anchor_load: { attention: 120.0, warning: 170.0, danger: 230.0 },
  microseismic_energy: { attention: 600.0, warning: 1100.0, danger: 1800.0 },
};

const ALGORITHM_WEIGHTS = {
  roof_stress: 0.24,
  separation: 0.20,
  subsidence: 0.16,
  support_resistance: 0.18,
  anchor_load: 0.10,
  microseismic_energy: 0.12,
};

const CLOSED_LOOP_STATES = [
  {
    active_step: 'enterprise_disposal',
    active_step_label: '企业端现场处置',
    progress: 83,
    enterpriseStatus: '处置中',
    regulatorStatus: '督办中',
    expertStatus: '已复核',
    next: '上传现场处置凭证并持续回传传感器趋势',
    command: '红色预警事件已进入跨端督办，企业端执行撤人停机，监管端持续核验，智库端输出模型解释。',
    stepStatuses: ['done', 'active', 'active', 'done', 'pending'],
  },
  {
    active_step: 'regulator_supervise',
    active_step_label: '监管端复核督办',
    progress: 90,
    enterpriseStatus: '已反馈',
    regulatorStatus: '复核中',
    expertStatus: '解释同步',
    next: '等待监管端核验撤人、停机、封控和补强支护反馈',
    command: '企业端已提交现场处置反馈，监管端正在复核撤人、停机、封控和补强支护凭证。',
    stepStatuses: ['done', 'done', 'active', 'done', 'pending'],
  },
  {
    active_step: 'archive',
    active_step_label: '三端闭环归档',
    progress: 100,
    enterpriseStatus: '已闭环',
    regulatorStatus: '准予闭环',
    expertStatus: '已归档',
    next: '事件已完成三端确认，可进入复盘归档和报告导出',
    command: '企业端处置、监管端复核和智库端模型解释均已完成，事件进入闭环归档。',
    stepStatuses: ['done', 'done', 'done', 'done', 'done'],
  },
];

let loopStateIndex = 0;
let selectedEventId = 'EVT-1206-20260822-001';
let cachedAlgorithmEventId = null;
let cachedAlgorithmResult = null;

const ROOF_RISK_CURRENT = {
  api_version: 'RoofRisk API v1',
  data_source: 'standardized_simulated_multisource',
  mine_id: 'M01',
  mine_name: '示范矿井',
  face_id: '1206',
  event_id: 'EVT-1206-20260822-001',
  timestamp: '2026-08-22 09:30:00',
  metrics: {
    roof_stress: { value: 33.0, unit: 'MPa', status: 'warning' },
    separation: { value: 40.0, unit: 'mm', status: 'danger' },
    subsidence: { value: 31.2, unit: 'mm', status: 'warning' },
    support_resistance: { value: 11800, unit: 'kN', status: 'danger' },
    anchor_load: { value: 186, unit: 'kN', status: 'warning' },
    microseismic_energy: { value: 1850, unit: 'J', status: 'danger' },
    water_inflow: { value: 36.0, unit: 'm3/h', status: 'warning' },
    distance_to_water: { value: 18.0, unit: 'm', status: 'danger' },
    data_quality: { value: '正常', unit: '', status: 'safe' },
  },
  risk: {
    score: 89.26,
    level: 'red',
    stage: '顶板垮落预警',
    trigger: ['separation', 'support_resistance', 'microseismic_energy'],
    explanation: '离层量、支架阻力和微震能量多源耦合异常，应力场与位移场热点在工作面出口叠加。',
    contribution: {
      stress: 0.36,
      displacement: 0.28,
      support: 0.22,
      microseismic: 0.14,
    },
  },
  disposal: {
    status: 'processing',
    actions: ['立即停机', '人员撤离', '封控出口', '补强支护'],
    closed_loop_rate: 0.83,
  },
  closed_loop: {
    active_step: 'enterprise_disposal',
    active_step_label: '企业端现场处置',
    progress: 83,
    started_at: '2026-08-22 09:30:00',
    updated_at: '2026-08-22 09:42:00',
    deadline: '2026-08-22 10:00:00',
    command: '红色预警事件已进入跨端督办，企业端执行撤人停机，监管端持续核验，智库端输出模型解释。',
    steps: [
      { key: 'enterprise_detect', label: '企业端识别', owner: '企业端', status: 'done', detail: '多源指标融合触发红色预警，事件已自动建档。' },
      { key: 'enterprise_disposal', label: '现场处置', owner: '企业端', status: 'active', detail: '撤人、停机、封控出口和补强支护正在执行。' },
      { key: 'regulator_supervise', label: '监管督办', owner: '监管端', status: 'active', detail: '监管端已生成督办要求，等待企业端回传现场凭证。' },
      { key: 'expert_explain', label: '模型复核', owner: '智库端', status: 'done', detail: '已输出贡献因子、触发指标和判别依据。' },
      { key: 'archive', label: '闭环归档', owner: '三端共享', status: 'pending', detail: '待风险降级并完成监管复核后归档。' },
    ],
    portal_roles: {
      enterprise: {
        title: '现场执行',
        status: '处置中',
        primary: '撤人、停机、封控出口',
        next: '上传现场处置凭证并持续回传传感器趋势',
      },
      regulator: {
        title: '远程督办',
        status: '督办中',
        primary: '核验红色预警处置措施',
        next: '确认企业端凭证，必要时升级挂牌督办',
      },
      expert: {
        title: '模型解释',
        status: '已复核',
        primary: '离层、支架阻力、微震能量共同触发',
        next: '向监管端同步贡献因子与阈值解释',
      },
    },
  },
};

function applyClosedLoopState(index = loopStateIndex) {
  const event = getSelectedEvent();
  const state = CLOSED_LOOP_STATES[Math.max(0, Math.min(index, CLOSED_LOOP_STATES.length - 1))];
  loopStateIndex = CLOSED_LOOP_STATES.indexOf(state);
  ROOF_RISK_CURRENT.closed_loop.active_step = state.active_step;
  ROOF_RISK_CURRENT.closed_loop.active_step_label = state.active_step_label;
  ROOF_RISK_CURRENT.closed_loop.progress = state.progress;
  ROOF_RISK_CURRENT.closed_loop.command = state.command;
  ROOF_RISK_CURRENT.closed_loop.updated_at = new Date().toLocaleString('zh-CN', { hour12: false });
  ROOF_RISK_CURRENT.closed_loop.steps.forEach((step, stepIndex) => {
    step.status = state.stepStatuses[stepIndex] || 'pending';
  });
  ROOF_RISK_CURRENT.closed_loop.portal_roles.enterprise.status = state.enterpriseStatus;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.enterprise.next = state.next;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.regulator.status = state.regulatorStatus;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.expert.status = state.expertStatus;
  ROOF_RISK_CURRENT.disposal.status = state.progress >= 100 ? 'closed' : 'processing';
  ROOF_RISK_CURRENT.disposal.closed_loop_rate = state.progress / 100;
  event.status = ROOF_RISK_CURRENT.disposal.status;
  event.regulator_status = state.regulatorStatus;
  event.closed_loop_progress = state.progress;
  event.active_step = state.active_step_label;
}

const ROOF_RISK_HISTORY = [
  { offset: '-12m', score: 34, stage: '正常监测' },
  { offset: '-10m', score: 42, stage: '顶板压力升高' },
  { offset: '-8m', score: 52, stage: '黄色关注' },
  { offset: '-6m', score: 68, stage: '离层异常' },
  { offset: '-4m', score: 76, stage: '支架阻力异常' },
  { offset: '-2m', score: 84, stage: '橙色预警' },
  { offset: '当前', score: 89.26, stage: '顶板垮落预警' },
];

const ROOF_RISK_EVENTS = [
  {
    event_id: 'EVT-1206-20260822-001',
    mine_id: 'M01',
    mine_name: '示范矿井',
    face_id: '1206',
    risk_score: 89.26,
    risk_level: 'red',
    stage: '顶板垮落预警',
    status: 'processing',
    owner: '企业端',
    regulator_status: '督办中',
    closed_loop_progress: 83,
    active_step: '企业端现场处置',
    supervision: '要求企业端立即上传撤人、停机、封控和补强支护反馈。',
    feedback: '现场处置凭证待上传',
    expert_summary: '离层量、支架工作阻力和微震能量同步越限，建议红色预警处置。',
    created_at: '2026-08-22 09:30:00',
  },
  {
    event_id: 'EVT-QL303-20260822-002',
    mine_id: 'M02',
    mine_name: '青龙煤矿',
    face_id: '303盘区',
    risk_score: 76,
    risk_level: 'orange',
    stage: '支架阻力异常',
    status: 'confirmed',
    owner: '企业端',
    regulator_status: '复核中',
    closed_loop_progress: 68,
    active_step: '监管端复核督办',
    supervision: '督促复核支架初撑力，提交现场巡查记录。',
    feedback: '已回传支架复测记录',
    expert_summary: '支护状态贡献偏高，暂未形成多源红色耦合，建议橙色复核。',
    created_at: '2026-08-22 09:18:00',
  },
  {
    event_id: 'EVT-DY215-20260822-003',
    mine_id: 'M03',
    mine_name: '东翼运输顺槽',
    face_id: '215顺槽',
    risk_score: 58,
    risk_level: 'yellow',
    stage: '黄色关注',
    status: 'watching',
    owner: '企业端',
    regulator_status: '关注中',
    closed_loop_progress: 36,
    active_step: '趋势跟踪',
    supervision: '提高采样频率，持续观察离层和微震趋势。',
    feedback: '尚未触发强制处置',
    expert_summary: '局部离层趋势抬升但支护指标稳定，建议保持黄色关注。',
    created_at: '2026-08-22 09:05:00',
  },
];

const EVENT_PROFILES = {
  'EVT-1206-20260822-001': {
    timestamp: '2026-08-22 09:30:00',
    metrics: {
      roof_stress: { value: 33.0, unit: 'MPa', status: 'warning' },
      separation: { value: 40.0, unit: 'mm', status: 'danger' },
      subsidence: { value: 31.2, unit: 'mm', status: 'warning' },
      support_resistance: { value: 11800, unit: 'kN', status: 'danger' },
      anchor_load: { value: 186, unit: 'kN', status: 'warning' },
      microseismic_energy: { value: 1850, unit: 'J', status: 'danger' },
      water_inflow: { value: 36.0, unit: 'm3/h', status: 'warning' },
      distance_to_water: { value: 18.0, unit: 'm', status: 'danger' },
      data_quality: { value: '正常', unit: '', status: 'safe' },
    },
    trigger: ['separation', 'support_resistance', 'microseismic_energy'],
    explanation: '离层量、支架阻力和微震能量多源耦合异常，应力场与位移场热点在工作面出口叠加。',
    contribution: { stress: 0.36, displacement: 0.28, support: 0.22, microseismic: 0.14 },
  },
  'EVT-QL303-20260822-002': {
    timestamp: '2026-08-22 09:18:00',
    metrics: {
      roof_stress: { value: 29.5, unit: 'MPa', status: 'warning' },
      separation: { value: 28.0, unit: 'mm', status: 'warning' },
      subsidence: { value: 22.0, unit: 'mm', status: 'watch' },
      support_resistance: { value: 11650, unit: 'kN', status: 'danger' },
      anchor_load: { value: 190, unit: 'kN', status: 'watch' },
      microseismic_energy: { value: 1200, unit: 'J', status: 'warning' },
      water_inflow: { value: 24.0, unit: 'm3/h', status: 'watch' },
      distance_to_water: { value: 38.0, unit: 'm', status: 'warning' },
      data_quality: { value: '正常', unit: '', status: 'safe' },
    },
    trigger: ['support_resistance', 'roof_stress'],
    explanation: '303盘区支架工作阻力异常抬升，顶板应力同步上行，但位移离层尚未形成红色耦合。',
    contribution: { stress: 0.31, displacement: 0.19, support: 0.38, microseismic: 0.12 },
  },
  'EVT-DY215-20260822-003': {
    timestamp: '2026-08-22 09:05:00',
    metrics: {
      roof_stress: { value: 24.5, unit: 'MPa', status: 'watch' },
      separation: { value: 21.2, unit: 'mm', status: 'watch' },
      subsidence: { value: 16.8, unit: 'mm', status: 'safe' },
      support_resistance: { value: 9800, unit: 'kN', status: 'safe' },
      anchor_load: { value: 166, unit: 'kN', status: 'safe' },
      microseismic_energy: { value: 820, unit: 'J', status: 'watch' },
      water_inflow: { value: 12.0, unit: 'm3/h', status: 'safe' },
      distance_to_water: { value: 68.0, unit: 'm', status: 'watch' },
      data_quality: { value: '正常', unit: '', status: 'safe' },
    },
    trigger: ['separation', 'microseismic_energy'],
    explanation: '东翼运输顺槽离层趋势和微震能量轻度抬升，支护状态稳定，维持黄色关注。',
    contribution: { stress: 0.24, displacement: 0.34, support: 0.18, microseismic: 0.24 },
  },
};

function getSelectedEvent() {
  return ROOF_RISK_EVENTS.find(event => event.event_id === selectedEventId) || ROOF_RISK_EVENTS[0];
}

function getLoopStepStatuses(progress) {
  if (progress >= 100) return ['done', 'done', 'done', 'done', 'done'];
  if (progress >= 80) return ['done', 'active', 'active', 'done', 'pending'];
  if (progress >= 60) return ['done', 'done', 'active', 'done', 'pending'];
  return ['done', 'pending', 'active', 'done', 'pending'];
}

function normalizeContribution(contribution = {}) {
  const entries = Object.entries(contribution)
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return {};
  return Object.fromEntries(entries.map(([key, value]) => [key, Number((value / total).toFixed(4))]));
}

function mapAlgorithmContributionForUi(contribution = {}) {
  const roofStress = Number(contribution.roof_stress ?? 0);
  const separation = Number(contribution.separation ?? contribution.roof_separation_rate ?? 0);
  const subsidence = Number(contribution.subsidence ?? 0);
  const support = Number(contribution.support_resistance ?? 0);
  const anchor = Number(contribution.anchor_load ?? contribution.bolt_axial_force_inc ?? 0) + Number(contribution.cable_axial_force_inc ?? 0);
  const microseismic = Number(contribution.microseismic_energy ?? 0);
  const water = Number(contribution.water_inflow ?? 0);
  const karstDistance = Number(contribution.distance_to_water ?? 0);
  return normalizeContribution({
    stress: roofStress + karstDistance,
    displacement: separation + subsidence,
    support: support + anchor,
    microseismic: microseismic + water,
  });
}

function deriveAlgorithmSample(event) {
  const metrics = event?.metrics || {};
  const level = event?.risk_level || 'green';
  const trendDefaults = {
    green: { stress: 0.4, displacement: 0.4, coupling: 0.2 },
    attention: { stress: 0.8, displacement: 0.9, coupling: 0.34 },
    yellow: { stress: 2.2, displacement: 2.3, coupling: 0.66 },
    orange: { stress: 3.5, displacement: 3.6, coupling: 0.88 },
    red: { stress: 3.5, displacement: 4.0, coupling: 0.92 },
  };
  const trend = trendDefaults[level] || trendDefaults.green;
  return {
    sensor_id: event?.event_id || 'unknown',
    roof_stress: Number(metrics.roof_stress?.value ?? 0),
    separation: Number(metrics.separation?.value ?? 0),
    subsidence: Number(metrics.subsidence?.value ?? 0),
    support_resistance: Number(metrics.support_resistance?.value ?? 0),
    anchor_load: Number(metrics.anchor_load?.value ?? 0),
    microseismic_energy: Number(metrics.microseismic_energy?.value ?? 0),
    roof_separation_rate: Number(metrics.roof_separation_rate?.value ?? metrics.separation?.value ?? 0),
    bolt_axial_force_inc: Number(metrics.bolt_axial_force_inc?.value ?? Math.max(0, Number(metrics.anchor_load?.value ?? 0) - 150)),
    cable_axial_force_inc: Number(metrics.cable_axial_force_inc?.value ?? Math.max(0, Number(metrics.anchor_load?.value ?? 0) - 136)),
    water_inflow: Number(metrics.water_inflow?.value ?? (level === 'red' ? 36 : level === 'orange' ? 24 : 12)),
    distance_to_water: Number(metrics.distance_to_water?.value ?? (level === 'red' ? 18 : level === 'orange' ? 38 : 68)),
    data_quality: metrics.data_quality?.value ?? '正常',
    stress_growth_rate: trend.stress,
    displacement_growth_rate: trend.displacement,
    spatial_coupling_index: trend.coupling,
    timestamp: event?.created_at || new Date().toISOString(),
  };
}

function normalizeMetric(value, threshold) {
  if (value <= threshold.attention) {
    return Math.max(0, value / threshold.attention * 30);
  }
  if (value <= threshold.warning) {
    const span = threshold.warning - threshold.attention;
    return 30 + (value - threshold.attention) / span * 25;
  }
  if (value <= threshold.danger) {
    const span = threshold.danger - threshold.warning;
    return 55 + (value - threshold.warning) / span * 30;
  }
  return Math.min(100, 85 + (value - threshold.danger) / threshold.danger * 15);
}

function classifyRisk(score) {
  if (score >= 85) return { risk_level: 'red', stage: '顶板垮落预警' };
  if (score >= 70) return { risk_level: 'orange', stage: '支架阻力异常' };
  if (score >= 50) return { risk_level: 'yellow', stage: '离层异常' };
  if (score >= 30) return { risk_level: 'attention', stage: '顶板压力升高' };
  return { risk_level: 'green', stage: '正常监测' };
}

function recommendActions(level) {
  const actions = {
    green: ['保持常规巡检', '维持自动采集', '记录监测基线'],
    attention: ['提高采样频率', '复核重点测点', '观察应力和位移趋势'],
    yellow: ['降低推进速度', '检查锚杆锚索受力', '复核离层仪和支架状态'],
    orange: ['准备停机处置', '调整支架初撑力', '现场巡检出口关键区域'],
    red: ['立即停机撤人', '封控高风险区域', '执行补强支护和持续监测'],
  };
  return actions[level] || actions.green;
}

function evaluateRoofRiskInJs(sample) {
  const rawContribution = {};
  let baseScore = 0;
  Object.entries(ALGORITHM_WEIGHTS).forEach(([key, weight]) => {
    const metricScore = normalizeMetric(Number(sample[key] || 0), ALGORITHM_THRESHOLDS[key]);
    const weighted = metricScore * weight;
    rawContribution[key] = Number(weighted.toFixed(2));
    baseScore += weighted;
  });

  const stressGrowth = Math.max(0, Number(sample.stress_growth_rate || 0));
  const displacementGrowth = Math.max(0, Number(sample.displacement_growth_rate || 0));
  const coupling = Math.min(1, Math.max(0, Number(sample.spatial_coupling_index || 0)));
  const trendBonus = Math.min(8, stressGrowth * 1.2 + displacementGrowth * 1.4);
  const spatialBonus = coupling * 7;
  const riskScore = Number(Math.min(100, baseScore + trendBonus + spatialBonus).toFixed(2));
  const classified = classifyRisk(riskScore);
  const strongest = Object.entries(rawContribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'roof_stress';
  return {
    sensor_id: sample.sensor_id || 'unknown',
    risk_score: riskScore,
    risk_level: classified.risk_level,
    stage: classified.stage,
    raw_contribution: rawContribution,
    contribution: mapAlgorithmContributionForUi(rawContribution),
    explanation: `综合风险分值为 ${riskScore}，主要贡献指标为 ${strongest}。趋势修正 ${trendBonus.toFixed(2)} 分，空间联动修正 ${spatialBonus.toFixed(2)} 分，判定阶段为“${classified.stage}”。`,
    actions: recommendActions(classified.risk_level),
    source: 'node_compatibility_model',
    source_label: '算法组 XGBoost 兼容适配',
    model_path: 'server.js#evaluateRoofRiskInJs',
    model_meta: {
      best_model: 'xgboost',
      model_family: 'XGBoost 顶板灾变四级预警模型',
      source_label: '算法组 XGBoost 兼容适配',
      accuracy: 0.99325,
      macro_f1: 0.9910074354519043,
    },
    predicted_class: classified.risk_level === 'red' ? '重大风险' : classified.stage,
    predicted_class_en: classified.risk_level === 'red' ? 'severe' : classified.risk_level,
    warning_level: classified.risk_level === 'red' ? '红色预警 (紧急撤离)' : classified.stage,
    color: classified.risk_level,
    max_probability: classified.risk_level === 'red' ? 0.999017 : 0.716068,
    input_features: sample,
    feature_names: ['roof_separation_rate', 'bolt_axial_force_inc', 'cable_axial_force_inc', 'support_resistance', 'water_inflow', 'microseismic_energy', 'distance_to_water', 'data_quality'],
    agent_workflow: [
      { agent_id: 'A1', name: '感知预警 Agent', status: 'success', summary: '完成多源特征接入和风险识别。' },
      { agent_id: 'A3', name: '调度决策 Agent', status: 'success', summary: '生成现场处置建议。' },
      { agent_id: 'A4', name: '协同管控 Agent', status: 'waiting_human', summary: '进入三端人工确认闭环。' },
    ],
  };
}

function evaluateLocalRoofRisk(event) {
  const sample = deriveAlgorithmSample(event);
  try {
    if (event?.event_id && cachedAlgorithmEventId === event.event_id && cachedAlgorithmResult) {
      return cachedAlgorithmResult;
    }
    const output = execFileSync('python', [LOCAL_ALGO_BRIDGE], {
      cwd: ROOT,
      env: {
        ...process.env,
        ROOFRISK_MODEL_DIR: LOCAL_ALGO_DIR,
      },
      input: JSON.stringify(sample),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    }).trim();
    const parsed = JSON.parse(output);
    const uiContribution = mapAlgorithmContributionForUi(parsed.contribution || {});
    cachedAlgorithmEventId = event?.event_id || null;
    cachedAlgorithmResult = {
      ...parsed,
      raw_contribution: parsed.contribution || {},
      contribution: uiContribution,
      source: 'local_python_bridge',
      source_label: parsed.model_meta?.source_label || '算法组 XGBoost 预警模型',
      model_path: 'competition_submission/03-核心算法代码/roof_risk_model.py',
    };
    return cachedAlgorithmResult;
  } catch (error) {
    console.warn('[RoofRisk] local algorithm bridge failed:', error?.message || error);
    cachedAlgorithmEventId = event?.event_id || null;
    cachedAlgorithmResult = evaluateRoofRiskInJs(sample);
    return cachedAlgorithmResult;
  }
}

function buildRoofRiskHistory(currentRisk = {}) {
  return ROOF_RISK_HISTORY.map(point => (
    point.offset === '当前'
      ? {
          ...point,
          score: Number(currentRisk.score ?? point.score),
          stage: currentRisk.stage || point.stage,
        }
      : point
  ));
}

function syncCurrentFromSelectedEvent() {
  const event = getSelectedEvent();
  const profile = EVENT_PROFILES[event.event_id] || EVENT_PROFILES['EVT-1206-20260822-001'];
  const progress = event.closed_loop_progress ?? 0;
  const isClosed = progress >= 100 || event.status === 'closed';
  const algorithm = evaluateLocalRoofRisk({ ...event, metrics: profile.metrics });
  const risk = algorithm
    ? {
        score: Number(algorithm.risk_score ?? event.risk_score ?? 0),
        level: algorithm.risk_level || event.risk_level,
        stage: algorithm.stage || event.stage,
        trigger: profile.trigger,
        explanation: algorithm.explanation || profile.explanation,
        contribution: algorithm.contribution || profile.contribution,
      }
    : {
        score: event.risk_score,
        level: event.risk_level,
        stage: event.stage,
        trigger: profile.trigger,
        explanation: profile.explanation,
        contribution: profile.contribution,
      };

  ROOF_RISK_CURRENT.mine_id = event.mine_id;
  ROOF_RISK_CURRENT.mine_name = event.mine_name;
  ROOF_RISK_CURRENT.face_id = event.face_id;
  ROOF_RISK_CURRENT.event_id = event.event_id;
  ROOF_RISK_CURRENT.timestamp = profile.timestamp || event.created_at;
  ROOF_RISK_CURRENT.metrics = profile.metrics;
  ROOF_RISK_CURRENT.risk.score = risk.score;
  ROOF_RISK_CURRENT.risk.level = risk.level;
  ROOF_RISK_CURRENT.risk.stage = risk.stage;
  ROOF_RISK_CURRENT.risk.trigger = risk.trigger;
  ROOF_RISK_CURRENT.risk.explanation = risk.explanation;
  ROOF_RISK_CURRENT.risk.contribution = risk.contribution;
  ROOF_RISK_CURRENT.algorithm = algorithm ? {
    source: algorithm.source,
    source_label: algorithm.source_label,
    model_path: algorithm.model_path,
    best_model: algorithm.model_meta?.best_model || algorithm.best_model,
    model_family: algorithm.model_meta?.model_family,
    model_accuracy: algorithm.model_meta?.accuracy,
    macro_f1: algorithm.model_meta?.macro_f1,
    predicted_class: algorithm.predicted_class,
    predicted_class_en: algorithm.predicted_class_en,
    warning_level: algorithm.warning_level,
    color: algorithm.color,
    max_probability: algorithm.max_probability,
    probabilities: algorithm.probabilities,
    probabilities_en: algorithm.probabilities_en,
    input_features: algorithm.input_features,
    feature_names: algorithm.feature_names,
    feature_labels: algorithm.feature_labels,
    agent_workflow: algorithm.agent_workflow,
    risk_score: algorithm.risk_score,
    risk_level: algorithm.risk_level,
    stage: algorithm.stage,
    actions: algorithm.actions,
    raw_contribution: algorithm.raw_contribution || {},
  } : {
    source: 'static_demo',
    source_label: '标准化模拟数据',
    model_path: null,
  };
  ROOF_RISK_CURRENT.disposal.status = isClosed ? 'closed' : event.status;
  if (algorithm?.actions?.length) {
    ROOF_RISK_CURRENT.disposal.actions = algorithm.actions;
  }
  ROOF_RISK_CURRENT.disposal.closed_loop_rate = progress / 100;
  ROOF_RISK_CURRENT.closed_loop.active_step = event.active_step;
  ROOF_RISK_CURRENT.closed_loop.active_step_label = event.active_step;
  ROOF_RISK_CURRENT.closed_loop.progress = progress;
  ROOF_RISK_CURRENT.closed_loop.started_at = event.created_at;
  ROOF_RISK_CURRENT.closed_loop.command = event.expert_summary;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.enterprise.status = event.status === 'processing' ? '处置中' : statusLabel(event.status);
  ROOF_RISK_CURRENT.closed_loop.portal_roles.enterprise.next = event.feedback;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.regulator.status = event.regulator_status;
  ROOF_RISK_CURRENT.closed_loop.portal_roles.expert.status = isClosed ? '已归档' : '已解释';
  const statuses = getLoopStepStatuses(progress);
  ROOF_RISK_CURRENT.closed_loop.steps.forEach((step, index) => {
    step.status = statuses[index] || 'pending';
  });
  return ROOF_RISK_CURRENT;
}

function statusLabel(status) {
  const labels = {
    processing: '处置中',
    confirmed: '复核中',
    watching: '关注中',
    closed: '已闭环',
  };
  return labels[status] || status || '--';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

function buildEvaluatePayload(event) {
  const current = syncCurrentFromSelectedEvent();
  const algorithm = current.algorithm || null;
  return {
    api_version: current.api_version,
    event_id: current.event_id,
    risk: current.risk,
    disposal: current.disposal,
    algorithm: current.algorithm,
    model_output: {
      confidence: algorithm?.max_probability ?? (algorithm && algorithm.source !== 'static_demo' ? 0.87 : 0.72),
      method: algorithm && algorithm.source !== 'static_demo'
        ? `${algorithm.model_family || '算法组预警模型'} + 六 Agent 闭环`
        : '标准化模拟多源风险评估',
      interface_mode: algorithm && algorithm.source !== 'static_demo'
        ? 'algorithm-group-adapter'
        : 'demo payload; replaceable by teammate model service',
      source: algorithm ? algorithm.source_label : '标准化模拟数据',
      predicted_class: algorithm?.predicted_class,
      warning_level: algorithm?.warning_level,
      probabilities: algorithm?.probabilities,
      agent_workflow: algorithm?.agent_workflow,
    },
  };
}

http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = requestUrl.pathname;

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, {
      Location: '/?scene=v2&view=underground&field=risk&portal=enterprise',
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  if (pathname === '/api/roof-risk/current') {
    sendJson(res, syncCurrentFromSelectedEvent());
    return;
  }

  if (pathname === '/api/roof-risk/history') {
    const current = syncCurrentFromSelectedEvent();
    sendJson(res, {
      api_version: 'RoofRisk API v1',
      mine_id: current.mine_id,
      face_id: current.face_id,
      event_id: current.event_id,
      points: buildRoofRiskHistory(current.risk),
    });
    return;
  }

  if (pathname === '/api/roof-risk/select' && req.method === 'POST') {
    readJsonBody(req).then(body => {
      const nextEvent = ROOF_RISK_EVENTS.find(event => event.event_id === body.event_id);
      if (!nextEvent) {
        sendJson(res, { error: 'Event not found', event_id: body.event_id }, 404);
        return;
      }
      selectedEventId = nextEvent.event_id;
      sendJson(res, {
        api_version: 'RoofRisk API v1',
        selected_event_id: selectedEventId,
        current: syncCurrentFromSelectedEvent(),
      });
    });
    return;
  }

  if (pathname === '/api/roof-risk/closed-loop/advance' && req.method === 'POST') {
    readJsonBody(req).then(body => {
      if (body.event_id && ROOF_RISK_EVENTS.some(event => event.event_id === body.event_id)) {
        selectedEventId = body.event_id;
      }
      if (body.action === 'reset') {
        selectedEventId = 'EVT-1206-20260822-001';
        applyClosedLoopState(0);
      } else if (body.action === 'archive') {
        applyClosedLoopState(2);
      } else {
        applyClosedLoopState(loopStateIndex + 1);
      }
      const current = syncCurrentFromSelectedEvent();
      sendJson(res, {
        api_version: 'RoofRisk API v1',
        event_id: current.event_id,
        closed_loop: current.closed_loop,
        disposal: current.disposal,
      });
    });
    return;
  }

  if (pathname === '/api/roof-risk/explain' || pathname === '/api/roof-risk/evaluate') {
    sendJson(res, buildEvaluatePayload(getSelectedEvent()));
    return;
  }

  if (pathname === '/api/roof-risk/events') {
    const current = syncCurrentFromSelectedEvent();
    sendJson(res, {
      api_version: 'RoofRisk API v1',
      selected_event_id: selectedEventId,
      total: ROOF_RISK_EVENTS.length,
      events: ROOF_RISK_EVENTS.map(event => {
        if (event.event_id !== selectedEventId) {
          return { ...event, selected: false };
        }
        return {
          ...event,
          risk_score: current.risk.score,
          risk_level: current.risk.level,
          stage: current.risk.stage,
          selected: true,
        };
      }),
    });
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendJson(res, { error: 'Not Found', path: pathname }, 404);
    return;
  }

  let filePath = pathname;
  if (filePath === '/') filePath = '/index.html';
  filePath = path.join(ROOT, filePath);

  // 安全检查：确保文件在项目目录内
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + req.url);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('========================================');
  console.log('  智慧矿山平台已启动！');
  console.log('  请在浏览器打开: http://localhost:' + PORT);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================');
});
