const freezePreset = preset => Object.freeze({
  ...preset,
  position: Object.freeze([...preset.position]),
  target: Object.freeze([...preset.target]),
});

export const ZONE_PRESETS = Object.freeze({
  atlas: freezePreset({
    id: 'atlas',
    label: '井下集成总图',
    mode: 'atlas',
    position: [90, -72, 74],
    target: [-76, -154, -116],
    fov: 50,
  }),
  mainHaulage: freezePreset({
    id: 'mainHaulage',
    label: '主运输巷内部',
    mode: 'roadway',
    position: [118, -91.5, -68],
    target: [66, -94, -90],
    fov: 52,
  }),
  auxTransport: freezePreset({
    id: 'auxTransport',
    label: '辅助运输巷内部',
    mode: 'roadway',
    position: [46, -151.8, -86],
    target: [-22, -154, -48],
    fov: 54,
  }),
  returnAirway: freezePreset({
    id: 'returnAirway',
    label: '回风巷内部',
    mode: 'roadway',
    position: [116, -44.6, 28],
    target: [32, -84, -4],
    fov: 54,
  }),
  pumpRoom: freezePreset({
    id: 'pumpRoom',
    label: '水泵房总图聚焦',
    mode: 'focus',
    position: [255, -58, 70],
    target: [190, -96, -10],
    fov: 42,
  }),
  substation: freezePreset({
    id: 'substation',
    label: '中央变电所总图聚焦',
    mode: 'focus',
    position: [92, -54, 86],
    target: [10, -96, -10],
    fov: 42,
  }),
  longwall: freezePreset({
    id: 'longwall',
    label: '长壁采煤区总图聚焦',
    mode: 'focus',
    position: [-18, -104, 18],
    target: [-100, -154, -112],
    fov: 43,
  }),
});

export const ROADWAY_ENTRY_ZONE_IDS = Object.freeze(['mainHaulage', 'auxTransport', 'returnAirway']);

export const FOCUS_ONLY_ZONE_IDS = Object.freeze(['pumpRoom', 'substation', 'longwall']);
