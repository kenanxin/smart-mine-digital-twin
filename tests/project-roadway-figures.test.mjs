import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ROADWAY_EDGES, ROADWAY_NODES } from '../js/scene/mine-v2/topology.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_DIR = path.join(ROOT, 'tools', '.generated');
const DATA_PATH = path.join(GENERATED_DIR, 'project-roadway-layout.json');

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

test('project roadway figure data uses live topology and the approved eight monitors', () => {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  assert.equal(data.nodes.length, ROADWAY_NODES.length);
  assert.equal(data.edges.length, ROADWAY_EDGES.length);
  assert.deepEqual(data.monitors.map(item => item.id), APPROVED_MONITOR_IDS);
  assert.equal(data.monitors.length, 8);
  assert.ok(data.monitors.every(item => Array.isArray(item.position) && item.position.length === 3));
  assert.equal(data.source.topology, 'js/scene/mine-v2/topology.mjs');
  assert.equal(data.source.localScene, 'js/scene/mine-v2/focused-longwall.js');
});
