import { buildRoofRiskChartModel } from './roof-risk-chart-model.mjs';

const CHART_IDS = [
  'thresholdTrendChart',
  'regulatorDistributionChart',
  'expertProbabilityChart',
  'expertDeviationChart',
];

const SERIES_COLORS = ['#32c7d9', '#f2b84b', '#50c878', '#d6e2e8', '#f05b5b', '#7fa4b8', '#a9c7d3'];
const RISK_COLORS = { red: '#f05b5b', orange: '#ef8f4e', yellow: '#f2b84b', green: '#50c878' };
const chartInstances = new Map();
let resizeObserver = null;
let themeRegistered = false;

function registerTheme() {
  if (themeRegistered || typeof echarts === 'undefined') return;
  echarts.registerTheme('smartMineIndustrial', {
    color: SERIES_COLORS,
    backgroundColor: 'transparent',
    textStyle: { color: '#a7b7c0', fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif' },
    title: { textStyle: { color: '#e8f1f5' } },
    legend: { textStyle: { color: '#9db0ba' } },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#34444d' } },
      axisTick: { show: false },
      axisLabel: { color: '#81949e' },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#81949e' },
      splitLine: { lineStyle: { color: '#26343b', type: 'dashed' } },
    },
  });
  themeRegistered = true;
}

function getResizeObserver() {
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target, contentRect }) => {
        if (!contentRect.width || !contentRect.height) return;
        const chart = echarts.getInstanceByDom(target);
        if (chart && !chart.isDisposed()) chart.resize();
      });
    });
  }
  return resizeObserver;
}

function initChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom || !dom.clientWidth || !dom.clientHeight || typeof echarts === 'undefined') return null;
  registerTheme();
  let chart = echarts.getInstanceByDom(dom);
  if (!chart) chart = echarts.init(dom, 'smartMineIndustrial', { renderer: 'canvas' });
  chartInstances.set(domId, chart);
  getResizeObserver()?.observe(dom);
  return chart;
}

function chartFor(domId) {
  const stored = chartInstances.get(domId);
  if (stored && !stored.isDisposed()) return stored;
  return initChart(domId);
}

function timeLabel(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--';
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function numberLabel(value, maximumFractionDigits = 2) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits }).format(Number(value))
    : '--';
}

function baseTooltip(trigger = 'item') {
  return {
    trigger,
    renderMode: 'richText',
    confine: true,
    backgroundColor: '#10191e',
    borderColor: '#3b4c55',
    borderWidth: 1,
    textStyle: { color: '#e8f1f5', fontSize: 12 },
    extraCssText: 'box-shadow:none;',
  };
}

function emptyGraphic(message) {
  return [{
    type: 'text',
    left: 'center',
    top: 'middle',
    silent: true,
    style: { text: message, fill: '#70838d', font: '12px Segoe UI, Microsoft YaHei, sans-serif' },
  }];
}

function thresholdTrendOption(model) {
  const visibleSeries = model.thresholdTrend.series.slice(0, 4);
  if (!visibleSeries.length) return { series: [], graphic: emptyGraphic('暂无连续历史数据') };
  return {
    animationDuration: 320,
    grid: { left: 48, right: 18, top: 44, bottom: 32, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    legend: { top: 0, left: 0, type: 'scroll', itemWidth: 18, itemHeight: 3, itemGap: 14, textStyle: { fontSize: 10 } },
    tooltip: {
      ...baseTooltip('axis'),
      axisPointer: { type: 'line', lineStyle: { color: '#607681', type: 'dashed' } },
      formatter(params) {
        if (!Array.isArray(params) || !params.length) return '';
        const lines = [timeLabel(params[0].value?.[0])];
        params.forEach((param) => {
          const raw = param.data?.rawValue;
          const unit = param.data?.unit || '';
          lines.push(`${param.seriesName}  ${numberLabel(raw)} ${unit}  /  ${numberLabel(param.value?.[1], 1)}% P95`);
        });
        return lines.join('\n');
      },
    },
    xAxis: { type: 'time', boundaryGap: false, axisLabel: { formatter: (value) => timeLabel(value), hideOverlap: true, fontSize: 10 } },
    yAxis: {
      type: 'value',
      name: 'P95 阈值指数 (%)',
      nameTextStyle: { color: '#81949e', fontSize: 10, padding: [0, 0, 4, 0] },
      axisLabel: { formatter: '{value}%', fontSize: 10 },
      min: (range) => Math.min(0, Math.floor(range.min / 25) * 25),
    },
    series: visibleSeries.map((item, index) => ({
      id: item.key,
      name: item.label,
      type: 'line',
      showSymbol: false,
      smooth: 0.22,
      sampling: 'lttb',
      lineStyle: { width: index === 0 ? 2.2 : 1.5 },
      emphasis: { focus: 'series' },
      data: item.points.map((point) => ({ value: [point.timestamp, point.index], rawValue: point.rawValue, unit: point.unit })),
      markLine: index === 0 ? {
        silent: true,
        symbol: 'none',
        label: { formatter: 'P95 参考线', color: '#f2b84b', fontSize: 10 },
        lineStyle: { color: '#f2b84b', width: 1, type: 'dashed' },
        data: [{ yAxis: model.thresholdTrend.reference }],
      } : undefined,
    })),
  };
}

function horizontalBarOption(source, { valueKey, valueMax, labelFormatter, tooltipFormatter, color }) {
  if (!source.length) return { series: [], graphic: emptyGraphic('暂无真实数据') };
  return {
    animationDuration: 280,
    dataset: { source },
    grid: { left: 78, right: 42, top: 8, bottom: 12, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    tooltip: { ...baseTooltip('item'), formatter: tooltipFormatter },
    xAxis: { type: 'value', max: valueMax, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category', inverse: true, axisLabel: { fontSize: 11 }, axisLine: { show: false } },
    series: [{
      type: 'bar',
      encode: { x: valueKey, y: 'label' },
      barWidth: 10,
      showBackground: true,
      backgroundStyle: { color: '#202c32', borderRadius: 2 },
      itemStyle: { color, borderRadius: 2 },
      label: { show: true, position: 'right', color: '#d6e2e8', fontSize: 11, formatter: labelFormatter },
    }],
  };
}

function distributionOption(model) {
  return horizontalBarOption(model.distribution, {
    valueKey: 'count',
    valueMax: (value) => Math.max(1, Math.ceil(value.max * 1.3)),
    color: (params) => RISK_COLORS[params.data.key] || '#7fa4b8',
    labelFormatter: (params) => `${params.value.count} 条 · ${numberLabel(params.value.percent, 1)}%`,
    tooltipFormatter: (params) => `${params.value.label}\n${params.value.count} 条事件 · ${numberLabel(params.value.percent, 1)}%`,
  });
}

function probabilityOption(model) {
  return horizontalBarOption(model.probabilities, {
    valueKey: 'percent',
    valueMax: 100,
    color: (params) => RISK_COLORS[params.data.key === 'severe' ? 'red' : params.data.key === 'major' ? 'orange' : params.data.key === 'general' ? 'yellow' : 'green'],
    labelFormatter: (params) => `${numberLabel(params.value.percent, 3)}%`,
    tooltipFormatter: (params) => `${params.value.label}\n模型概率 ${numberLabel(params.value.percent, 3)}%`,
  });
}

function deviationOption(model) {
  if (!model.deviations.length) return { series: [], graphic: emptyGraphic('暂无标准化特征证据') };
  const source = model.deviations.map((item) => ({ ...item, magnitude: Math.abs(item.deviation) }));
  return horizontalBarOption(source, {
    valueKey: 'magnitude',
    valueMax: (value) => Math.max(1, Math.ceil(value.max * 1.25)),
    color: (params) => Math.abs(params.data.deviation) >= 2 ? '#f05b5b' : '#32c7d9',
    labelFormatter: (params) => `${params.value.deviation >= 0 ? '+' : ''}${numberLabel(params.value.deviation, 2)}σ`,
    tooltipFormatter: (params) => `${params.value.label}\n标准化偏离 ${params.value.deviation >= 0 ? '+' : ''}${numberLabel(params.value.deviation, 2)}σ\n原始值 ${numberLabel(params.value.rawValue)} ${params.value.unit || ''}`,
  });
}

export function initPortalCharts() {
  CHART_IDS.forEach(initChart);
  return chartInstances;
}

export function updateRoofRiskCharts({ current = {}, history = {}, events = {} } = {}) {
  const model = buildRoofRiskChartModel(current, history, events);
  const options = {
    thresholdTrendChart: thresholdTrendOption(model),
    regulatorDistributionChart: distributionOption(model),
    expertProbabilityChart: probabilityOption(model),
    expertDeviationChart: deviationOption(model),
  };

  Object.entries(options).forEach(([domId, option]) => {
    const chart = chartFor(domId);
    if (!chart) return;
    const currentSeries = chart.getOption()?.series?.length || 0;
    const nextSeries = option.series?.length || 0;
    chart.setOption(option, { notMerge: currentSeries !== nextSeries });
  });
  return model;
}

export function clearRoofRiskCharts(message = '真实数据暂不可用') {
  CHART_IDS.forEach((domId) => {
    const chart = chartFor(domId);
    if (chart) chart.setOption({ series: [], dataset: { source: [] }, graphic: emptyGraphic(message) }, { notMerge: true });
  });
}

export function resizeCharts() {
  chartInstances.forEach((chart) => {
    const dom = chart.getDom();
    if (!chart.isDisposed() && dom.clientWidth && dom.clientHeight) chart.resize();
  });
}

export function disposeCharts() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  chartInstances.forEach((chart) => {
    if (!chart.isDisposed()) chart.dispose();
  });
  chartInstances.clear();
}
