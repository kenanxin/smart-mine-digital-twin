import * as THREE from 'three';
import { MINE_V2_CONFIG } from './config.mjs';

function createIrregularMass(width, height, depth, material, phase = 0) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 18, 10, 12);
  const positions = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const ripple = Math.sin(x * 0.035 + phase) * 1.8
      + Math.sin(y * 0.09 - phase) * 1.1
      + Math.sin(z * 0.045 + phase * 0.7) * 1.4;
    const scale = Math.min(1, Math.abs(x) / (width * 0.5) + Math.abs(z) / (depth * 0.5));
    positions.setXYZ(index, x + ripple * scale, y + ripple * 0.45 * scale, z + ripple * scale);
    const band = 0.54 + Math.sin(y * 0.085 + phase) * 0.08 + Math.sin((x + z) * 0.025) * 0.035;
    color.setRGB(band * 0.67, band * 0.62, band * 0.56);
    colors.push(color.r, color.g, color.b);
  }
  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const shadedMaterial = material.clone();
  shadedMaterial.vertexColors = true;
  return new THREE.Mesh(geometry, shadedMaterial);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function addRubble(group, materials) {
  const random = seededRandom(MINE_V2_CONFIG.seed + 31);
  for (let index = 0; index < 64; index += 1) {
    const side = index % 2 ? -1 : 1;
    const radius = 1.5 + random() * 5.5;
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      index % 7 === 0 ? materials.coal : materials.darkRock,
    );
    mesh.position.set(side * (335 + random() * 95), -190 + random() * 24, 145 + random() * 95);
    mesh.rotation.set(random() * 2, random() * 2, random() * 2);
    mesh.scale.y = 0.45 + random() * 0.5;
    mesh.name = 'cutawayRubble';
    group.add(mesh);
  }
}

export function buildCutawayGeology(materials, runtime) {
  const group = new THREE.Group();
  group.name = 'mineV2ContinuousGeology';

  const backMass = createIrregularMass(900, 230, 92, materials.rock, 0.4);
  backMass.position.set(0, -92, -214);
  backMass.name = 'geologyBackMass';
  group.add(backMass);

  const leftShoulder = createIrregularMass(54, 218, 350, materials.darkRock, 1.7);
  leftShoulder.position.set(-458, -98, -35);
  leftShoulder.name = 'geologyLeftShoulder';
  group.add(leftShoulder);

  const rightShoulder = createIrregularMass(54, 218, 350, materials.darkRock, 2.9);
  rightShoulder.position.set(458, -98, -35);
  rightShoulder.name = 'geologyRightShoulder';
  group.add(rightShoulder);

  const foundation = createIrregularMass(900, 26, 500, materials.darkRock, 4.2);
  foundation.position.set(0, -214, -4);
  foundation.name = 'geologyFoundation';
  group.add(foundation);

  const campusMaterial = materials.rock.clone();
  campusMaterial.map = null;
  campusMaterial.roughnessMap = null;
  campusMaterial.metalnessMap = null;
  campusMaterial.aoMap = null;
  campusMaterial.color.setHex(0x756b5d);
  campusMaterial.envMapIntensity = 0.78;
  const campusRockMass = createIrregularMass(190, 70, 130, campusMaterial, 3.6);
  const campusPositions = campusRockMass.geometry.attributes.position;
  for (let index = 0; index < campusPositions.count; index += 1) {
    const y = campusPositions.getY(index);
    const bottomBlend = THREE.MathUtils.clamp((35 - y) / 70, 0, 1);
    campusPositions.setX(index, campusPositions.getX(index) + bottomBlend * 26);
    campusPositions.setZ(index, campusPositions.getZ(index) - bottomBlend * 12);
  }
  campusPositions.needsUpdate = true;
  campusRockMass.geometry.computeVertexNormals();
  campusRockMass.position.set(340, -17, -110);
  campusRockMass.name = 'campusRockMass';
  group.add(campusRockMass);

  const seamBack = createIrregularMass(760, 7, 11, materials.coal, 5.5);
  seamBack.position.set(0, -154, -162);
  seamBack.name = 'embeddedCoalSeam';
  group.add(seamBack);

  addRubble(group, materials);
  if (runtime) runtime.geologyRoot = group;
  return group;
}
