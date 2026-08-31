const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;

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
  },
  risk: {
    score: 92,
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
  { offset: '当前', score: 92, stage: '顶板垮落预警' },
];

const ROOF_RISK_EVENTS = [
  {
    event_id: 'EVT-1206-20260822-001',
    mine_id: 'M01',
    mine_name: '示范矿井',
    face_id: '1206',
    risk_score: 92,
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
    },
    trigger: ['separation', 'support_resistance', 'microseismic_energy'],
    explanation: '离层量、支架阻力和微震能量多源耦合异常，应力场与位移场热点在工作面出口叠加。',
    contribution: { stress: 0.36, displacement: 0.28, support: 0.22, microseismic: 0.14 },
  },
  'EVT-QL303-20260822-002': {
    timestamp: '2026-08-22 09:18:00',
    metrics: {
      roof_stress: { value: 27.6, unit: 'MPa', status: 'warning' },
      separation: { value: 24.5, unit: 'mm', status: 'warning' },
      subsidence: { value: 19.8, unit: 'mm', status: 'watch' },
      support_resistance: { value: 10960, unit: 'kN', status: 'danger' },
      anchor_load: { value: 172, unit: 'kN', status: 'watch' },
      microseismic_energy: { value: 920, unit: 'J', status: 'warning' },
    },
    trigger: ['support_resistance', 'roof_stress'],
    explanation: '303盘区支架工作阻力异常抬升，顶板应力同步上行，但位移离层尚未形成红色耦合。',
    contribution: { stress: 0.31, displacement: 0.19, support: 0.38, microseismic: 0.12 },
  },
  'EVT-DY215-20260822-003': {
    timestamp: '2026-08-22 09:05:00',
    metrics: {
      roof_stress: { value: 21.8, unit: 'MPa', status: 'watch' },
      separation: { value: 18.4, unit: 'mm', status: 'watch' },
      subsidence: { value: 12.6, unit: 'mm', status: 'safe' },
      support_resistance: { value: 9020, unit: 'kN', status: 'safe' },
      anchor_load: { value: 154, unit: 'kN', status: 'safe' },
      microseismic_energy: { value: 520, unit: 'J', status: 'watch' },
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

function syncCurrentFromSelectedEvent() {
  const event = getSelectedEvent();
  const profile = EVENT_PROFILES[event.event_id] || EVENT_PROFILES['EVT-1206-20260822-001'];
  const progress = event.closed_loop_progress ?? 0;
  const isClosed = progress >= 100 || event.status === 'closed';

  ROOF_RISK_CURRENT.mine_id = event.mine_id;
  ROOF_RISK_CURRENT.mine_name = event.mine_name;
  ROOF_RISK_CURRENT.face_id = event.face_id;
  ROOF_RISK_CURRENT.event_id = event.event_id;
  ROOF_RISK_CURRENT.timestamp = profile.timestamp || event.created_at;
  ROOF_RISK_CURRENT.metrics = profile.metrics;
  ROOF_RISK_CURRENT.risk.score = event.risk_score;
  ROOF_RISK_CURRENT.risk.level = event.risk_level;
  ROOF_RISK_CURRENT.risk.stage = event.stage;
  ROOF_RISK_CURRENT.risk.trigger = profile.trigger;
  ROOF_RISK_CURRENT.risk.explanation = profile.explanation;
  ROOF_RISK_CURRENT.risk.contribution = profile.contribution;
  ROOF_RISK_CURRENT.disposal.status = isClosed ? 'closed' : event.status;
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
      points: ROOF_RISK_HISTORY,
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
    const current = syncCurrentFromSelectedEvent();
    sendJson(res, {
      api_version: 'RoofRisk API v1',
      event_id: current.event_id,
      risk: current.risk,
      disposal: current.disposal,
      model_output: {
        confidence: 0.87,
        method: '多源指标归一化 + 趋势修正 + 空间联动修正',
        interface_mode: 'demo payload; replaceable by teammate model service',
      },
    });
    return;
  }

  if (pathname === '/api/roof-risk/events') {
    sendJson(res, {
      api_version: 'RoofRisk API v1',
      selected_event_id: selectedEventId,
      total: ROOF_RISK_EVENTS.length,
      events: ROOF_RISK_EVENTS.map(event => ({
        ...event,
        selected: event.event_id === selectedEventId,
      })),
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
