import { getMineState } from './mine-data.js';

const chartInstances = {};

const darkTheme = {
  textStyle: { color: '#93a5b1' },
  backgroundColor: 'transparent',
};

export function initEnvChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) return null;
  const chart = echarts.init(dom);
  chartInstances.env = chart;

  const samples = Array.from({ length: 12 }, (_, index) => `${index * 2}s`);
  chart.setOption({
    ...darkTheme,
    grid: { left: 34, right: 14, top: 34, bottom: 18 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: samples,
      axisLine: { lineStyle: { color: '#22303c' } },
      axisTick: { show: false },
      axisLabel: { color: '#5c6f7c', fontSize: 9, interval: 3 },
    },
    yAxis: {
      type: 'value',
      name: 'MPa / mm',
      splitLine: { lineStyle: { color: '#1a2530' } },
      axisLabel: { color: '#5c6f7c', fontSize: 9 },
      min: 0,
      max: 30,
    },
    legend: { top: 0, right: 0, textStyle: { color: '#93a5b1', fontSize: 9 } },
    series: [
      {
        name: '顶板压力',
        type: 'line',
        data: [15.9, 16.2, 16.0, 16.4, 16.7, 16.5, 16.2, 16.1, 16.4, 16.6, 16.5, 16.4],
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ffb347', width: 2 },
      },
      {
        name: '离层量',
        type: 'line',
        data: [11.8, 12.0, 12.3, 12.2, 12.5, 12.7, 12.6, 12.9, 12.7, 12.8, 12.9, 12.8],
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#48c9b0', width: 1.8 },
      },
    ],
  });
  return chart;
}

export function initProdChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) return null;
  const chart = echarts.init(dom);
  chartInstances.prod = chart;

  const labels = ['-12m', '-10m', '-8m', '-6m', '-4m', '-2m', '当前'];
  chart.setOption({
    ...darkTheme,
    grid: { left: 34, right: 14, top: 34, bottom: 18 },
    tooltip: { trigger: 'axis' },
    legend: {
      right: 4,
      top: 2,
      itemWidth: 18,
      itemHeight: 8,
      itemGap: 14,
      textStyle: { color: '#93a5b1', fontSize: 10 },
      data: ['风险分值', '关注线'],
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#22303c' } },
      axisTick: { show: false },
      axisLabel: { color: '#5c6f7c', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '分',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#1a2530' } },
      axisLabel: { color: '#5c6f7c', fontSize: 9 },
    },
    series: [
      {
        name: '风险分值',
        type: 'bar',
        data: buildRiskTrend(getMineState().riskScore, 'normalMonitor'),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#ffc95e' },
            { offset: 1, color: '#7a5a10' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: 12,
      },
      {
        name: '关注线',
        type: 'line',
        data: [50, 50, 50, 50, 50, 50, 50],
        smooth: false,
        symbol: 'none',
        lineStyle: { color: '#ff9100', width: 1.5, type: 'dashed' },
      },
    ],
  });
  return chart;
}

function buildRiskTrend(score, stageId = 'normalMonitor') {
  const current = Math.max(0, Math.min(100, Math.round(score)));
  const profiles = {
    normalMonitor: [-16, -13, -11, -8, -6, -3, 0],
    roofPressureRise: [-24, -20, -17, -12, -8, -4, 0],
    roofSeparationAlarm: [-38, -32, -25, -18, -11, -5, 0],
    supportResistanceAlarm: [-42, -36, -28, -20, -13, -6, 0],
    roofFallWarning: [-58, -48, -38, -26, -15, -7, 0],
    emergencyResponse: [24, 18, 12, 7, 4, 2, 0],
  };
  const offsets = profiles[stageId] ?? profiles.normalMonitor;
  return offsets.map(delta => Math.max(5, Math.min(100, current + delta)));
}

export function initAlertChart(domId) {
  const dom = document.getElementById(domId);
  if (!dom) return null;
  const chart = echarts.init(dom);
  chartInstances.alert = chart;

  chart.setOption({
    ...darkTheme,
    grid: { left: 40, right: 16, top: 10, bottom: 18 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['7/10', '7/11', '7/12', '7/13', '7/14', '7/15', '7/16'],
      axisLine: { lineStyle: { color: '#22303c' } },
      axisTick: { show: false },
      axisLabel: { color: '#5c6f7c', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      name: '次',
      splitLine: { lineStyle: { color: '#1a2530' } },
      axisLabel: { color: '#5c6f7c', fontSize: 9 },
    },
    series: [
      {
        name: '预警次数',
        type: 'bar',
        data: [3, 2, 1, 2, 1, 0, 1],
        itemStyle: {
          color: (params) => {
            const colors = [
              'rgba(242,194,62,0.75)',
              'rgba(242,194,62,0.75)',
              'rgba(74,157,224,0.7)',
              'rgba(242,194,62,0.75)',
              'rgba(74,157,224,0.7)',
              'rgba(53,206,127,0.7)',
              'rgba(74,157,224,0.7)',
            ];
            return colors[params.dataIndex] || colors[0];
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: 14,
      },
    ],
  });
  return chart;
}

export function resizeCharts() {
  Object.values(chartInstances).forEach(chart => {
    if (chart && !chart.isDisposed()) chart.resize();
  });
}

export function updateCharts(options = {}) {
  const state = getMineState();
  const envChart = chartInstances.env;
  if (envChart && !envChart.isDisposed()) {
    const history = state.history;
    envChart.setOption({
      xAxis: { data: history.map(item => `${Math.round(item.elapsed)}s`) },
      series: [
        { data: history.map(item => Number(item.roofPressure.toFixed(2))) },
        { data: history.map(item => Number(item.separation.toFixed(2))) },
      ],
    });
  }
  const riskChart = chartInstances.prod;
  if (riskChart && !riskChart.isDisposed()) {
    const score = Number.isFinite(options.riskScore) ? options.riskScore : state.riskScore;
    const stageId = options.stageId ?? 'normalMonitor';
    riskChart.setOption({
      series: [
        { data: buildRiskTrend(score, stageId) },
        { data: [50, 50, 50, 50, 50, 50, 50] },
      ],
    });
  }
}

export function disposeCharts() {
  Object.values(chartInstances).forEach(chart => {
    if (chart && !chart.isDisposed()) chart.dispose();
  });
}
