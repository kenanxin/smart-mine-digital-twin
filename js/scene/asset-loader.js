import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { preparePbrMesh } from './materials.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();

export async function loadModel(asset, options = {}) {
  if (!asset?.url) throw new Error('Model asset URL is required');

  let gltf = modelCache.get(asset.url);
  if (!gltf) {
    try {
      gltf = await gltfLoader.loadAsync(asset.url);
      modelCache.set(asset.url, gltf);
    } catch (error) {
      const detail = `${asset.label || asset.url}: ${error.message || error}`;
      throw new Error(`Failed to load licensed model ${detail}`);
    }
  }

  const root = gltf.scene.clone(true);
  root.name = options.name || asset.label || 'licensed-model';
  root.userData.asset = {
    author: asset.author,
    license: asset.license,
    source: asset.source,
  };

  if (options.position) root.position.fromArray(options.position);
  if (options.rotation) root.rotation.fromArray(options.rotation);
  if (options.scale !== undefined) {
    const scale = Array.isArray(options.scale) ? options.scale : [options.scale, options.scale, options.scale];
    root.scale.fromArray(scale);
  }

  root.traverse(object => preparePbrMesh(object, options));
  return { root, animations: gltf.animations || [] };
}

export async function loadAvailableModels(entries, onProgress = () => {}) {
  const results = new Map();
  const failures = [];

  for (let index = 0; index < entries.length; index++) {
    const [key, asset, options] = entries[index];
    try {
      results.set(key, await loadModel(asset, options));
    } catch (error) {
      failures.push({ key, asset, error });
      console.warn(error.message);
    }
    onProgress((index + 1) / entries.length, key);
  }

  return { results, failures };
}
