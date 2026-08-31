import { MINE_V2_CONFIG } from './config.mjs';

const SEED_PHASE = (MINE_V2_CONFIG.seed % 8191) / 8191 * Math.PI * 2;

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a * (1 - t) + b * t;
}

function getOpenPitHeight(x, z, natural) {
  const nx = (x + 70) / 335;
  const nz = (z + 18) / 225;
  const radius = Math.hypot(nx, nz);
  if (radius >= 1.16) return natural;

  const bowl = -58 + Math.min(1, radius) * 104;
  const benchSize = 12;
  const benchBase = Math.floor((bowl + 66) / benchSize) * benchSize - 66;
  const benchPhase = (bowl - benchBase) / benchSize;
  const terraced = benchBase + smoothstep(0.72, 1, benchPhase) * benchSize;
  const detail = Math.sin(x * 0.065 + z * 0.037) * 0.55;
  const pitBlend = 1 - smoothstep(0.94, 1.16, radius);
  return mix(natural, terraced + detail, pitBlend);
}

export function getPitHaulPathPoint(t) {
  const clamped = Math.min(1, Math.max(0, t));
  const angle = Math.PI * 0.15 + clamped * Math.PI * 2.4;
  const radius = 0.98 - clamped * 0.7;
  return [
    -70 + Math.cos(angle) * 335 * radius,
    35 - clamped * 86,
    -18 + Math.sin(angle) * 225 * radius,
  ];
}

function gradePitHaulRamp(x, z, terrainHeight) {
  let nearestDistance = Infinity;
  let nearestHeight = terrainHeight;
  for (let index = 0; index <= 72; index += 1) {
    const [px, py, pz] = getPitHaulPathPoint(index / 72);
    const distance = Math.hypot(x - px, z - pz);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestHeight = py;
    }
  }
  const influence = 1 - smoothstep(8, 20, nearestDistance);
  return mix(terrainHeight, nearestHeight - 0.35, influence);
}

export function getTerrainHeight(x, z) {
  const ridgeA = Math.sin(x * 0.0082 + SEED_PHASE) * 12.5;
  const ridgeB = Math.sin(z * 0.011 - SEED_PHASE * 0.63) * 8.4;
  const ridgeC = Math.sin((x + z) * 0.0056 + SEED_PHASE * 1.41) * 6.2;
  const valleyDistance = Math.abs(z + 18 + Math.sin(x * 0.004) * 42);
  const valley = -18 * Math.exp(-(valleyDistance * valleyDistance) / 24000);
  const sideRise = Math.pow(Math.min(1, Math.abs(x) / 450), 1.7) * 24;
  const natural = 34 + ridgeA + ridgeB + ridgeC + valley + sideRise;
  return gradePitHaulRamp(x, z, getOpenPitHeight(x, z, natural));
}

export function getGradedHeight(x, z) {
  const natural = getTerrainHeight(x, z);
  const dx = Math.max(Math.abs(x - 335) - 100, 0);
  const dz = Math.max(Math.abs(z + 5) - 122, 0);
  const distance = Math.hypot(dx, dz);
  const blend = smoothstep(0, 32, distance);
  return 18 * (1 - blend) + natural * blend;
}

export function resolveSurfaceRoute(route) {
  return route.points.map(([x, z, offset]) => [x, getGradedHeight(x, z) + offset, z]);
}
