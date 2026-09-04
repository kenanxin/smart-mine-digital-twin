import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIGURE_DIR = path.join(ROOT, 'competition_submission', 'figures');
const SVG_PATH = path.join(FIGURE_DIR, 'threejs-underground-layout.svg');
const PNG_PATH = path.join(FIGURE_DIR, 'threejs-underground-layout.png');

const REQUIRED_LABELS = [
  'Three.js 井下设备与监测仪器布局图',
  '1206 工作面',
  '采煤机',
  '液压支架',
  '刮板输送机',
  '转载机',
  '破碎机',
  '带式输送机',
  '顶板离层仪 01',
  '巷道收敛监测 01',
  '锚索受力监测 01',
  '支架压力 03',
  '微震监测 01',
  '出口 CCTV 01',
];

test('underground SVG contains the approved topology, equipment, and instruments', () => {
  const source = fs.readFileSync(SVG_PATH, 'utf8');

  assert.match(source, /<svg[^>]+width="1600"[^>]+height="1000"[^>]+viewBox="0 0 1600 1000"/);
  assert.equal((source.match(/data-roadway-node=/g) ?? []).length, 10);
  assert.equal((source.match(/data-roadway-edge=/g) ?? []).length, 13);
  assert.equal((source.match(/data-equipment=/g) ?? []).length, 6);
  assert.equal((source.match(/data-local-monitor=/g) ?? []).length, 8);
  for (const label of REQUIRED_LABELS) assert.ok(source.includes(label), `missing label: ${label}`);
});

test('underground PNG is a 1600 by 1000 image', () => {
  const bytes = fs.readFileSync(PNG_PATH);

  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), 1600);
  assert.equal(bytes.readUInt32BE(20), 1000);
  assert.ok(bytes.length > 150_000, 'PNG should retain readable diagram detail');
});
