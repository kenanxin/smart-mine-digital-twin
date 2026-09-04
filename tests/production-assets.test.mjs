import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MODEL_ASSETS, TEXTURE_ASSETS } from '../js/scene/asset-registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolveAsset = url => path.join(ROOT, url.replace(/^\.\//, ''));
const runtimeAssetUrls = [
  './assets/hdri/quarry_02_4k.hdr',
  ...Object.values(TEXTURE_ASSETS).flatMap(textureSet => Object.values(textureSet)),
  MODEL_ASSETS.conveyorKit.url,
  MODEL_ASSETS.cctv.url,
];

test('production publishes the complete local-quality runtime asset set outside Git LFS', () => {
  const attributes = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  assert.equal(runtimeAssetUrls.length, 21);
  assert.match(attributes, /assets\/hdri\/quarry_02_4k\.hdr -filter -diff -merge -text/);
  assert.match(attributes, /assets\/textures\/\*\* -filter -diff -merge -text/);
  assert.match(attributes, /assets\/models\/quarry-conveyor-system-kit\/scene\.optimized\.glb -filter -diff -merge -text/);
  assert.match(attributes, /assets\/models\/weathered-cctv-camera\/scene\.optimized\.glb -filter -diff -merge -text/);
});

test('production runtime assets retain their original binary signatures and size', () => {
  const files = runtimeAssetUrls.map(resolveAsset);
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  assert.ok(totalBytes >= 59 * 1024 * 1024 && totalBytes <= 61 * 1024 * 1024);

  const hdr = fs.readFileSync(resolveAsset(runtimeAssetUrls[0]));
  assert.equal(hdr.subarray(0, 10).toString('ascii'), '#?RADIANCE');

  for (const url of runtimeAssetUrls.filter(url => url.endsWith('.jpg'))) {
    const bytes = fs.readFileSync(resolveAsset(url));
    assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `${url} is not a JPEG`);
  }

  for (const url of runtimeAssetUrls.filter(url => url.endsWith('.glb'))) {
    const bytes = fs.readFileSync(resolveAsset(url));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'glTF', `${url} is not a GLB`);
  }
});
