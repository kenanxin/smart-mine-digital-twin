import * as THREE from 'three';
import { loadModel } from '../asset-loader.js';
import { MODEL_ASSETS } from '../asset-registry.js';

function register(runtime, role, object) {
  runtime.objectsByRole.set(role, object);
  object.userData.role = role;
  return object;
}

function removeReferenceAnnotations(root) {
  const removable = [];
  root.traverse(object => {
    if (/GraphicScale|Text/i.test(object.name)) removable.push(object);
  });
  for (const object of removable) object.parent?.remove(object);
}

function tuneMineScanMaterials(root) {
  root.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.roughness = Math.max(material.roughness ?? 0.8, 0.92);
      material.metalness = 0;
      material.envMapIntensity = 0.46;
      if (material.color) material.color.multiplyScalar(0.84);
      material.needsUpdate = true;
    }
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function fitScanToUnderground(root) {
  root.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(root);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const longest = Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;
  const targetLongest = 245;
  const scale = targetLongest / longest;
  root.scale.setScalar(scale);
  root.rotation.y = -0.32;
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const targetCenter = new THREE.Vector3(-54, -124, -112);
  const targetFloorY = -156.85;
  root.position.x += targetCenter.x - center.x;
  root.position.z += targetCenter.z - center.z;
  root.position.y += targetFloorY - box.min.y;
}

export async function buildMineScanBase(runtime) {
  const { root } = await loadModel(MODEL_ASSETS.mineScan, { name: 'mineScanTunnelBase' });
  root.name = 'mineScanTunnelBase';
  removeReferenceAnnotations(root);
  tuneMineScanMaterials(root);
  fitScanToUnderground(root);
  register(runtime, 'mineScanTunnelBase', root);
  return root;
}
