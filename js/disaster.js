/* ============================================================
   智慧矿山 — 灾害模拟模块
   支持：瓦斯爆炸 / 煤与瓦斯突出 / 顶板垮落 / 突水 / 自燃发火
   每种灾害按真实物理过程分阶段推进
   ============================================================ */

// 场景特效回调（由 scene.js 注入）
let fx = null;

// 模拟状态
let state = {
  active: false,
  type: null,
  phase: -1,
  phaseElapsed: 0,
  totalElapsed: 0,
  paused: false,
};

// 当前环境数据（"传感器真实值"）
let env = {
  gas: 0.32,    // CH4 %
  co: 8,        // CO ppm
  dust: 2.1,    // mg/m³
  temp: 24.5,   // °C
  wind: 2.8,    // m/s
  hum: 62,      // %RH
  o2: 20.8,     // O2 %
  roofPressure: 16.4,
  separation: 12.8,
  subsidence: 8.6,
  supportResistance: 8240,
  anchorLoad: 176,
  microseismicEnergy: 286,
};

// 正常值（用于复位）
const NORMAL = { ...env };

// 设备故障标记
let equipFaults = {};

// ==================== 灾害场景定义 ====================
// 每个场景由多个阶段(phase)组成，每个阶段有 duration(ms) 和数据变化目标

const SCENARIOS = {

  /* ---------- 1. 瓦斯爆炸 ---------- */
  gasExplosion: {
    name: '瓦斯爆炸',
    desc: '瓦斯积聚→达到爆炸浓度→遇火源引爆→冲击波+CO中毒',
    phases: [
      {
        name: '瓦斯异常涌出',
        duration: 6000,
        data: { gas: 1.2, temp: 25.5, co: 15, wind: 2.5, dust: 3.0 },
        alert: { level: 'warn', msg: '⚠️ 瓦斯浓度持续上升，检查通风系统' },
        fx: null,
      },
      {
        name: '瓦斯急剧积聚',
        duration: 4000,
        data: { gas: 5.8, temp: 27, co: 30, wind: 2.0, dust: 5.0 },
        alert: { level: 'danger', msg: '🚨 瓦斯浓度进入爆炸范围(5-16%)！立即撤人！' },
        fx: null,
      },
      {
        name: '爆炸',
        duration: 800,
        data: { gas: 0.08, temp: 85, co: 800, wind: 0.2, dust: 65, o2: 16.5, hum: 35 },
        alert: { level: 'danger', msg: '💥 瓦斯爆炸发生！！工作面遭受严重破坏' },
        fx: 'explosion',
      },
      {
        name: '灾后扩散',
        duration: 8000,
        data: { gas: 0.6, temp: 48, co: 350, wind: 0.6, dust: 25, o2: 17.8, hum: 40 },
        alert: { level: 'danger', msg: '🆘 灾后救援中…CO浓度极高，禁止入内' },
        fx: 'aftermath',
      },
    ],
  },

  /* ---------- 2. 煤与瓦斯突出 ---------- */
  outburst: {
    name: '煤与瓦斯突出',
    desc: '地应力+瓦斯压力骤释→煤岩抛出→瓦斯瞬间涌入巷道',
    phases: [
      {
        name: '突出前兆',
        duration: 3000,
        data: { gas: 0.8, temp: 25, co: 12, dust: 5.0, wind: 2.4 },
        alert: { level: 'warn', msg: '⚠️ 检测到微震信号，煤壁有异常声响' },
        fx: null,
      },
      {
        name: '突出发生',
        duration: 1500,
        data: { gas: 25.0, temp: 26, co: 60, dust: 120, wind: -1.5, o2: 15.0 },
        alert: { level: 'danger', msg: '🌋 煤与瓦斯突出！！大量煤岩抛出，瓦斯逆流' },
        fx: 'outburst',
      },
      {
        name: '瓦斯扩散',
        duration: 10000,
        data: { gas: 8.0, temp: 25, co: 40, dust: 45, wind: 0.8, o2: 16.2 },
        alert: { level: 'danger', msg: '🆘 瓦斯浓度极高，加强通风，严禁一切火源' },
        fx: 'aftermath',
      },
    ],
  },

  /* ---------- 3. 顶板垮落 ---------- */
  roofFall: {
    name: '顶板垮落',
    desc: '顶板压力超限→支护失效→大面积冒落→冲击+粉尘',
    phases: [
      {
        name: '压力异常',
        duration: 5000,
        data: { gas: 0.35, temp: 25, co: 10, dust: 4.0, wind: 2.7 },
        alert: { level: 'warn', msg: '⚠️ 液压支架压力持续升高，顶板离层监测异常' },
        fx: null,
      },
      {
        name: '局部冒落',
        duration: 2000,
        data: { gas: 0.40, temp: 25, co: 12, dust: 18, wind: 2.2 },
        alert: { level: 'warn', msg: '⚠️ 工作面局部掉渣，有冒顶迹象' },
        fx: 'smallFall',
      },
      {
        name: '大面积垮落',
        duration: 1000,
        data: { gas: 0.6, temp: 25.5, co: 15, dust: 80, wind: 0.5, o2: 19.2 },
        alert: { level: 'danger', msg: '🪨 大面积顶板垮落！巷道可能堵塞，粉尘暴增' },
        fx: 'roofFall',
      },
      {
        name: '灾后稳定',
        duration: 8000,
        data: { gas: 0.5, temp: 25, co: 12, dust: 30, wind: 1.5, o2: 19.8 },
        alert: { level: 'warn', msg: '⚠️ 灾后恢复中，监测余震和二次冒落' },
        fx: 'aftermath',
      },
    ],
  },

  /* ---------- 4. 突水事故 ---------- */
  waterInrush: {
    name: '突水事故',
    desc: '揭露含水层/老空区→水压突破隔水层→大量涌水',
    phases: [
      {
        name: '渗水征兆',
        duration: 5000,
        data: { gas: 0.30, temp: 23.5, co: 7, dust: 1.8, hum: 72, wind: 2.7 },
        alert: { level: 'warn', msg: '⚠️ 煤壁渗水增多，有"出汗"现象，水质异常' },
        fx: 'seepage',
      },
      {
        name: '突水发生',
        duration: 2000,
        data: { gas: 0.28, temp: 21, co: 5, dust: 0.8, hum: 98, wind: 0.3, o2: 19.5 },
        alert: { level: 'danger', msg: '🌊 突水发生！！大量涌水进入巷道，水位急速上升' },
        fx: 'waterInrush',
      },
      {
        name: '巷道淹没',
        duration: 8000,
        data: { gas: 0.25, temp: 19.5, co: 4, dust: 0.5, hum: 99, wind: 0.1, o2: 18.8 },
        alert: { level: 'danger', msg: '🆘 部分巷道已淹没，立即启动排水，切断电源' },
        fx: 'flooding',
      },
    ],
  },

  /* ---------- 5. 煤层自燃发火 ---------- */
  spontaneousCombustion: {
    name: '煤层自燃',
    desc: '采空区遗煤氧化蓄热→温度升高→CO增加→最终起火',
    phases: [
      {
        name: '缓慢氧化',
        duration: 8000,
        data: { gas: 0.30, temp: 28, co: 35, dust: 2.5, wind: 2.6, o2: 20.2 },
        alert: { level: 'warn', msg: '⚠️ 采空区CO浓度持续升高，温度异常上升' },
        fx: 'smoke',
      },
      {
        name: '加速升温',
        duration: 5000,
        data: { gas: 0.35, temp: 45, co: 120, dust: 4.0, wind: 2.4, o2: 19.0 },
        alert: { level: 'danger', msg: '🚨 采空区温度急剧升高，可能已出现明火' },
        fx: 'fireStart',
      },
      {
        name: '明火燃烧',
        duration: 10000,
        data: { gas: 0.40, temp: 65, co: 350, dust: 8.0, wind: 1.8, o2: 17.5 },
        alert: { level: 'danger', msg: '🔥 采空区已起火！烟雾扩散，立即封闭火区' },
        fx: 'fire',
      },
    ],
  },
};

Object.assign(SCENARIOS, {
  normalMonitor: {
    name: '正常监测',
    desc: '顶板压力、离层、下沉、支架阻力等指标处于正常监测状态',
    phases: [{
      name: '正常监测',
      duration: 3000,
      data: { gas: 0.32, temp: 24.5, co: 8, dust: 2.1, wind: 2.8, hum: 62, o2: 20.8, roofPressure: 16.8, separation: 13.5, subsidence: 8.8, supportResistance: 8350, anchorLoad: 178, microseismicEnergy: 290 },
      alert: { level: 'low', msg: '✅ 顶板监测数据稳定，系统处于正常巡检状态' },
      fx: 'roofRiskNormal',
    }],
  },
  roofPressureRise: {
    name: '顶板压力升高',
    desc: '工作面出口段顶板压力持续升高，进入关注阈值',
    phases: [{
      name: '压力升高',
      duration: 5000,
      data: { gas: 0.34, temp: 24.8, co: 9, dust: 3.2, wind: 2.7, hum: 63, roofPressure: 24.2, separation: 19.4, subsidence: 13.2, supportResistance: 9400, anchorLoad: 214, microseismicEnergy: 620 },
      alert: { level: 'warn', msg: '⚠️ 顶板压力持续升高，建议核查支护状态并降低推进速度' },
      fx: 'roofRiskWatch',
    }],
  },
  roofSeparationAlarm: {
    name: '离层异常',
    desc: '顶板离层量超过关注阈值，提示围岩结构劣化',
    phases: [{
      name: '离层异常',
      duration: 5000,
      data: { gas: 0.35, temp: 24.9, co: 10, dust: 4.6, wind: 2.5, hum: 64, roofPressure: 25.8, separation: 30.5, subsidence: 19.8, supportResistance: 9800, anchorLoad: 236, microseismicEnergy: 860 },
      alert: { level: 'warn', msg: '⚠️ 顶板离层量异常增大，需复核锚杆锚索受力与围岩变形' },
      fx: 'roofRiskWarn',
    }],
  },
  supportResistanceAlarm: {
    name: '支架阻力异常',
    desc: '液压支架工作阻力异常，顶板来压风险增大',
    phases: [{
      name: '支架阻力异常',
      duration: 5000,
      data: { gas: 0.36, temp: 25, co: 10, dust: 6.5, wind: 2.3, hum: 65, roofPressure: 27.2, separation: 31.8, subsidence: 22.4, supportResistance: 10350, anchorLoad: 252, microseismicEnergy: 980 },
      alert: { level: 'warn', msg: '⚠️ 液压支架工作阻力异常，建议联动采煤机降速或停机检查' },
      fx: 'supportOverload',
    }],
  },
  roofFallWarning: {
    name: '顶板垮落预警',
    desc: '多源指标耦合异常，触发顶板灾变红色预警',
    phases: [
      {
        name: '红色预警',
        duration: 3500,
        data: { gas: 0.42, temp: 25.2, co: 13, dust: 18, wind: 1.8, hum: 67, roofPressure: 30.6, separation: 36.8, subsidence: 28.4, supportResistance: 11200, anchorLoad: 276, microseismicEnergy: 1480 },
        alert: { level: 'danger', msg: '🚨 顶板灾变红色预警：离层、支架阻力与微震信号耦合异常' },
        fx: 'roofRiskDanger',
      },
      {
        name: '局部垮落',
        duration: 1800,
        data: { gas: 0.48, temp: 25.5, co: 15, dust: 72, wind: 0.9, o2: 19.4, roofPressure: 33.0, separation: 40.0, subsidence: 34.0, supportResistance: 11800, anchorLoad: 292, microseismicEnergy: 1850 },
        alert: { level: 'danger', msg: '🪨 局部顶板垮落，立即撤人、停机并封控工作面出口段' },
        fx: 'roofFall',
      },
    ],
  },
  emergencyResponse: {
    name: '应急处置演示',
    desc: '触发停机、撤人、封控、补强支护等可视化处置流程',
    phases: [{
      name: '应急处置',
      duration: 7000,
      data: { gas: 0.38, temp: 25, co: 12, dust: 24, wind: 1.6, o2: 19.8, hum: 66, roofPressure: 22.5, separation: 27.0, subsidence: 20.5, supportResistance: 9200, anchorLoad: 228, microseismicEnergy: 720 },
      alert: { level: 'danger', msg: '🆘 应急处置：采煤机停机、人员撤离、加强支护并持续监测余震' },
      fx: 'emergencyControl',
    }],
  },
});

// ==================== API ====================

/** 初始化，注入场景特效回调 */
export function init(effectCallbacks) {
  fx = effectCallbacks;
}

/** 获取当前环境数据（供 main.js 读取） */
export function getEnvData() {
  return { ...env };
}

/** 获取当前设备故障标记 */
export function getEquipFaults() {
  return { ...equipFaults };
}

/** 是否正在模拟 */
export function isActive() {
  return state.active;
}

/** 获取当前状态摘要（供 UI 显示） */
export function getState() {
  if (!state.active) return { active: false };
  const scenario = SCENARIOS[state.type];
  const phase = scenario.phases[state.phase];
  return {
    active: true,
    type: state.type,
    name: scenario.name,
    phaseName: phase ? phase.name : '',
    alert: phase ? phase.alert : null,
    progress: state.phase >= 0 ? state.phaseElapsed / phase.duration : 0,
  };
}

/** 启动某个灾害 */
export function startDisaster(type) {
  if (!SCENARIOS[type]) return;

  // 先复位
  resetDisaster();

  state.active = true;
  state.type = type;
  state.phase = 0;
  state.phaseElapsed = 0;
  state.totalElapsed = 0;

  // 标记设备故障
  if (type === 'gasExplosion' || type === 'outburst') {
    equipFaults = { '\u91c7\u7164\u673a MG650/1620': '\u505c\u673a' };
  } else if (type === 'roofFall' || type === 'supportResistanceAlarm' || type === 'roofFallWarning' || type === 'emergencyResponse') {
    equipFaults = { '\u6db2\u538b\u652f\u67b6\u7ec4 ZY12000': '\u8fc7\u8f7d', '\u91c7\u7164\u673a MG650/1620': '\u505c\u673a' };
  } else if (type === 'roofPressureRise' || type === 'roofSeparationAlarm') {
    equipFaults = { '\u6db2\u538b\u652f\u67b6\u7ec4 ZY12000': '\u8fc7\u8f7d' };
  } else if (type === 'waterInrush') {
    equipFaults = { '\u91c7\u7164\u673a MG650/1620': '\u505c\u673a' };
  } else if (type === 'spontaneousCombustion') {
    equipFaults = {};
  }

  // 触发场景第一个阶段
  advancePhase();
}

/** 重置到正常状态 */
export function resetDisaster() {
  state.active = false;
  state.type = null;
  state.phase = -1;
  state.phaseElapsed = 0;
  state.totalElapsed = 0;
  env = { ...NORMAL };
  equipFaults = {};
  if (fx && fx.reset) fx.reset();
}

// ==================== 内部逻辑 ====================

function advancePhase() {
  const scenario = SCENARIOS[state.type];
  const phase = scenario.phases[state.phase];
  if (!phase) return;

  // 触发视觉效果
  if (phase.fx && fx && fx[phase.fx]) {
    fx[phase.fx]();
  }
}

/** 每帧/每秒调用一次 */
export function tick(dt) {
  if (!state.active) return;

  // 如果阶段是 -1（比如 pause），就跳过
  if (state.phase < 0) return;

  state.phaseElapsed += dt;
  state.totalElapsed += dt;

  const scenario = SCENARIOS[state.type];
  const phase = scenario.phases[state.phase];
  if (!phase) return;

  const t = Math.min(state.phaseElapsed / phase.duration, 1.0);

  // 缓动函数（easeInOutQuad）
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // 插值环境数据
  // 需要知道起始值——从上一阶段结束值或 NORMAL 开始
  for (const [key, targetVal] of Object.entries(phase.data)) {
    const startVal = getPhaseStartValue(key);
    env[key] = startVal + (targetVal - startVal) * ease;
  }

  // 阶段结束，进入下一阶段
  if (t >= 1.0) {
    if (state.phase >= scenario.phases.length - 1) {
      // 所有阶段完成，保持最后状态
      state.phase = scenario.phases.length - 1; // 停在最后阶段
      // 不自动停止，让用户可以看到最终状态然后手动重置
      state.phaseElapsed = phase.duration;
    } else {
      state.phase++;
      state.phaseElapsed = 0;
      advancePhase();
    }
  }
}

/** 获取某个数据项在当前阶段开始时的值 */
function getPhaseStartValue(key) {
  const scenario = SCENARIOS[state.type];
  if (state.phase <= 0) return NORMAL[key] !== undefined ? NORMAL[key] : env[key];

  // 上一阶段的目标值
  const prevPhase = scenario.phases[state.phase - 1];
  if (prevPhase && prevPhase.data && prevPhase.data[key] !== undefined) {
    return prevPhase.data[key];
  }
  return env[key];
}

/** 可用的灾害列表（供 UI 渲染） */
export function getDisasterList() {
  const primaryFlow = [
    'normalMonitor',
    'roofPressureRise',
    'roofSeparationAlarm',
    'supportResistanceAlarm',
    'roofFallWarning',
    'emergencyResponse',
  ];
  return primaryFlow.map(key => ({
    id: key,
    name: SCENARIOS[key].name,
    desc: SCENARIOS[key].desc,
  }));
}
