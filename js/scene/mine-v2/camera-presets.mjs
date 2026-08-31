import { ZONE_PRESETS } from './zone-presets.mjs';
import { FOCUSED_LONGWALL_LAYOUT } from './config.mjs';

// 总览镜头：高空俯瞰，同时读出地表规模与地下纵深
// 地表约 44%、岩层过渡约 8%、地下约 48% 的均衡剖切构图
const OVERVIEW_PRESET = Object.freeze({
  position: Object.freeze([280, 165, 340]),
  target: Object.freeze([60, -55, -40]),
  fov: 40,
});

// 地表镜头：聚焦工业广场、道路和井口
const SURFACE_PRESET = Object.freeze({
  position: Object.freeze([330, 72, 155]),
  target: Object.freeze([318, 16, -36]),
  fov: 48,
});

// 井下镜头：聚焦 1206 工作面出口段及运输顺槽
const UNDERGROUND_PRESET = Object.freeze({
  position: Object.freeze([...FOCUSED_LONGWALL_LAYOUT.defaultCamera.position]),
  target: Object.freeze([...FOCUSED_LONGWALL_LAYOUT.defaultCamera.target]),
  fov: FOCUSED_LONGWALL_LAYOUT.defaultCamera.fov,
});

export const CAMERA_PRESETS = Object.freeze({
  overview: OVERVIEW_PRESET,
  surface: SURFACE_PRESET,
  underground: UNDERGROUND_PRESET,
  exit: UNDERGROUND_PRESET,
});

export const CONTROL_LIMITS = Object.freeze({
  overview: Object.freeze({
    minDistance: 40,
    maxDistance: 420,
    minAzimuth: -0.75,
    maxAzimuth: 0.75,
    minPolar: 0.12,
    maxPolar: Math.PI * 0.46,
  }),
  surface: Object.freeze({
    minDistance: 5,
    maxDistance: 220,
    minAzimuth: -Infinity,
    maxAzimuth: Infinity,
  }),
  underground: Object.freeze({
    minDistance: 2,
    maxDistance: 90,
    minAzimuth: -Infinity,
    maxAzimuth: Infinity,
  }),
  exit: Object.freeze({
    minDistance: 2,
    maxDistance: 90,
    minAzimuth: -Infinity,
    maxAzimuth: Infinity,
  }),
});
