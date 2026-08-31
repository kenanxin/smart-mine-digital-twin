import { buildMonitorAnchors } from './monitor-layout.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seededNoise(seed, time) {
  const value = Math.sin(seed * 0.000173 + time * 1.917) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

function createEquipmentRegistry() {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `EQ-${String(index + 1).padStart(2, '0')}`,
    status: index === 4 || index === 11 ? 'maintenance' : 'running',
  }));
}

export function createMineV2Simulator(seed) {
  const anchors = buildMonitorAnchors();
  let elapsed = 0;
  const state = {
    metrics: {
      roofPressure: 17.4,
      roofSeparation: 13.6,
      roofSubsidence: 8.2,
      supportResistance: 8040,
      cableLoad: 176,
      microseismicEnergy: 330,
    },
    equipmentRegistry: createEquipmentRegistry(),
    monitorRegistry: anchors,
    history: [],
    riskScore: 39,
    note: '比赛演示模拟数据，非生产安全标准',
  };

  function update(delta) {
    elapsed += Math.max(0, delta);
    const slow = Math.sin(elapsed * 0.23 + seed * 0.00001);
    const fast = Math.sin(elapsed * 0.71 + 1.4);
    const noise = seededNoise(seed, elapsed) * 0.12;
    state.metrics.roofPressure = 17.4 + slow * 0.75 + fast * 0.28 + noise;
    state.metrics.roofSeparation = 13.6 + slow * 0.9 + fast * 0.3;
    state.metrics.roofSubsidence = 8.2 + slow * 0.44 + noise;
    state.metrics.supportResistance = 8040 + slow * 180 + fast * 65;
    state.metrics.cableLoad = 176 + slow * 5.2 + fast * 1.5;
    state.metrics.microseismicEnergy = 330 + Math.max(0, fast) * 95 + noise * 35;
    state.riskScore = Math.round(36 + Math.max(0, state.metrics.roofPressure - 17) * 4 + Math.max(0, state.metrics.roofSeparation - 13) * 1.6);
    if (!state.history.length || elapsed - state.history.at(-1).time >= 1) {
      state.history.push({ time: Number(elapsed.toFixed(2)), roofPressure: Number(state.metrics.roofPressure.toFixed(2)), riskScore: state.riskScore });
      if (state.history.length > 120) state.history.shift();
    }
    return clone(state);
  }

  return {
    update,
    snapshot: () => clone(state),
  };
}
