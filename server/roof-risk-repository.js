'use strict';

const EXPECTED_SOURCE_HASH = '86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A';
const EXPECTED_ROW_COUNT = 20000;
const API_VERSION = 'RoofRisk API v1';
const DATA_SOURCE = 'teacher_real_csv_xgboost';

const RISK_META = {
  低风险: {
    eventId: 'REAL-LOW-001',
    level: 'green',
    stage: '正常监测',
    status: 'watching',
    progress: 12,
    actions: ['持续采集', '核验数据质量', '保持常态巡检'],
  },
  一般风险: {
    eventId: 'REAL-GENERAL-001',
    level: 'yellow',
    stage: '黄色关注',
    status: 'watching',
    progress: 36,
    actions: ['提高采样频率', '复核支护状态', '跟踪指标趋势'],
  },
  较大风险: {
    eventId: 'REAL-MAJOR-001',
    level: 'orange',
    stage: '支架阻力异常',
    status: 'confirmed',
    progress: 68,
    actions: ['现场复测', '调整支护参数', '提交监管复核'],
  },
  重大风险: {
    eventId: 'REAL-SEVERE-001',
    level: 'red',
    stage: '顶板垮落预警',
    status: 'processing',
    progress: 83,
    actions: ['立即停机', '人员撤离', '封控区域', '补强支护'],
  },
};

const LOOP_STATES = [
  { progress: 36, active: 'enterprise_detect', label: '企业端识别' },
  { progress: 68, active: 'regulator_supervise', label: '监管端复核督办' },
  { progress: 83, active: 'enterprise_disposal', label: '企业端现场处置' },
  { progress: 90, active: 'regulator_supervise', label: '监管端复核督办' },
  { progress: 100, active: 'archive', label: '三端闭环归档' },
];

const LOOP_STEPS = [
  ['enterprise_detect', '企业端识别', '企业端'],
  ['enterprise_disposal', '现场处置', '企业端'],
  ['regulator_supervise', '监管督办', '监管端'],
  ['expert_explain', '模型复核', '智库端'],
  ['archive', '闭环归档', '三端共享'],
];

class RoofRiskRepositoryError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'RoofRiskRepositoryError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function assertArtifact(artifact) {
  if (!artifact || artifact.schema_version !== 1) {
    throw new Error('unsupported RoofRisk dataset schema');
  }
  if (artifact.source?.sha256 !== EXPECTED_SOURCE_HASH) {
    throw new Error('source SHA-256 mismatch');
  }
  if (artifact.source?.row_count !== EXPECTED_ROW_COUNT || artifact.records?.length !== EXPECTED_ROW_COUNT) {
    throw new Error(`RoofRisk dataset must contain ${EXPECTED_ROW_COUNT} records`);
  }
  if (artifact.model?.name !== 'xgboost') {
    throw new Error('RoofRisk dataset must use xgboost');
  }
  if (!Array.isArray(artifact.model.classes) || artifact.model.classes.length !== 4) {
    throw new Error('RoofRisk dataset must define four classes');
  }
  if (!Array.isArray(artifact.model.class_keys) || artifact.model.class_keys.length !== 4) {
    throw new Error('RoofRisk dataset must define four class keys');
  }
  if (!Array.isArray(artifact.feature_schema) || artifact.feature_schema.length !== 8) {
    throw new Error('RoofRisk dataset must define eight input features');
  }

  const ids = new Set();
  for (const record of artifact.records) {
    if (!record.id || ids.has(record.id)) throw new Error(`duplicate or missing record id: ${record.id}`);
    ids.add(record.id);
    if (!Array.isArray(record.values) || record.values.length !== 7 || !record.values.every(Number.isFinite)) {
      throw new Error(`invalid feature values for ${record.id}`);
    }
    if (!Array.isArray(record.standardized_values)
      || record.standardized_values.length !== 7
      || !record.standardized_values.every(Number.isFinite)) {
      throw new Error(`invalid standardized values for ${record.id}`);
    }
    if (!Array.isArray(record.probabilities)
      || record.probabilities.length !== 4
      || !record.probabilities.every(Number.isFinite)) {
      throw new Error(`invalid probabilities for ${record.id}`);
    }
    const probabilitySum = record.probabilities.reduce((sum, value) => sum + value, 0);
    if (Math.abs(probabilitySum - 1) > 1e-4) throw new Error(`probabilities do not sum to one for ${record.id}`);
  }

  for (const label of Object.keys(RISK_META)) {
    const recordId = artifact.representatives?.[label];
    if (!recordId || !ids.has(recordId)) throw new Error(`missing representative for ${label}`);
    const window = artifact.history_windows?.[recordId];
    if (!Array.isArray(window) || !window.length || window.some((id) => !ids.has(id))) {
      throw new Error(`invalid history window for ${label}`);
    }
  }
}

function metricStatus(standardizedValue, qualityValue = null) {
  if (qualityValue !== null) return qualityValue === '正常' ? 'safe' : 'warning';
  const magnitude = Math.abs(standardizedValue);
  if (magnitude >= 2) return 'danger';
  if (magnitude >= 1) return 'warning';
  return 'safe';
}

function loopStateForProgress(progress) {
  return LOOP_STATES.reduce((selected, state) => (
    state.progress <= progress ? state : selected
  ), LOOP_STATES[0]);
}

function stepStatuses(progress) {
  if (progress >= 100) return ['done', 'done', 'done', 'done', 'done'];
  if (progress >= 83) return ['done', 'active', 'active', 'done', 'pending'];
  if (progress >= 68) return ['done', 'done', 'active', 'done', 'pending'];
  if (progress >= 36) return ['done', 'pending', 'active', 'done', 'pending'];
  return ['active', 'pending', 'pending', 'done', 'pending'];
}

function nextProgress(current) {
  return LOOP_STATES.find((state) => state.progress > current)?.progress ?? 100;
}

function createRoofRiskRepository(artifact) {
  assertArtifact(artifact);
  const recordsById = new Map(artifact.records.map((record) => [record.id, record]));
  const schemaByKey = new Map(artifact.feature_schema.map((feature) => [feature.key, feature]));
  const eventById = new Map();
  const eventByLabel = new Map();
  const loopProgress = new Map();

  for (const [label, meta] of Object.entries(RISK_META)) {
    const recordId = artifact.representatives[label];
    const event = { ...meta, trueClass: label, recordId };
    eventById.set(meta.eventId, event);
    eventByLabel.set(label, event);
    loopProgress.set(meta.eventId, meta.progress);
  }

  let selectedEventId = RISK_META.重大风险.eventId;

  function getEvent(eventId = selectedEventId) {
    const event = eventById.get(eventId);
    if (!event) {
      throw new RoofRiskRepositoryError('EVENT_NOT_FOUND', `Event not found: ${eventId}`, 404, { event_id: eventId });
    }
    return event;
  }

  function getRecord(recordId) {
    const record = recordsById.get(recordId);
    if (!record) {
      throw new RoofRiskRepositoryError('RECORD_NOT_FOUND', `Record not found: ${recordId}`, 404, { record_id: recordId });
    }
    return record;
  }

  function featureEvidence(record) {
    const numericSchema = artifact.feature_schema.slice(0, 7);
    const ranked = numericSchema.map((feature, index) => ({
      key: feature.key,
      label: feature.label,
      unit: feature.unit,
      value: record.values[index],
      model_value: record.model_values?.[index] ?? record.values[index],
      standardized_value: record.standardized_values[index],
      magnitude: Math.abs(record.standardized_values[index]),
    })).sort((left, right) => right.magnitude - left.magnitude);
    const total = ranked.reduce((sum, item) => sum + item.magnitude, 0) || 1;
    return ranked.slice(0, 3).map((item) => ({
      ...item,
      contribution: Number((item.magnitude / total).toFixed(6)),
    }));
  }

  function modelOutput(record) {
    const probabilities = Object.fromEntries(
      artifact.model.class_keys.map((key, index) => [key, record.probabilities[index]]),
    );
    return {
      best_model: artifact.model.name,
      model_accuracy: artifact.model.accuracy,
      model_macro_f1: artifact.model.macro_f1,
      probabilities,
      confidence: record.confidence,
      true_class: record.true_class,
      predicted_class: record.predicted_class,
      matches_label: record.matches_label,
      record_id: record.id,
      preprocessing: '按设备时间切段 + 卡尔曼平滑 + 标准化 + 数据质量编码',
    };
  }

  function metricsFor(record) {
    const metrics = {};
    artifact.feature_schema.slice(0, 7).forEach((feature, index) => {
      metrics[feature.key] = {
        value: record.values[index],
        model_value: record.model_values?.[index] ?? record.values[index],
        unit: feature.unit,
        status: metricStatus(record.standardized_values[index]),
      };
    });
    metrics.data_quality = {
      value: record.quality,
      unit: null,
      status: metricStatus(0, record.quality),
    };
    return metrics;
  }

  function provenanceFor(record) {
    return {
      source_name: artifact.source.name,
      source_sha256: artifact.source.sha256,
      source_row_count: artifact.source.row_count,
      inference_built_at: artifact.inference_built_at,
      original_timestamp: record.time,
      device_id: record.device_id,
      record_id: record.id,
    };
  }

  function closedLoopFor(event) {
    const progress = loopProgress.get(event.eventId);
    const state = loopStateForProgress(progress);
    const statuses = stepStatuses(progress);
    const isClosed = progress >= 100;
    const steps = LOOP_STEPS.map(([key, label, owner], index) => ({
      key,
      label,
      owner,
      status: statuses[index],
      detail: index === 3
        ? 'XGBoost 已输出四级概率、预测标签和三项特征证据。'
        : `${owner}按${event.stage}要求执行${label}。`,
    }));
    return {
      active_step: state.active,
      active_step_label: state.label,
      progress,
      started_at: getRecord(event.recordId).time,
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      command: isClosed ? '风险事件已完成三端确认并归档。' : event.actions.join('、'),
      steps,
      portal_roles: {
        enterprise: {
          title: '现场执行',
          status: isClosed ? '已闭环' : event.status === 'processing' ? '处置中' : '跟踪中',
          primary: event.actions.join('、'),
          next: isClosed ? '查看事件复盘报告' : '持续回传真实监测趋势和现场处置状态',
        },
        regulator: {
          title: '远程督办',
          status: isClosed ? '准予闭环' : progress >= 68 ? '复核中' : '关注中',
          primary: `核验${event.stage}处置措施`,
          next: isClosed ? '归档监管记录' : '核验企业端反馈并决定是否升级督办',
        },
        expert: {
          title: '模型解释',
          status: isClosed ? '已归档' : '已解释',
          primary: '核验真实标签、模型预测与特征证据',
          next: isClosed ? '保留模型复盘记录' : '向监管端同步概率与判别依据',
        },
      },
    };
  }

  function currentForEvent(event) {
    const record = getRecord(event.recordId);
    const evidence = featureEvidence(record);
    const totalMagnitude = evidence.reduce((sum, item) => sum + item.magnitude, 0) || 1;
    const contribution = Object.fromEntries(
      evidence.map((item) => [item.key, Number((item.magnitude / totalMagnitude).toFixed(6))]),
    );
    const explanation = `${evidence.map((item) => item.label).join('、')}为当前记录的主要标准化特征证据，XGBoost 判定为${record.predicted_class}。`;
    const closedLoop = closedLoopFor(event);
    return {
      api_version: API_VERSION,
      data_source: DATA_SOURCE,
      mine_id: 'TEACHER-REAL-DATA',
      mine_name: '老师提供的真实监测数据',
      face_id: record.device_id,
      event_id: event.eventId,
      timestamp: record.time,
      feature_schema: artifact.feature_schema,
      metrics: metricsFor(record),
      risk: {
        score: record.risk_score,
        level: event.level,
        stage: event.stage,
        trigger: evidence.map((item) => item.key),
        explanation,
        contribution,
        evidence_method: 'standardized_feature_magnitude',
      },
      model_output: modelOutput(record),
      feature_evidence: evidence,
      provenance: provenanceFor(record),
      disposal: {
        status: closedLoop.progress >= 100 ? 'closed' : event.status,
        actions: event.actions,
        closed_loop_rate: closedLoop.progress / 100,
      },
      closed_loop: closedLoop,
    };
  }

  function listEvents() {
    const events = Object.values(RISK_META).map((meta) => {
      const event = getEvent(meta.eventId);
      const record = getRecord(event.recordId);
      const progress = loopProgress.get(event.eventId);
      return {
        event_id: event.eventId,
        mine_id: 'TEACHER-REAL-DATA',
        mine_name: '老师提供的真实监测数据',
        face_id: record.device_id,
        risk_score: record.risk_score,
        risk_level: event.level,
        true_class: record.true_class,
        predicted_class: record.predicted_class,
        confidence: record.confidence,
        stage: event.stage,
        status: progress >= 100 ? 'closed' : event.status,
        owner: '企业端',
        regulator_status: progress >= 100 ? '准予闭环' : progress >= 68 ? '复核中' : '关注中',
        closed_loop_progress: progress,
        active_step: loopStateForProgress(progress).label,
        supervision: `核验${event.stage}的真实监测记录和处置反馈。`,
        feedback: progress >= 100 ? '事件已归档' : '等待现场处置状态回传',
        expert_summary: `XGBoost 置信度 ${(record.confidence * 100).toFixed(2)}%，真实标签与预测${record.matches_label ? '一致' : '不一致'}。`,
        created_at: record.time,
        record_id: record.id,
        selected: event.eventId === selectedEventId,
      };
    });
    return {
      api_version: API_VERSION,
      selected_event_id: selectedEventId,
      total: events.length,
      events,
    };
  }

  return {
    getCurrent() {
      return currentForEvent(getEvent());
    },

    getHistory() {
      const event = getEvent();
      const ids = artifact.history_windows[event.recordId];
      const points = ids.map((recordId) => {
        const record = getRecord(recordId);
        const recordEvent = eventByLabel.get(record.predicted_class) || event;
        return {
          record_id: record.id,
          timestamp: record.time,
          metrics: metricsFor(record),
          score: record.risk_score,
          level: recordEvent.level,
          stage: recordEvent.stage,
          true_class: record.true_class,
          predicted_class: record.predicted_class,
          confidence: record.confidence,
        };
      }).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
      return {
        api_version: API_VERSION,
        event_id: event.eventId,
        record_id: event.recordId,
        feature_schema: artifact.feature_schema,
        points,
        provenance: provenanceFor(getRecord(event.recordId)),
      };
    },

    getExplain() {
      const current = currentForEvent(getEvent());
      return {
        api_version: API_VERSION,
        event_id: current.event_id,
        risk: current.risk,
        model_output: current.model_output,
        feature_evidence: current.feature_evidence,
        provenance: current.provenance,
        disposal: current.disposal,
      };
    },

    listEvents,

    selectEvent(eventId) {
      getEvent(eventId);
      selectedEventId = eventId;
      return { selected_event_id: selectedEventId, current: currentForEvent(getEvent()) };
    },

    evaluateRecord(recordId) {
      const record = getRecord(recordId);
      const event = eventByLabel.get(record.predicted_class) || getEvent();
      return {
        api_version: API_VERSION,
        record_id: record.id,
        timestamp: record.time,
        metrics: metricsFor(record),
        risk: currentForEvent({ ...event, recordId: record.id }).risk,
        model_output: modelOutput(record),
        feature_evidence: featureEvidence(record),
        provenance: provenanceFor(record),
      };
    },

    advanceClosedLoop(action) {
      if (!['advance', 'archive', 'reset'].includes(action)) {
        throw new RoofRiskRepositoryError('INVALID_ACTION', `Unsupported closed-loop action: ${action}`, 400, { action });
      }
      const event = getEvent();
      const initialProgress = event.progress;
      if (action === 'reset') loopProgress.set(event.eventId, initialProgress);
      if (action === 'archive') loopProgress.set(event.eventId, 100);
      if (action === 'advance') loopProgress.set(event.eventId, nextProgress(loopProgress.get(event.eventId)));
      const current = currentForEvent(event);
      return {
        api_version: API_VERSION,
        event_id: event.eventId,
        closed_loop: current.closed_loop,
        disposal: current.disposal,
      };
    },
  };
}

module.exports = {
  EXPECTED_SOURCE_HASH,
  RoofRiskRepositoryError,
  createRoofRiskRepository,
};
