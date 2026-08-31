import * as THREE from 'three';
import { TEXTURE_ASSETS } from './asset-registry.js';

const textureLoader = new THREE.TextureLoader();
const materialCache = new Map();

export async function loadMineMaterials(onProgress = () => {}) {
  const entries = Object.entries(TEXTURE_ASSETS);
  const materials = {};

  await Promise.all(entries.map(async ([name, set], index) => {
    materials[name] = await createPbrMaterial(name, set);
    onProgress((index + 1) / entries.length, name);
  }));

  return materials;
}

async function createPbrMaterial(name, set) {
  if (materialCache.has(name)) return materialCache.get(name);

  const [map, normalMap, armMap] = await Promise.all([
    loadTexture(set.diffuse, true),
    loadTexture(set.normal),
    loadTexture(set.arm),
  ]);

  const repeat = getRepeat(name);
  for (const texture of [map, normalMap, armMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.copy(repeat);
    texture.anisotropy = 8;
  }

  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    aoMap: armMap,
    roughnessMap: armMap,
    metalnessMap: armMap,
    normalScale: getNormalScale(name),
    roughness: name.includes('Metal') || name.includes('Rust') ? 0.78 : 1,
    metalness: name.includes('Metal') || name.includes('Rust') ? 0.72 : 0.04,
  });

  material.name = `mine-${name}`;
  materialCache.set(name, material);
  return material;
}

function loadTexture(url, colorTexture = false) {
  const fallback = () => {
    const data = colorTexture
      ? new Uint8Array([96, 92, 84, 255])
      : new Uint8Array([128, 128, 255, 255]);
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  };
  return Promise.race([
    textureLoader.loadAsync(url),
    new Promise(resolve => { setTimeout(() => resolve(fallback()), 3500); }),
  ]).catch(fallback).then(texture => {
    if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}

function getRepeat(name) {
  if (name === 'roadwayFloor') return new THREE.Vector2(9, 24);
  if (name.includes('Metal') || name.includes('Rust')) return new THREE.Vector2(3, 3);
  return new THREE.Vector2(7, 12);
}

function getNormalScale(name) {
  if (name.includes('Rock') || name === 'roadwayFloor') return new THREE.Vector2(1.3, 1.3);
  return new THREE.Vector2(0.8, 0.8);
}

export function preparePbrMesh(mesh, { castShadow = true, receiveShadow = true } = {}) {
  if (!mesh.isMesh) return;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  const uv = mesh.geometry?.attributes?.uv;
  if (uv && !mesh.geometry.attributes.uv1) {
    mesh.geometry.setAttribute('uv1', uv.clone());
  }
}
