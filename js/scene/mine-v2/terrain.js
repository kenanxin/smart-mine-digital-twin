import * as THREE from 'three';
import { MINE_V2_CONFIG } from './config.mjs';
import { getGradedHeight } from './terrain-profile.mjs';

export function buildTerrain(materials) {
  const { width, depth } = MINE_V2_CONFIG.world;
  let geometry = new THREE.PlaneGeometry(width, depth, 150, 88);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const height = getGradedHeight(x, z);
    positions.setY(index, height);
    const macro = Math.sin(x * 0.017 + z * 0.009) * 0.035;
    const variation = 0.9 + macro + Math.min(0.07, height / 520);
    const padBlend = x > 234 && x < 449 && z > -128 && z < 118 ? 0.16 : 0;
    color.setRGB(
      (0.84 + padBlend * 0.07) * variation,
      (0.82 + padBlend * 0.05) * variation,
      (0.75 + padBlend * 0.03) * variation,
    );
    colors.push(color.r, color.g, color.b);
  }
  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = materials.terrain.clone();
  material.roughness = 1;
  material.envMapIntensity = 0.46;
  material.vertexColors = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'mineV2Terrain';
  mesh.receiveShadow = true;
  return mesh;
}
