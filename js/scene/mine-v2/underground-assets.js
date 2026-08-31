import * as THREE from 'three';
import { loadAvailableModels } from '../asset-loader.js';
import { MODEL_ASSETS } from '../asset-registry.js';
import { ROADWAY_EDGES, ROADWAY_NODES } from './topology.mjs';
import { UNDERGROUND_ASSET_DEPLOYMENTS } from './underground-asset-layout.mjs';

const nodesById = new Map(ROADWAY_NODES.map(node => [node.id, node]));
const edgesById = new Map(ROADWAY_EDGES.map(edge => [edge.id, edge]));

function edgeCurve(edgeId) {
  const edge = edgesById.get(edgeId);
  const points = edge.points ?? [nodesById.get(edge.from).position, nodesById.get(edge.to).position];
  return new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)), false, 'centripetal');
}

function cloneWorldObject(source) {
  source.updateWorldMatrix(true, false);
  const clone = source.clone(true);
  source.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
  return clone;
}

function assembledConveyor(sourceRoot) {
  const assembly = new THREE.Group();
  assembly.name = 'licensed-conveyor-assembly';
  sourceRoot.updateMatrixWorld(true);
  sourceRoot.traverse(object => {
    if (object.isMesh) return;
    if (!(/_low\d*$/i.test(object.name) || object.name === 'Conveyor_Belt')) return;
    if (!object.children.some(child => child.isMesh)) return;
    assembly.add(cloneWorldObject(object));
  });
  return assembly;
}

function normalizeModel(model, targetLength) {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  wrapper.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(model);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const longest = Math.max(initialSize.x, initialSize.y, initialSize.z) || 1;
  model.scale.multiplyScalar(targetLength / longest);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= bounds.min.y;
  model.position.z -= center.z;
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

function placementFrame(descriptor) {
  if (descriptor.edgeId) {
    const curve = edgeCurve(descriptor.edgeId);
    return {
      position: curve.getPointAt(descriptor.mileage),
      tangent: curve.getTangentAt(descriptor.mileage).setY(0).normalize(),
    };
  }
  return {
    position: new THREE.Vector3(...nodesById.get(descriptor.nodeId).position),
    tangent: new THREE.Vector3(0, 0, 1),
  };
}

function orientAlongLocalX(object, tangent) {
  object.rotation.y = Math.atan2(-tangent.z, tangent.x);
}

function orientAlongLocalZ(object, tangent) {
  object.rotation.y = Math.atan2(tangent.x, tangent.z);
}

function registerRole(runtime, role, object) {
  runtime.objectsByRole.set(role, object);
  object.userData.roleAliases = [...(object.userData.roleAliases ?? []), role];
  return object;
}

function painted(materials, color) {
  const material = materials.paintedSteel.clone();
  material.color.setHex(color);
  material.roughness = 0.62;
  material.metalness = 0.46;
  return material;
}

function addRail(root, start, end, radius, material, name) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.name = name;
  root.add(mesh);
  return mesh;
}

function addBox(root, materials, size, position, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  root.add(mesh);
  return mesh;
}

function createUndergroundUtilityVehicle(materials) {
  const root = new THREE.Group();
  root.name = 'undergroundUtilityVehicle';
  const yellow = painted(materials, 0xd19a2c);
  const dark = painted(materials, 0x2f3536);
  addBox(root, materials, [5.9, 0.48, 2.45], [0, 0.82, 0], materials.steel, 'utilityVehicleChassis');
  addBox(root, materials, [2.2, 1.55, 2.2], [1.25, 1.72, 0], yellow, 'utilityVehicleCab');
  addBox(root, materials, [2.4, 0.92, 2.25], [-1.55, 1.42, 0], yellow, 'utilityVehicleRearDeck');
  addBox(root, materials, [1.35, 0.55, 2.05], [2.82, 1.23, 0], dark, 'utilityVehicleHood');
  addBox(root, materials, [0.12, 0.76, 1.35], [2.05, 2.08, 0], materials.glass, 'utilityVehicleWindshield');
  for (const x of [-2.0, 1.7]) {
    for (const z of [-1.36, 1.36]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 20), materials.rubber);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.62, z);
      wheel.name = 'utilityVehicleWheel';
      root.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.46, 16), materials.steel);
      hub.rotation.x = Math.PI / 2;
      hub.name = 'utilityVehicleWheelHub';
      wheel.add(hub);
    }
  }
  const lampMaterial = materials.lamp.clone();
  lampMaterial.emissiveIntensity = 2.8;
  for (const z of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.32), lampMaterial);
    lamp.position.set(3.52, 1.42, z);
    lamp.name = 'utilityVehicleHeadlamp';
    root.add(lamp);
  }
  return root;
}

function createPumpSet(materials) {
  const root = new THREE.Group();
  root.name = 'pumpRoomVisibleMD450PumpSet';
  const pumpPaint = painted(materials, 0x3e6d78);
  addBox(root, materials, [7.8, 0.34, 3.2], [0, 0.2, 0], materials.steel, 'pumpCommonSkid');
  for (const x of [-2.35, 1.95]) {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.92, 2.7, 24), pumpPaint);
    pump.rotation.z = Math.PI / 2;
    pump.position.set(x, 1.02, 0);
    pump.name = 'md450PumpBody';
    root.add(pump);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.6, 20), materials.weatheredSteel);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(x + 1.92, 1.02, 0);
    motor.name = 'pumpMotor';
    root.add(motor);
    addRail(root, [x - 1.7, 1.02, -1.5], [x + 3.0, 1.02, -1.5], 0.16, materials.steel, 'pumpDischargePipe');
  }
  return root;
}

function createSubstationSet(materials) {
  const root = new THREE.Group();
  root.name = 'centralSubstationVisibleSwitchgear';
  const cabinetMaterial = painted(materials, 0x879194);
  const transformerMaterial = painted(materials, 0x5f6a6a);
  for (let index = 0; index < 5; index += 1) {
    const cabinet = addBox(root, materials, [1.35, 2.65, 0.72], [-3.2 + index * 1.6, 1.42, -1.0], cabinetMaterial, 'kbsgSwitchgearCabinet');
    addBox(cabinet, materials, [0.68, 0.13, 0.06], [0, 0.52, 0.39], materials.glass, 'switchgearMeterWindow');
  }
  const transformer = addBox(root, materials, [3.2, 2.1, 2.4], [0.2, 1.12, 1.35], transformerMaterial, 'kbsgDryTransformer');
  for (const side of [-1, 1]) {
    addBox(transformer, materials, [0.16, 1.62, 2.2], [side * 1.75, 0.08, 0], materials.steel, 'transformerRadiatorFins');
  }
  return root;
}

function createReturnFan(materials) {
  const root = new THREE.Group();
  root.name = 'mainVentilationFan';
  const shell = painted(materials, 0x607176);
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 1.4), materials.concrete);
  base.position.set(0, 0.16, 0);
  base.name = 'returnFanGroundBase';
  root.add(base);
  const fanBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 1.25), shell);
  fanBox.position.set(0, 0.95, 0);
  fanBox.name = 'embeddedReturnFanBox';
  root.add(fanBox);
  const grilleMaterial = materials.weatheredSteel.clone();
  grilleMaterial.color.setHex(0x2d3435);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), grilleMaterial);
  grille.position.set(0.94, 0.98, 0);
  grille.name = 'returnFanWallGrille';
  root.add(grille);
  for (const z of [-0.32, 0, 0.32]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.78), materials.steel);
    slat.position.set(1.0, 0.98 + z, 0);
    slat.name = 'returnFanGrilleSlat';
    root.add(slat);
  }
  return root;
}

function addProceduralEquipment(root, materials, runtime) {
  const utility = createUndergroundUtilityVehicle(materials);
  const utilityFrame = placementFrame({ edgeId: 'main-level-h3', mileage: 0.46 });
  utility.position.copy(utilityFrame.position);
  utility.position.y += 0.16;
  orientAlongLocalX(utility, utilityFrame.tangent);
  utility.scale.setScalar(1.35);
  root.add(registerRole(runtime, 'undergroundUtilityVehicle', utility));

  const pump = createPumpSet(materials);
  const pumpFrame = placementFrame({ nodeId: 'pump-chamber' });
  pump.position.copy(pumpFrame.position);
  pump.position.y += 0.1;
  pump.rotation.y = Math.PI / 2;
  pump.scale.setScalar(1.1);
  root.add(pump);
  registerRole(runtime, 'pumpRoom', pump);

  const substation = createSubstationSet(materials);
  const substationFrame = placementFrame({ nodeId: 'substation-chamber' });
  substation.position.copy(substationFrame.position);
  substation.position.y += 0.08;
  substation.rotation.y = -0.12;
  substation.scale.setScalar(1.15);
  root.add(substation);
  registerRole(runtime, 'centralSubstation', substation);

  const fan = createReturnFan(materials);
  const fanFrame = placementFrame({ edgeId: 'return-gate-road', mileage: 0.22 });
  fan.position.copy(fanFrame.position);
  fan.position.y += 0.02;
  orientAlongLocalX(fan, fanFrame.tangent);
  fan.scale.setScalar(0.9);
  root.add(registerRole(runtime, 'mainVentilationFan', fan));

  runtime.updaters.push(() => {});
}

function prepareAnimatedConveyor(root, runtime) {
  const drums = [];
  const beltMaterials = [];
  root.traverse(object => {
    if (/Conveyor_Drum/i.test(object.name) && !object.isMesh) drums.push(object);
    if (!object.isMesh || !/Conveyor_Belt/i.test(object.name)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    object.material = materials.map(material => {
      const next = material.clone();
      if (next.map) {
        next.map = next.map.clone();
        next.map.wrapS = THREE.RepeatWrapping;
        next.map.needsUpdate = true;
        beltMaterials.push(next);
      }
      return next;
    });
    if (!Array.isArray(object.material)) object.material = object.material[0];
  });
  runtime.updaters.push(delta => {
    for (const drum of drums) drum.rotation.z -= delta * 1.35;
    for (const material of beltMaterials) material.map.offset.x -= delta * 0.12;
  });
}

function assetSource(descriptor, loadedRoot) {
  if (descriptor.assetKey === 'conveyorKit') return assembledConveyor(loadedRoot);
  return loadedRoot.clone(true);
}

export async function buildUndergroundAssets(materials, runtime) {
  const root = new THREE.Group();
  root.name = 'licensed-underground-assets';
  const requestedKeys = [...new Set(UNDERGROUND_ASSET_DEPLOYMENTS.map(item => item.assetKey))];
  const entries = requestedKeys.map(key => [key, MODEL_ASSETS[key], { name: `licensed-${key}` }]);
  const { results, failures } = await loadAvailableModels(entries);

  for (const descriptor of UNDERGROUND_ASSET_DEPLOYMENTS) {
    if (descriptor.type === 'ventilation' || descriptor.type === 'plant' || descriptor.type === 'camera') continue;
    const loaded = results.get(descriptor.assetKey);
    if (!loaded) continue;
    const model = assetSource(descriptor, loaded.root);
    const instance = normalizeModel(model, descriptor.targetLength);
    const frame = placementFrame(descriptor);
    instance.name = descriptor.id;
    instance.position.copy(frame.position);
    instance.position.y += descriptor.floorOffset;

    if (descriptor.type === 'belt' || descriptor.type === 'rail') orientAlongLocalX(instance, frame.tangent);
    else if (descriptor.type === 'ventilation') orientAlongLocalZ(instance, frame.tangent);
    if (descriptor.type === 'plant') instance.rotation.y = descriptor.nodeId === 'pump-chamber' ? Math.PI / 2 : 0;
    if (descriptor.type === 'camera') {
      instance.position.x += descriptor.nodeId.includes('gate') ? 1.65 : -1.8;
      instance.rotation.y = descriptor.nodeId === 'h3-junction' ? Math.PI * 0.7 : Math.PI * 0.2;
    }

    root.add(instance);
    if (descriptor.type === 'belt') prepareAnimatedConveyor(instance, runtime);
    if (descriptor.type === 'rail') {
      registerRole(runtime, 'undergroundLocomotive', instance);
      registerRole(runtime, 'undergroundMineTrain', instance);
      instance.scale.multiplyScalar(1.18);
    }
    if (descriptor.type === 'belt') {
      registerRole(runtime, 'beltConveyor', instance);
      registerRole(runtime, 'undergroundBeltDSJ120', instance);
      instance.scale.multiplyScalar(1.18);
    }
  }

  addProceduralEquipment(root, materials, runtime);
  runtime.assetFailures = failures;
  runtime.licensedUndergroundAssets = root.children;
  return root;
}
