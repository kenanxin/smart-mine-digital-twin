import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { FOCUSED_LONGWALL_LAYOUT } from '../js/scene/mine-v2/config.mjs';
import { FOCUSED_LONGWALL_MONITORS } from '../js/scene/mine-v2/focused-longwall.js';
import { ROADWAY_EDGES, ROADWAY_NODES } from '../js/scene/mine-v2/topology.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIGURE_DIR = path.join(ROOT, 'competition_submission', 'figures');
const CAPTURE_SCRIPT = path.join(ROOT, 'tools', 'capture-project-roadway.cjs');
const OUTPUTS = {
  annotatedPng: path.join(FIGURE_DIR, 'project-roadway-3d-annotated.png'),
  annotatedSvg: path.join(FIGURE_DIR, 'project-roadway-3d-annotated.svg'),
  topologyPng: path.join(FIGURE_DIR, 'project-roadway-topology.png'),
  topologySvg: path.join(FIGURE_DIR, 'project-roadway-topology.svg'),
  comparisonPng: path.join(FIGURE_DIR, 'project-roadway-comparison.png'),
};

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
  assert.equal(ROADWAY_NODES.length, 10);
  assert.equal(ROADWAY_EDGES.length, 13);
  assert.deepEqual(FOCUSED_LONGWALL_MONITORS.map(item => item.id), APPROVED_MONITOR_IDS);
  assert.equal(FOCUSED_LONGWALL_MONITORS.length, 8);
  assert.ok(FOCUSED_LONGWALL_MONITORS.every(item => item.position.length === 3));
  assert.deepEqual(FOCUSED_LONGWALL_LAYOUT.defaultCamera.position, [4.4, 3.75, 25.5]);
  assert.deepEqual(FOCUSED_LONGWALL_LAYOUT.defaultCamera.target, [-0.9, 2, 5.8]);
  assert.equal(FOCUSED_LONGWALL_LAYOUT.defaultCamera.fov, 58);
});

test('capture script isolates the real Three.js canvas at 1600 by 1000', () => {
  const source = fs.readFileSync(CAPTURE_SCRIPT, 'utf8');

  assert.match(source, /viewport:\s*\{\s*width:\s*1600,\s*height:\s*1000/);
  assert.match(source, /#threeContainer canvas/);
  assert.match(source, /project-roadway-source\.png/);
  assert.match(source, /\/api\/auth\/login|\/login/);
});

function assertPngSize(filePath, width, height) {
  const bytes = fs.readFileSync(filePath);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), width);
  assert.equal(bytes.readUInt32BE(20), height);
}

test('project roadway final figures have the approved dimensions', () => {
  assertPngSize(OUTPUTS.annotatedPng, 1600, 1000);
  assertPngSize(OUTPUTS.topologyPng, 1600, 1000);
  assertPngSize(OUTPUTS.comparisonPng, 2000, 700);

  for (const svgPath of [OUTPUTS.annotatedSvg, OUTPUTS.topologySvg]) {
    const source = fs.readFileSync(svgPath, 'utf8');
    assert.match(source, /<svg[^>]+width="1600"[^>]+height="1000"[^>]+viewBox="0 0 1600 1000"/);
    assert.equal((source.match(/data-local-monitor=/g) ?? []).length, 8);
    assert.match(source, /依据项目 Three\.js 场景生成，非施工图/);
    for (const id of APPROVED_MONITOR_IDS) assert.ok(source.includes(id), `missing monitor id: ${id}`);
  }
  const annotatedSvg = fs.readFileSync(OUTPUTS.annotatedSvg, 'utf8');
  assert.match(annotatedSvg, /data:image\/png;base64,/);
  assert.ok(annotatedSvg.length > 1_000_000, 'annotated SVG should embed the detailed Three.js capture');
});
