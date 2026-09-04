import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FOCUSED_LONGWALL_EQUIPMENT,
  FOCUSED_LONGWALL_MONITORS,
} from '../js/scene/mine-v2/focused-longwall.js';
import { FOCUSED_LONGWALL_LAYOUT } from '../js/scene/mine-v2/config.mjs';
import { ROADWAY_EDGES, ROADWAY_NODES } from '../js/scene/mine-v2/topology.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT, 'tools', '.generated', 'project-roadway-layout.json');
const APPROVED_MONITOR_IDS = [
  'roof-separation-01',
  'roof-separation-02',
  'roof-separation-03',
  'convergence-01',
  'anchor-load-01',
  'support-pressure-03',
  'microseismic-01',
  'cctv-01',
];

const monitorIds = FOCUSED_LONGWALL_MONITORS.map(item => item.id);
if (JSON.stringify(monitorIds) !== JSON.stringify(APPROVED_MONITOR_IDS)) {
  throw new Error(`Unexpected focused monitor set: ${monitorIds.join(', ')}`);
}

const payload = {
  source: {
    topology: 'js/scene/mine-v2/topology.mjs',
    localScene: 'js/scene/mine-v2/focused-longwall.js',
  },
  nodes: ROADWAY_NODES,
  edges: ROADWAY_EDGES,
  monitors: FOCUSED_LONGWALL_MONITORS,
  equipment: FOCUSED_LONGWALL_EQUIPMENT,
  camera: FOCUSED_LONGWALL_LAYOUT.defaultCamera,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(OUTPUT_PATH);
