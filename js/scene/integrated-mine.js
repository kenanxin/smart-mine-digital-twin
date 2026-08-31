import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { preparePbrMesh } from './materials.js';
import { EQUIPMENT, MONITOR_POINTS, getMetricLevel, getMineState } from '../mine-data.js';

const CUTAWAY_Z = 4.4;

export function buildIntegratedMine(sourceMaterials) {
  const root = new THREE.Group();
  root.name = 'integratedCutawayMine';
  const materials = createMaterials(sourceMaterials);
  const runtime = {
    routeVehicles: [],
    oscillators: [],
    rotatingParts: [],
    conveyorItems: [],
    labels: [],
    update: () => {},
  };

  buildCutawayMass(root, materials);
  const haulRoute = buildSurfaceMine(root, materials);
  buildSurfacePlant(root, materials, runtime);
  buildUndergroundLevels(root, materials, runtime);
  buildSurfaceFleet(root, materials, runtime, haulRoute);
  buildMonitorPoints(root, materials, runtime);
  buildOperationalLabels(root, runtime);
  validateEquipmentBindings(root);

  root.traverse(object => preparePbrMesh(object));
  runtime.update = createAnimator(runtime);

  return {
    root,
    runtime,
    cameraPresets: {
      overview: { position: [61, 25, 76], target: [0, -8, -7], fov: 37 },
      surface: { position: [30, 60, 35], target: [-8, 6, -8], fov: 38 },
      underground: { position: [43, -1, 42], target: [1, -11, -8], fov: 37 },
    },
  };
}

function createMaterials(source) {
  const clone = (material, options = {}) => {
    const next = material.clone();
    Object.assign(next, options);
    return next;
  };

  const materials = {
    rock: clone(source.roadwayRock, { color: new THREE.Color(0x68615a), roughness: 0.98 }),
    darkRock: clone(source.coalRock, { color: new THREE.Color(0x393735), roughness: 0.94, metalness: 0.05 }),
    floor: clone(source.roadwayFloor, { color: new THREE.Color(0x81786b), roughness: 1 }),
    coal: clone(source.coalRock, { color: new THREE.Color(0x282a29), roughness: 0.72, metalness: 0.12 }),
    steel: clone(source.wornMetal, { color: new THREE.Color(0x7c8583), roughness: 0.58, metalness: 0.78 }),
    darkSteel: clone(source.wornMetal, { color: new THREE.Color(0x323a3b), roughness: 0.64, metalness: 0.76 }),
    blueSteel: clone(source.paintedMetal, { map: null, color: new THREE.Color(0x4e7f8d), roughness: 0.48, metalness: 0.67 }),
    yellowSteel: clone(source.wornMetal, { map: null, color: new THREE.Color(0xd79a26), roughness: 0.54, metalness: 0.68 }),
    rust: clone(source.coarseRust, { roughness: 0.82, metalness: 0.57 }),
    road: new THREE.MeshStandardMaterial({ color: 0x2e2b27, roughness: 0.97, metalness: 0 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x343a3a, roughness: 0.86, metalness: 0.04 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111312, roughness: 0.88, metalness: 0.02 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x7497a3, roughness: 0.1, metalness: 0.18, transmission: 0.18, transparent: true, opacity: 0.78 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffd393, emissive: 0xff9a2f, emissiveIntensity: 5.5, roughness: 0.25 }),
    redLamp: new THREE.MeshStandardMaterial({ color: 0x5a1008, emissive: 0xff2b12, emissiveIntensity: 4.5, roughness: 0.3 }),
    tunnelDark: new THREE.MeshStandardMaterial({ color: 0x080807, roughness: 1, metalness: 0 }),
    drainageWater: new THREE.MeshPhysicalMaterial({ color: 0x263b3d, roughness: 0.2, metalness: 0.05, transmission: 0.18, transparent: true, opacity: 0.72 }),
    locator: new THREE.MeshStandardMaterial({ color: 0x17c879, emissive: 0x0ca65f, emissiveIntensity: 2.4, roughness: 0.4 }),
  };

  materials.rock.envMapIntensity = 0.38;
  materials.darkRock.envMapIntensity = 0.32;
  materials.floor.envMapIntensity = 0.28;
  materials.coal.envMapIntensity = 0.48;
  materials.rock.normalScale?.set(2.0, 2.0);
  materials.darkRock.normalScale?.set(1.65, 1.65);
  materials.floor.normalScale?.set(1.45, 1.45);
  return materials;
}

function buildCutawayMass(root, materials) {
  const mass = new THREE.Group();
  mass.name = 'continuousCutawayGeology';
  root.add(mass);

  const ground = createMineGround(materials);
  mass.add(ground);

  // One continuous cutaway cliff replaces the old isolated shelf-like slabs.
  const strata = [
    { y: 11.9, h: 9.2, w: 58.5, depth: 12.5, color: 0x776d62, seed: 11 },
    { y: 3.1, h: 9.1, w: 63.5, depth: 13.0, color: 0x5e5750, seed: 23 },
    { y: -5.8, h: 9.2, w: 67.5, depth: 13.6, color: 0x6a5f54, seed: 37 },
    { y: -11.2, h: 2.1, w: 69.5, depth: 14.0, color: 0x262725, seed: 51, coal: true },
    { y: -18.2, h: 12.6, w: 72.0, depth: 14.8, color: 0x4f4841, seed: 67 },
  ];
  strata.forEach((layer, index) => {
    const material = (layer.coal ? materials.coal : materials.rock).clone();
    material.color.setHex(layer.color);
    material.roughness = 1;
    const cliffLayer = new THREE.Mesh(createCliffStratumGeometry(layer.w, layer.h, layer.depth, layer.seed), material);
    cliffLayer.position.set((index % 2 - 0.5) * 0.45, layer.y, -24.0);
    cliffLayer.name = layer.coal ? 'coalSeamCutFace' : `rockStratum-${index + 1}`;
    cliffLayer.receiveShadow = true;
    mass.add(cliffLayer);
  });

  const foundationMaterial = materials.rock.clone();
  foundationMaterial.color.setHex(0x3f3b36);
  foundationMaterial.roughness = 1;
  const foundation = new THREE.Mesh(createRockFoundationGeometry(75, 11.5, 45, 83), foundationMaterial);
  foundation.position.set(0, -30.4, -4.2);
  foundation.name = 'groundedRockFoundation';
  foundation.receiveShadow = true;
  mass.add(foundation);

  addCutFaceRubble(mass, materials);
}

function createCliffStratumGeometry(width, height, depth, seed) {
  const columns = 24;
  const rows = Math.max(5, Math.round(height * 0.7));
  const vertices = [];
  const uvs = [];
  const indices = [];
  const layerSize = (columns + 1) * (rows + 1);

  for (let face = 0; face < 2; face++) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const halfWidth = width * 0.5 * (1 - v * 0.13);
      const centerShift = Math.sin(v * 4.7 + seed * 0.21) * 0.65;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns;
        const n1 = hashNoise(u * 7.1, v * 8.3, seed);
        const n2 = hashNoise(u * 19.7, v * 17.9, seed + 9);
        const x = (u * 2 - 1) * halfWidth + centerShift + (n1 - 0.5) * 0.52;
        const y = (v - 0.5) * height + Math.sin(u * 11.2 + seed) * 0.14 + (n2 - 0.5) * 0.16;
        const frontRelief = (n1 - 0.5) * 1.45 + (n2 - 0.5) * 0.55 + Math.sin(u * 9 + v * 6 + seed) * 0.32;
        const z = face === 0 ? depth * 0.5 + frontRelief : -depth * 0.5 + (n1 - 0.5) * 0.35;
        vertices.push(x, y, z);
        uvs.push(u * 7, v * Math.max(2, height * 0.65));
      }
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
      const back = layerSize;
      indices.push(back + c, back + b, back + a, back + c, back + d, back + b);
    }
  }

  const connectEdge = edge => {
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i];
      const b = edge[i + 1];
      indices.push(a, layerSize + a, b, b, layerSize + a, layerSize + b);
    }
  };
  connectEdge(Array.from({ length: columns + 1 }, (_, i) => i));
  connectEdge(Array.from({ length: columns + 1 }, (_, i) => rows * (columns + 1) + i).reverse());
  connectEdge(Array.from({ length: rows + 1 }, (_, i) => i * (columns + 1)).reverse());
  connectEdge(Array.from({ length: rows + 1 }, (_, i) => i * (columns + 1) + columns));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function hashNoise(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function createRockBankGeometry(width, height, depth, seed, noiseScale = 0.42) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 16, Math.max(3, Math.round(height / 2)), 8);
  const position = geometry.attributes.position;
  const random = seededRandom(seed);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const normalizedY = (y + height * 0.5) / height;
    const taper = 1 - normalizedY * 0.11;
    const edgeNoise = (random() - 0.5) * noiseScale;
    position.setX(i, position.getX(i) * taper + edgeNoise);
    position.setY(i, y + edgeNoise * 0.34);
    position.setZ(i, position.getZ(i) - normalizedY * 0.55 + (random() - 0.5) * noiseScale);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createRockFoundationGeometry(width, height, depth, seed) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 18, 5, 12);
  const position = geometry.attributes.position;
  const random = seededRandom(seed);
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    const y = position.getY(i);
    const front = THREE.MathUtils.clamp((z + depth * 0.5) / depth, 0, 1);
    const vertical = THREE.MathUtils.clamp((y + height * 0.5) / height, 0, 1);
    const noise = (random() - 0.5) * 0.75;
    position.setX(i, position.getX(i) * (1 + (1 - vertical) * 0.1 - front * 0.05) + noise * 0.45);
    position.setY(i, y - Math.pow(front, 1.55) * 2.3 + noise);
    position.setZ(i, z - front * vertical * 9.5 + noise * 0.35);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createMineGround(materials) {
  const material = materials.floor.clone();
  material.color.setHex(0x514c44);
  material.roughness = 1;
  const geometry = new THREE.PlaneGeometry(170, 150, 28, 24);
  const position = geometry.attributes.position;
  const random = seededRandom(211);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const distance = Math.sqrt(x * x + y * y);
    const basin = Math.max(0, 1 - distance / 95);
    position.setZ(i, (random() - 0.5) * 1.5 + basin * 0.7);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(geometry, material);
  ground.position.set(0, -36.15, -5);
  ground.name = 'mineGroundTerrain';
  ground.receiveShadow = true;
  return ground;
}

function addCutFaceRubble(parent, materials) {
  const random = seededRandom(91);
  for (let i = 0; i < 48; i++) {
    const side = i % 2 ? -1 : 1;
    const y = -23.5 + random() * 37.5;
    const nearCoalSeam = y > -12.8 && y < -9.7;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + random() * 0.42, 0), nearCoalSeam ? materials.coal : materials.rock);
    rock.position.set(
      side * (28.2 + random() * 5.8),
      y,
      -17.8 + random() * 5.5,
    );
    rock.scale.set(0.75 + random() * 0.65, 0.55 + random() * 0.55, 0.65 + random() * 0.7);
    rock.rotation.set(random(), random() * Math.PI, random());
    rock.name = 'cutFaceRubble';
    parent.add(rock);
  }
}

function buildSurfaceMine(root, materials) {
  const surface = new THREE.Group();
  surface.name = 'surfaceOpenPit';
  root.add(surface);

  const pitCenter = new THREE.Vector3(-8, 0, -8.5);
  const terraces = [
    { outerX: 25, outerZ: 15.5, innerX: 21.7, innerZ: 12.8, top: 16.1, bottom: 12.6 },
    { outerX: 21.7, outerZ: 12.8, innerX: 18.1, innerZ: 10.1, top: 12.6, bottom: 9.0 },
    { outerX: 18.1, outerZ: 10.1, innerX: 14.3, innerZ: 7.8, top: 9.0, bottom: 5.4 },
    { outerX: 14.3, outerZ: 7.8, innerX: 10.2, innerZ: 5.5, top: 5.4, bottom: 1.9 },
    { outerX: 10.2, outerZ: 5.5, innerX: 6.2, innerZ: 3.1, top: 1.9, bottom: -1.4 },
  ];

  const benchColors = [0x857b70, 0x6f6961, 0x82776a, 0x625e58, 0x756d64];
  terraces.forEach((config, index) => {
    const benchMaterial = (index % 2 ? materials.darkRock : materials.rock).clone();
    benchMaterial.color.setHex(benchColors[index]);
    const terrace = createTerrace(config, benchMaterial);
    terrace.position.copy(pitCenter);
    terrace.name = `openPitBench-${index + 1}`;
    surface.add(terrace);
  });

  const bottom = new THREE.Mesh(new THREE.CircleGeometry(6.25, 64), materials.floor);
  bottom.scale.y = 0.5;
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.set(pitCenter.x, -1.4, pitCenter.z);
  bottom.name = 'pitFloor';
  surface.add(bottom);

  addPlateauSections(surface, materials, pitCenter);

  const route = createHaulRoad(pitCenter, materials);
  surface.add(route.mesh);
  return route.curve;
}

function createTerrace(config, material) {
  const segments = 80;
  const vertices = [];
  const uvs = [];
  const indices = [];
  const radii = [
    [config.outerX, config.outerZ, config.top],
    [config.outerX - 1.55, config.outerZ - 1.05, config.top],
    [config.innerX, config.innerZ, config.bottom],
  ];

  radii.forEach(([rx, rz, y], ring) => {
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      vertices.push(Math.cos(angle) * rx, y, Math.sin(angle) * rz);
      uvs.push(i / segments * 7, ring * 1.5);
    }
  });

  const row = segments + 1;
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = ring * row + i;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function addPlateauSections(parent, materials, center) {
  const plateauMaterial = materials.floor;
  const sections = [
    [-27.5, 8, 15, 23, 16],
    [19.5, 8, 18, 23, 16],
    [-4, -24, 52, 15, 16],
    [-4, 10.5, 52, 7.5, 16],
  ];
  sections.forEach(([x, z, width, depth, y]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, 12, 8), plateauMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(25.2, 0.18, 7, 96), materials.rock);
  rim.scale.z = 0.62;
  rim.rotation.x = Math.PI / 2;
  rim.position.set(center.x, 16.05, center.z);
  parent.add(rim);
}

function createHaulRoad(center, materials) {
  const points = [];
  const turns = 2.18;
  const count = 120;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = -0.25 + t * Math.PI * 2 * turns;
    const rx = THREE.MathUtils.lerp(21.8, 6.8, t);
    const rz = THREE.MathUtils.lerp(12.4, 3.35, t);
    points.push(new THREE.Vector3(
      center.x + Math.cos(angle) * rx,
      THREE.MathUtils.lerp(15.25, -0.95, t),
      center.z + Math.sin(angle) * rz,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const mesh = new THREE.Mesh(createRibbonGeometry(curve, 2.15, 180), materials.road);
  mesh.name = 'spiralHaulRoad';
  mesh.receiveShadow = true;
  return { curve, mesh };
}

function createRibbonGeometry(curve, width, segments) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width * 0.5);
    vertices.push(point.x + lateral.x, point.y + 0.05, point.z + lateral.z);
    vertices.push(point.x - lateral.x, point.y + 0.05, point.z - lateral.z);
    uvs.push(0, t * 30, 1, t * 30);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSurfacePlant(root, materials, runtime) {
  const plant = new THREE.Group();
  plant.name = 'surfaceProcessingPlant';
  registerEquipment(plant, 'EQ-12');
  plant.position.set(19, 16.1, -8);
  root.add(plant);

  const pad = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), materials.concrete);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.03;
  plant.add(pad);

  addIndustrialBuilding(plant, materials, [-4.8, 1.8, 0.8], [5.8, 3.6, 4.2]);
  addIndustrialBuilding(plant, materials, [4.2, 1.3, 2.2], [5.6, 2.6, 3.1]);

  [-1.6, 0, 1.6].forEach((x, index) => {
    const silo = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.92, 4.1, 20), materials.blueSteel);
    tank.position.y = 3.2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 20), materials.steel);
    cone.position.y = 0.65;
    cone.rotation.z = Math.PI;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.16, 20), materials.steel);
    cap.position.y = 5.32;
    silo.position.set(x - 0.2, 0, -2.5);
    silo.name = `plantSilo-${index + 1}`;
    silo.add(tank, cone, cap);
    plant.add(silo);
  });

  const conveyor = createElevatedConveyor(materials, runtime, 14);
  conveyor.position.set(-1, 3.1, -0.6);
  conveyor.rotation.y = -0.12;
  conveyor.rotation.z = -0.14;
  plant.add(conveyor);
}

function addIndustrialBuilding(parent, materials, position, size) {
  const group = new THREE.Group();
  group.position.fromArray(position);
  const body = new THREE.Mesh(new RoundedBoxGeometry(...size, 4, 0.12), materials.blueSteel);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(size[0] + 0.25, 0.16, size[2] + 0.25), materials.darkSteel);
  roof.position.y = size[1] * 0.5 + 0.1;
  for (let i = -1; i <= 1; i++) {
    const window = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.48, 0.03, 2, 0.04), materials.glass);
    window.position.set(i * 1.05, 0.35, size[2] * 0.5 + 0.02);
    group.add(window);
  }
  group.add(body, roof);
  parent.add(group);
}

function createElevatedConveyor(materials, runtime, length) {
  const group = new THREE.Group();
  group.name = 'surfaceConveyor';
  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 1.05), materials.rubber);
  group.add(belt);
  for (let x = -length / 2; x <= length / 2; x += 1.15) {
    const frame = new THREE.Group();
    frame.position.x = x;
    const rollerGeometry = new THREE.CylinderGeometry(0.085, 0.085, 1.18, 12);
    rollerGeometry.rotateX(Math.PI / 2);
    const roller = new THREE.Mesh(rollerGeometry, materials.steel);
    roller.position.y = 0.13;
    frame.add(roller);
    runtime.rotatingParts.push({ object: roller, axis: 'z', speed: 2.8 });
    [-0.58, 0.58].forEach(z => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 3.2, 7), materials.steel);
      leg.position.set(0, -1.65, z);
      frame.add(leg);
    });
    group.add(frame);
  }
  return group;
}

function buildUndergroundLevels(root, materials, runtime) {
  const underground = new THREE.Group();
  underground.name = 'openThreeDimensionalMineNetwork';
  root.add(underground);

  const roadways = [
    { id: 'mainInclineLevel', x: -15, y: 5.5, zFront: 9, zBack: -20, width: 5.4, type: 'rail', seed: 121 },
    { id: 'trackHaulageLevel', x: 8, y: -3.6, zFront: 10, zBack: -22, width: 5.6, type: 'rail', seed: 131 },
    { id: 'beltAndUtilityLevel', x: -8, y: -12.8, zFront: 11, zBack: -23, width: 5.8, type: 'belt', seed: 141 },
    { id: 'workingFaceLevel', x: 6, y: -22.1, zFront: 12, zBack: -22, width: 6.2, type: 'utility', seed: 151 },
    { id: 'returnAirRoadway', x: 18, y: -3.6, zFront: 5, zBack: -21, width: 4.8, type: 'air', seed: 161 },
  ];

  roadways.forEach(roadway => {
    underground.add(createRoadwayPortal(roadway, materials));
    underground.add(createLongitudinalRoadway(roadway, materials, runtime));
  });

  const connectors = [
    [new THREE.Vector3(-25, 13.2, 6), new THREE.Vector3(-15, 5.5, -3)],
    [new THREE.Vector3(-15, 4.8, -11), new THREE.Vector3(8, -3.0, -5)],
    [new THREE.Vector3(8, -4.2, -13), new THREE.Vector3(-8, -12.2, -7)],
    [new THREE.Vector3(-8, -13.5, -15), new THREE.Vector3(6, -21.5, -9)],
  ];
  connectors.forEach((pair, index) => underground.add(createIncline(pair, materials, runtime, index)));

  underground.add(createCrosscut({ id: 'centralEquipmentCrosscut', y: -12.8, xStart: -14, xEnd: 15, z: -9 }, materials, runtime));
  underground.add(createCrosscut({ id: 'workingFaceCrosscut', y: -22.1, xStart: -13, xEnd: 17, z: -13 }, materials, runtime));

  buildPumpRoom(underground, materials, [-13, -14.68, -9]);
  buildSubstation(underground, materials, [14, -14.68, -9]);
  buildWorkingFaceEquipment(underground, materials, runtime);
}

function createLongitudinalRoadway(roadway, materials, runtime) {
  const group = new THREE.Group();
  group.name = roadway.id;
  group.position.set(roadway.x, roadway.y, 0);
  const length = roadway.zFront - roadway.zBack;
  const centerZ = (roadway.zFront + roadway.zBack) * 0.5;
  const halfWidth = roadway.width * 0.5;

  const floor = new THREE.Mesh(createRockBankGeometry(roadway.width, 0.34, length, roadway.seed, 0.18), materials.floor);
  floor.position.set(0, -2.05, centerZ);
  floor.name = `${roadway.id}Floor`;
  group.add(floor);

  const farWall = new THREE.Mesh(createRockBankGeometry(0.52, 4.35, length, roadway.seed + 1, 0.22), materials.rock);
  farWall.position.set(-halfWidth, 0.12, centerZ);
  farWall.name = `${roadway.id}FarRockWall`;
  group.add(farWall);

  const halfRoof = new THREE.Mesh(new RoundedBoxGeometry(halfWidth + 0.65, 0.48, length, 3, 0.12), materials.rock);
  halfRoof.position.set(-halfWidth * 0.5 + 0.28, 2.35, centerZ);
  halfRoof.name = `${roadway.id}CutawayRoof`;
  group.add(halfRoof);

  [-1, 1].forEach(side => {
    const servicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, length - 1, 10), side < 0 ? materials.blueSteel : materials.rust);
    servicePipe.geometry.rotateX(Math.PI / 2);
    servicePipe.position.set(side * (halfWidth - 0.28), 0.75, centerZ);
    servicePipe.name = `${roadway.id}ServicePipe-${side < 0 ? 'water' : 'compressedAir'}`;
    group.add(servicePipe);
  });

  addRoadwayInfrastructure(group, roadway, materials);

  for (let z = roadway.zFront - 1; z > roadway.zBack + 0.5; z -= 2.45) {
    const rib = createBranchRib(roadway.width, materials);
    rib.position.set(0, -2, z);
    group.add(rib);
  }

  for (let z = roadway.zFront - 2; z > roadway.zBack + 1; z -= 4.6) {
    const fixture = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.16, 2, 0.03), materials.lamp);
    fixture.position.set(0, 2.05, z);
    group.add(fixture);
    const light = new THREE.PointLight(0xffad55, 34, 8, 2);
    light.position.set(0, 1.55, z - 0.4);
    light.name = 'underLight';
    group.add(light);
    runtime.oscillators.push({ object: fixture, base: 5.1, amplitude: 0.12, phase: z });
  }

  if (roadway.type === 'rail') addLongitudinalRails(group, roadway, materials);
  if (roadway.type === 'belt') addLongitudinalBeltEquipment(group, roadway, materials, runtime);
  if (roadway.type === 'air') {
    const fan = createVentilationFan(materials, runtime);
    fan.position.set(0, -0.55, roadway.zFront - 4);
    fan.rotation.y = Math.PI / 2;
    registerEquipment(fan, 'EQ-11');
    group.add(fan);
  }
  return group;
}

function addRoadwayInfrastructure(group, roadway, materials) {
  const length = roadway.zFront - roadway.zBack;
  const centerZ = (roadway.zFront + roadway.zBack) * 0.5;
  const halfWidth = roadway.width * 0.5;

  const channel = new THREE.Group();
  channel.name = `${roadway.id}DrainageChannel`;
  channel.position.set(halfWidth - 0.38, -1.82, centerZ);
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, length - 0.8), materials.drainageWater);
  water.name = `${roadway.id}DrainageWater`;
  channel.add(water);
  [-1, 1].forEach(side => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, length - 0.5), materials.concrete);
    curb.position.set(side * 0.23, 0.04, 0);
    curb.name = `${roadway.id}DrainageCurb`;
    channel.add(curb);
  });
  group.add(channel);

  const cableBundle = new THREE.Group();
  cableBundle.name = `${roadway.id}CableBundle`;
  for (let cableIndex = 0; cableIndex < 3; cableIndex++) {
    const points = [];
    for (let segment = 0; segment <= 10; segment++) {
      const t = segment / 10;
      points.push(new THREE.Vector3(
        -halfWidth + 0.2 + cableIndex * 0.055,
        1.12 + cableIndex * 0.13 - Math.sin(t * Math.PI * 10) * 0.07,
        THREE.MathUtils.lerp(roadway.zFront - 0.5, roadway.zBack + 0.5, t),
      ));
    }
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.032, 6), cableIndex === 1 ? materials.blueSteel : materials.rubber);
    cable.name = `${roadway.id}Cable-${cableIndex + 1}`;
    cableBundle.add(cable);
  }
  group.add(cableBundle);

  const random = seededRandom(roadway.seed + 43);
  for (let z = roadway.zFront - 2.2; z > roadway.zBack + 1; z -= 3.6) {
    [-0.55, 0.65, 1.7].forEach((y, rowIndex) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 10), materials.steel);
      bolt.geometry.rotateZ(Math.PI / 2);
      bolt.position.set(-halfWidth + 0.29, y, z + rowIndex * 0.18);
      bolt.name = `${roadway.id}RockBoltPlate`;
      group.add(bolt);
    });
  }

  for (let z = roadway.zFront - 1.4; z > roadway.zBack + 0.8; z -= 3.1 + random() * 1.5) {
    const side = random() > 0.45 ? 1 : -1;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + random() * 0.22, 0), random() > 0.76 ? materials.coal : materials.darkRock);
    rock.position.set(side * (halfWidth - 0.55), -1.62 + random() * 0.12, z + (random() - 0.5) * 0.8);
    rock.scale.set(1 + random(), 0.45 + random() * 0.45, 0.7 + random());
    rock.rotation.set(random(), random() * Math.PI, random());
    rock.name = `${roadway.id}FloorDebris`;
    group.add(rock);
  }
}

function createRoadwayPortal(roadway, materials) {
  const group = new THREE.Group();
  group.name = `${roadway.id}DeepRockPortal`;
  group.position.set(roadway.x, roadway.y, roadway.zBack - 0.08);
  const half = roadway.width * 0.5 - 0.25;

  const opening = new THREE.Shape();
  opening.moveTo(-half, -2.04);
  opening.lineTo(-half, 1.65);
  opening.quadraticCurveTo(-half, 2.9, 0, 3.08);
  opening.quadraticCurveTo(half, 2.9, half, 1.65);
  opening.lineTo(half, -2.04);
  opening.closePath();
  const darkness = new THREE.Mesh(new THREE.ShapeGeometry(opening, 16), materials.tunnelDark);
  darkness.position.z = -0.12;
  darkness.name = `${roadway.id}TunnelDepth`;
  group.add(darkness);

  const archPoints = [new THREE.Vector3(-half, -2.02, 0), new THREE.Vector3(-half, 1.65, 0)];
  for (let i = 0; i <= 14; i++) {
    const angle = Math.PI - i / 14 * Math.PI;
    archPoints.push(new THREE.Vector3(Math.cos(angle) * half, 1.65 + Math.sin(angle) * 1.42, 0));
  }
  archPoints.push(new THREE.Vector3(half, -2.02, 0));
  const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 42, 0.085, 8), materials.rust);
  arch.position.z = 0.04;
  group.add(arch);

  const random = seededRandom(roadway.seed + 17);
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? -1 : 1;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + random() * 0.42, 1), i % 6 === 0 ? materials.coal : materials.darkRock);
    rock.position.set(side * (half + 0.25 + random() * 0.85), -1.8 + random() * 4.8, 0.08 + random() * 0.35);
    rock.scale.set(0.7 + random(), 0.7 + random() * 1.2, 0.5 + random());
    rock.rotation.set(random(), random() * Math.PI, random());
    group.add(rock);
  }
  return group;
}

function addLongitudinalRails(group, roadway, materials) {
  const length = roadway.zFront - roadway.zBack - 1;
  const centerZ = (roadway.zFront + roadway.zBack) * 0.5;
  [-0.48, 0.48].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, length), materials.steel);
    rail.position.set(x, -1.88, centerZ);
    group.add(rail);
  });
  for (let z = roadway.zFront - 0.8; z > roadway.zBack + 0.4; z -= 0.72) {
    const sleeper = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.1, 0.16, 2, 0.025), materials.rust);
    sleeper.position.set(0, -1.95, z);
    group.add(sleeper);
  }
}

function addLongitudinalBeltEquipment(group, roadway, materials, runtime) {
  const length = roadway.zFront - roadway.zBack - 2;
  const belt = createUndergroundBelt(length, materials, runtime);
  belt.name = 'undergroundBeltDSJ120';
  belt.rotation.y = Math.PI / 2;
  belt.position.set(-0.55, -1.45, (roadway.zFront + roadway.zBack) * 0.5);
  registerEquipment(belt, 'EQ-04');
  group.add(belt);

  const loader = createStageLoader(materials, runtime);
  loader.position.set(0.3, -1.25, roadway.zFront - 7);
  loader.rotation.y = Math.PI / 2;
  registerEquipment(loader, 'EQ-05');
  group.add(loader);

  const crusher = createCrusher(materials, runtime);
  crusher.position.set(0.3, -1.0, roadway.zFront - 13);
  crusher.rotation.y = Math.PI / 2;
  registerEquipment(crusher, 'EQ-06');
  group.add(crusher);
}

function createCrosscut({ id, y, xStart, xEnd, z }, materials, runtime) {
  const length = xEnd - xStart;
  const group = new THREE.Group();
  group.name = id;
  group.position.set((xStart + xEnd) * 0.5, y, z);
  const floor = new THREE.Mesh(createRockBankGeometry(length, 0.34, 4.8, Math.abs(Math.round(xStart * 13 + z * 7)), 0.17), materials.floor);
  floor.position.y = -2.05;
  group.add(floor);
  for (let x = -length * 0.5 + 0.8; x < length * 0.5; x += 2.8) {
    const rib = createGalleryRib(materials, 2.18);
    rib.position.set(x, -2.02, 0);
    group.add(rib);
  }
  addGalleryLights(group, length, materials, runtime, 4.8);
  return group;
}

function createCutawayGallery(level, materials, runtime) {
  const group = new THREE.Group();
  group.name = level.id;
  group.position.set(level.x, level.y, CUTAWAY_Z + 0.82);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(level.length - 1.1, 0.24, level.depth), materials.floor);
  floor.position.set(0, -2.05, -0.12);
  floor.name = `${level.id}Floor`;
  group.add(floor);

  addSegmentedRearWall(group, level, materials);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(level.length, 0.72, level.depth - 0.4), materials.darkRock);
  crown.position.set(0, 2.6, -0.1);
  crown.name = `${level.id}RoofMass`;
  group.add(crown);

  [-1, 1].forEach(side => {
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.72, 5.0, level.depth), materials.darkRock);
    endWall.position.set(side * level.length * 0.5, 0.18, -0.1);
    endWall.name = `${level.id}EndWall`;
    group.add(endWall);
  });

  for (let x = -level.length / 2 + 1.1; x < level.length / 2 - 0.5; x += 3.15) {
    const rib = createGalleryRib(materials, level.depth * 0.5 - 0.25);
    rib.position.set(x, -2.02, -0.1);
    group.add(rib);
  }
  addGalleryLights(group, level.length, materials, runtime, level.depth);

  const branch = createDepthBranch(level, materials, runtime);
  group.add(branch);

  if (level.type === 'rail') addUndergroundRails(group, level.length, materials);
  if (level.type === 'belt') {
    const belt = createUndergroundBelt(level.length - 2, materials, runtime);
    belt.name = 'undergroundBeltDSJ120';
    registerEquipment(belt, 'EQ-04');
    group.add(belt);
    const loader = createStageLoader(materials, runtime);
    loader.position.set(7, -1.25, -1.55);
    registerEquipment(loader, 'EQ-05');
    group.add(loader);
    const crusher = createCrusher(materials, runtime);
    crusher.position.set(13, -1.0, -1.55);
    registerEquipment(crusher, 'EQ-06');
    group.add(crusher);
  }
  if (level.id === 'mainInclineLevel') {
    const fan = createVentilationFan(materials, runtime);
    fan.position.set(10, -0.5, -1.45);
    registerEquipment(fan, 'EQ-11');
    group.add(fan);
  }
  return group;
}

function addSegmentedRearWall(group, level, materials) {
  const openingWidth = level.type === 'face' ? 6.8 : 5.9;
  const leftWidth = level.branchX - openingWidth * 0.5 + level.length * 0.5;
  const rightWidth = level.length * 0.5 - (level.branchX + openingWidth * 0.5);
  const z = -level.depth * 0.5;
  if (leftWidth > 0) {
    const left = new THREE.Mesh(new THREE.BoxGeometry(leftWidth, 4.9, 0.6), materials.darkRock);
    left.position.set(-level.length * 0.5 + leftWidth * 0.5, 0.2, z);
    left.name = `${level.id}RearRockLeft`;
    group.add(left);
  }
  if (rightWidth > 0) {
    const right = new THREE.Mesh(new THREE.BoxGeometry(rightWidth, 4.9, 0.6), materials.darkRock);
    right.position.set(level.branchX + openingWidth * 0.5 + rightWidth * 0.5, 0.2, z);
    right.name = `${level.id}RearRockRight`;
    group.add(right);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(openingWidth, 0.85, 0.7), materials.darkRock);
  lintel.position.set(level.branchX, 2.2, z);
  lintel.name = `${level.id}BranchLintel`;
  group.add(lintel);
}

function createGalleryRib(materials, halfDepth = 3.2) {
  const points = [new THREE.Vector3(0, 0, -halfDepth), new THREE.Vector3(0, 2.05, -halfDepth)];
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI - i / 12 * Math.PI;
    points.push(new THREE.Vector3(0, 2.05 + Math.sin(angle) * 1.2, Math.cos(angle) * halfDepth));
  }
  points.push(new THREE.Vector3(0, 0, halfDepth));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.055, 7), materials.rust);
}

function addGalleryLights(group, length, materials, runtime, depth) {
  for (let x = -length / 2 + 2; x < length / 2 - 1; x += 5.6) {
    const fixture = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.12, 0.18, 2, 0.035), materials.lamp);
    fixture.position.set(x, 1.85, depth * 0.28);
    group.add(fixture);
    const light = new THREE.PointLight(0xffa545, 8, 7, 2);
    light.position.set(x, 1.45, depth * 0.3);
    light.name = 'underLight';
    group.add(light);
    runtime.oscillators.push({ object: fixture, base: 5.3, amplitude: 0.16, phase: x });
  }
}

function createDepthBranch(level, materials, runtime) {
  const branch = new THREE.Group();
  branch.name = `${level.id}DepthBranch`;
  // The branch starts at the open cut face and runs through the crosscut into the rock mass.
  branch.position.set(level.branchX, 0, level.depth * 0.5 - 0.25);
  const width = level.type === 'face' ? 6.4 : 5.5;
  const depth = level.type === 'belt' ? 13 : 10;
  const branchFloorMaterial = materials.floor.clone();
  branchFloorMaterial.color.setHex(0x625b52);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, depth), branchFloorMaterial);
  floor.position.set(0, -2.02, -depth * 0.5);
  branch.add(floor);
  [-1, 1].forEach(side => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.7, depth), materials.rock);
    wall.position.set(side * width * 0.5, 0.25, -depth * 0.5);
    branch.add(wall);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, depth), materials.rock);
  roof.position.set(0, 2.45, -depth * 0.5);
  branch.add(roof);
  for (let z = -1; z > -depth + 0.5; z -= 2.2) {
    const rib = createBranchRib(width, materials);
    rib.position.set(0, -2, z);
    branch.add(rib);
  }
  for (let z = -2; z > -depth + 1; z -= 4.5) {
    const fixture = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.12, 0.16, 2, 0.03), materials.lamp);
    fixture.position.set(0, 2.05, z);
    branch.add(fixture);
    runtime.oscillators.push({ object: fixture, base: 5.1, amplitude: 0.12, phase: z });
    const branchLight = new THREE.PointLight(0xffad55, 42, 8, 2);
    branchLight.position.set(0, 1.6, z + 0.4);
    branchLight.name = 'underLight';
    branch.add(branchLight);
  }
  if (level.type === 'rail') {
    [-0.46, 0.46].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, depth - 0.6), materials.steel);
      rail.position.set(x, -1.86, -depth * 0.5);
      branch.add(rail);
    });
    for (let z = -0.6; z > -depth; z -= 0.72) {
      const sleeper = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.09, 0.16, 2, 0.025), materials.rust);
      sleeper.position.set(0, -1.93, z);
      branch.add(sleeper);
    }
  } else {
    const serviceLine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, depth - 0.8), materials.blueSteel);
    serviceLine.position.set(-width * 0.5 + 0.28, 0.8, -depth * 0.5);
    branch.add(serviceLine);
    const guide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, depth - 0.7), materials.lamp);
    guide.position.set(width * 0.5 - 0.55, -1.86, -depth * 0.5);
    branch.add(guide);
  }
  const endWall = new THREE.Mesh(new THREE.BoxGeometry(width - 0.55, 4.2, 0.45), materials.tunnelDark);
  endWall.position.set(0, 0.08, -depth);
  branch.add(endWall);
  const endLight = new THREE.PointLight(0xffa545, 58, 10, 2);
  endLight.position.set(0, 0.6, -depth + 1.2);
  branch.add(endLight);
  return branch;
}

function createBranchRib(width, materials) {
  const half = width * 0.5 - 0.2;
  const points = [new THREE.Vector3(-half, 0, 0), new THREE.Vector3(-half, 2.05, 0)];
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI - i / 12 * Math.PI;
    points.push(new THREE.Vector3(Math.cos(angle) * half, 2.05 + Math.sin(angle) * 1.05, 0));
  }
  points.push(new THREE.Vector3(half, 0, 0));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.05, 7), materials.rust);
}

function addUndergroundRails(group, length, materials) {
  [-0.48, 0.48].forEach(z => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length - 2, 0.09, 0.075), materials.steel);
    rail.position.set(0, -1.89, z + 0.35);
    group.add(rail);
  });
  for (let x = -length / 2 + 1.3; x < length / 2 - 0.7; x += 0.72) {
    const sleeper = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, 1.45, 2, 0.025), materials.rust);
    sleeper.position.set(x, -1.95, 0.35);
    group.add(sleeper);
  }
}

function createUndergroundBelt(length, materials, runtime) {
  const group = new THREE.Group();
  group.position.set(0, -1.45, 0.25);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 1.05), materials.rubber);
  group.add(belt);
  for (let x = -length / 2; x <= length / 2; x += 1.15) {
    const rollerGeometry = new THREE.CylinderGeometry(0.065, 0.065, 1.12, 10);
    rollerGeometry.rotateX(Math.PI / 2);
    const roller = new THREE.Mesh(rollerGeometry, materials.steel);
    roller.position.set(x, 0.1, 0);
    group.add(roller);
    runtime.rotatingParts.push({ object: roller, axis: 'z', speed: 3.2 });
  }
  for (let i = 0; i < 34; i++) {
    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + i % 4 * 0.018), materials.coal);
    coal.position.set(-length / 2 + i / 34 * length, 0.15, (i % 5 - 2) * 0.17);
    coal.userData.motion = { axis: 'x', min: -length / 2, max: length / 2, speed: 0.7 };
    runtime.conveyorItems.push(coal);
    group.add(coal);
  }
  return group;
}

function createIncline([start, end], materials, runtime, index) {
  const group = new THREE.Group();
  group.name = `inclinedShaft-${index + 1}`;
  const curve = new THREE.LineCurve3(start, end);
  const lining = materials.darkRock.clone();
  lining.side = THREE.BackSide;
  const opening = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 1.65, 18), lining);
  opening.name = `${group.name}VolumetricOpening`;
  group.add(opening);
  const railA = new THREE.Mesh(new THREE.TubeGeometry(offsetLine(start, end, -0.42), 30, 0.045, 7), materials.steel);
  const railB = new THREE.Mesh(new THREE.TubeGeometry(offsetLine(start, end, 0.42), 30, 0.045, 7), materials.steel);
  group.add(railA, railB);
  return group;
}

function offsetLine(start, end, xOffset) {
  return new THREE.LineCurve3(start.clone().add(new THREE.Vector3(xOffset, 0, 0.28)), end.clone().add(new THREE.Vector3(xOffset, 0, 0.28)));
}

function buildPumpRoom(parent, materials, position) {
  const group = new THREE.Group();
  group.name = 'pumpRoom';
  registerEquipment(group, 'EQ-09');
  group.position.fromArray(position);
  const base = new THREE.Mesh(new RoundedBoxGeometry(6, 0.22, 2.4, 3, 0.05), materials.concrete);
  for (let i = -1; i <= 1; i++) {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.3, 16), materials.blueSteel);
    pump.rotation.z = Math.PI / 2;
    pump.position.set(i * 1.55, 0.62, 0.15);
    group.add(pump);
  }
  group.add(base);
  parent.add(group);
}

function buildSubstation(parent, materials, position) {
  const group = new THREE.Group();
  group.name = 'centralSubstation';
  registerEquipment(group, 'EQ-10');
  group.position.fromArray(position);
  for (let i = -2; i <= 2; i++) {
    const cabinet = new THREE.Mesh(new RoundedBoxGeometry(0.95, 1.5, 0.72, 3, 0.07), materials.blueSteel);
    cabinet.position.set(i * 1.05, 0.62, 0);
    const status = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), i % 2 ? materials.lamp : materials.locator);
    status.position.set(i * 1.05, 1.02, 0.38);
    group.add(cabinet, status);
  }
  parent.add(group);
}

function buildWorkingFaceEquipment(parent, materials, runtime) {
  const face = new THREE.Group();
  face.name = 'workingFace1206';
  face.position.set(5, -22.15, -12.6);
  parent.add(face);

  const coalWall = new THREE.Mesh(new RoundedBoxGeometry(16, 4.4, 0.55, 5, 0.16), materials.coal);
  coalWall.position.set(0, 0.35, -0.75);
  coalWall.name = 'coalWall';
  face.add(coalWall);

  const supportArray = new THREE.Group();
  supportArray.name = 'hydraulicSupportArray';
  registerEquipment(supportArray, 'EQ-03');
  for (let x = -7.2; x <= 7.2; x += 1.2) {
    const support = createCompactSupport(materials);
    support.position.set(x, -1.55, 0.65);
    support.name = 'support';
    supportArray.add(support);
  }
  face.add(supportArray);

  const scraper = createScraperConveyor(materials, runtime, 16.5);
  scraper.position.set(0, -1.72, 1.8);
  registerEquipment(scraper, 'EQ-02');
  face.add(scraper);

  const shearer = createCompactShearer(materials, runtime);
  shearer.position.set(0, -0.78, 1.25);
  shearer.name = 'shearer';
  registerEquipment(shearer, 'EQ-01');
  face.add(shearer);
  runtime.workingFaceShearer = shearer;
}

function createScraperConveyor(materials, runtime, length) {
  const group = new THREE.Group();
  group.name = 'scraperConveyor';
  const pan = new THREE.Mesh(new RoundedBoxGeometry(length, 0.18, 0.92, 3, 0.05), materials.darkSteel);
  group.add(pan);
  for (let x = -length * 0.5 + 0.35; x < length * 0.5; x += 0.55) {
    const flight = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.1, 0.78, 2, 0.02), materials.steel);
    flight.position.set(x, 0.14, 0);
    group.add(flight);
  }
  for (let i = 0; i < 18; i++) {
    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + (i % 3) * 0.02), materials.coal);
    coal.position.set(-length * 0.5 + i / 18 * length, 0.28, (i % 4 - 1.5) * 0.15);
    coal.userData.motion = { axis: 'x', min: -length * 0.5, max: length * 0.5, speed: 0.24 };
    runtime.conveyorItems.push(coal);
    group.add(coal);
  }
  return group;
}

function createStageLoader(materials, runtime) {
  const group = createScraperConveyor(materials, runtime, 7.5);
  group.name = 'stageLoaderSZZ1200';
  group.rotation.y = -0.08;
  const drive = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.9, 1.35, 4, 0.12), materials.yellowSteel);
  drive.position.set(3.1, 0.55, 0);
  group.add(drive);
  return group;
}

function createCrusher(materials, runtime) {
  const group = new THREE.Group();
  group.name = 'crusherPLM3000';
  const housing = new THREE.Mesh(new RoundedBoxGeometry(3.5, 1.85, 2.1, 5, 0.16), materials.yellowSteel);
  housing.position.y = 0.75;
  group.add(housing);
  [-0.58, 0.58].forEach(z => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.0, 16), materials.darkSteel);
    drum.geometry.rotateX(Math.PI / 2);
    drum.position.set(0.25, 0.55, z);
    group.add(drum);
    runtime.rotatingParts.push({ object: drum, axis: 'z', speed: 0.65 });
  });
  return group;
}

function createVentilationFan(materials, runtime) {
  const group = new THREE.Group();
  group.name = 'mainVentilationFan';
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.2, 24, 1, true), materials.blueSteel);
  duct.rotation.z = Math.PI / 2;
  duct.position.y = 0.95;
  group.add(duct);
  const hub = new THREE.Group();
  hub.position.set(1.12, 0.95, 0);
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.72, 0.24, 3, 0.04), materials.steel);
    blade.position.y = 0.36;
    blade.rotation.x = 0.25;
    blade.rotation.z = i / 7 * Math.PI * 2;
    hub.add(blade);
  }
  runtime.rotatingParts.push({ object: hub, axis: 'x', speed: 0.7 });
  group.add(hub);
  return group;
}

function createCompactSupport(materials) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.16, 1.2, 3, 0.04), materials.blueSteel);
  const canopy = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.16, 1.35, 3, 0.04), materials.blueSteel);
  canopy.position.y = 2.3;
  [-0.26, 0.26].forEach(z => {
    const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.0, 10), materials.steel);
    ram.position.set(-0.12, 1.1, z);
    group.add(ram);
  });
  const shield = new THREE.Mesh(new RoundedBoxGeometry(0.18, 1.65, 1.08, 3, 0.04), materials.blueSteel);
  shield.position.set(-0.42, 1.2, 0);
  shield.rotation.z = -0.15;
  group.add(base, canopy, shield);
  return group;
}

function createCompactShearer(materials, runtime) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.9, 0.9, 5, 0.13), materials.yellowSteel);
  group.add(body);
  [-1, 1].forEach(side => {
    const drum = createCuttingDrum(materials);
    drum.position.set(side * 1.85, 0.15, -0.1);
    drum.name = 'drum';
    group.add(drum);
    runtime.rotatingParts.push({ object: drum, axis: 'x', speed: side * 3.5 });
  });
  return group;
}

function createCuttingDrum(materials) {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(0.5, 0.42, 0.48, 18);
  geometry.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(geometry, materials.rust);
  group.add(hub);
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2;
    const pick = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), materials.steel);
    pick.position.set((i % 2 - 0.5) * 0.34, Math.cos(angle) * 0.48, Math.sin(angle) * 0.48);
    pick.rotation.z = -angle;
    group.add(pick);
  }
  return group;
}

function buildSurfaceFleet(root, materials, runtime, haulRoute) {
  const fleet = new THREE.Group();
  fleet.name = 'surfaceMiningFleet';
  root.add(fleet);
  [0.12, 0.54].forEach((progress, index) => {
    const truck = createMiningDumpTruck(materials, index ? 0xb97918 : 0xd09a25);
    truck.scale.setScalar(index ? 1.0 : 1.15);
    truck.name = `haulTruck-${index + 1}`;
    fleet.add(truck);
    runtime.routeVehicles.push({
      object: truck,
      curve: haulRoute,
      progress,
      distancePerSecond: index ? 0.50 : 0.56,
      wheelRadius: 0.62,
      direction: 1,
      wheels: truck.userData.wheels,
      pingPong: true,
    });
  });

  const plateauRoad = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 2.7), materials.road);
  plateauRoad.position.set(-5, 16.12, 6.8);
  plateauRoad.name = 'plateauHaulRoad';
  plateauRoad.receiveShadow = true;
  fleet.add(plateauRoad);

  const plateauRoute = new THREE.LineCurve3(
    new THREE.Vector3(-23, 16.2, 6.8),
    new THREE.Vector3(12, 16.2, 6.8),
  );
  const plateauTruck = createMiningDumpTruck(materials, 0xc58a1c);
  plateauTruck.scale.setScalar(0.92);
  plateauTruck.name = 'haulTruck-plateau';
  fleet.add(plateauTruck);
  runtime.routeVehicles.push({
    object: plateauTruck,
    curve: plateauRoute,
    progress: 0.32,
    distancePerSecond: 0.62,
    wheelRadius: 0.62,
    direction: 1,
    wheels: plateauTruck.userData.wheels,
    pingPong: true,
  });

  const trainRoute = new THREE.LineCurve3(new THREE.Vector3(8, -5.46, 8), new THREE.Vector3(8, -5.46, -18));
  const train = createMineTrain(materials);
  train.name = 'undergroundMineTrain';
  registerEquipment(train, 'EQ-07');
  root.add(train);
  runtime.routeVehicles.push({ object: train, curve: trainRoute, progress: 0.15, distancePerSecond: 0.32, wheelRadius: 0.32, direction: 1, wheels: train.userData.wheels, pingPong: true });

  const utilityRoute = new THREE.LineCurve3(new THREE.Vector3(6, -24.12, 10), new THREE.Vector3(6, -24.12, -8));
  const utility = createUndergroundUtilityVehicle(materials);
  utility.name = 'undergroundUtilityVehicle';
  registerEquipment(utility, 'EQ-08');
  root.add(utility);
  runtime.routeVehicles.push({ object: utility, curve: utilityRoute, progress: 0.3, distancePerSecond: 0.25, wheelRadius: 0.34, direction: 1, wheels: utility.userData.wheels, pingPong: true });
}

function createMiningDumpTruck(materials, color) {
  const truck = new THREE.Group();
  truck.userData.wheels = [];
  const paint = materials.yellowSteel.clone();
  paint.color.setHex(color);

  const chassis = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.38, 2.25, 5, 0.1), materials.darkSteel);
  chassis.position.y = 0.82;
  chassis.name = 'truckChassis';
  truck.add(chassis);

  const engineHood = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.95, 2.08, 6, 0.18), paint);
  engineHood.position.set(1.65, 1.35, 0);
  truck.add(engineHood);

  const cab = new THREE.Mesh(createCabGeometry(), paint);
  cab.position.set(0.72, 1.15, 0);
  cab.name = 'truckCab';
  truck.add(cab);
  const windshield = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.68, 0.035, 3, 0.05), materials.glass);
  windshield.position.set(1.07, 2.05, 0);
  windshield.rotation.y = Math.PI / 2;
  windshield.rotation.z = -0.09;
  truck.add(windshield);

  const bed = new THREE.Mesh(createDumpBedGeometry(), paint);
  bed.position.set(-1.2, 1.3, 0);
  bed.name = 'dumpBed';
  truck.add(bed);
  for (let i = -1; i <= 1; i++) {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.12, 1.18, 2.5, 2, 0.025), materials.darkSteel);
    rib.position.set(-1.25 + i * 0.85, 1.83, 0);
    rib.rotation.z = -0.12;
    truck.add(rib);
  }

  const bumper = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.36, 2.35, 3, 0.06), materials.steel);
  bumper.position.set(2.5, 0.8, 0);
  truck.add(bumper);

  [2.53, 2.53].forEach((x, index) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14), materials.lamp);
    lamp.geometry.rotateZ(Math.PI / 2);
    lamp.position.set(x, 1.33, index ? -0.72 : 0.72);
    truck.add(lamp);
  });

  [1.55, -0.75, -1.8].forEach((x, axleIndex) => {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.26, 12), materials.darkSteel);
    axle.geometry.rotateX(Math.PI / 2);
    axle.position.set(x, 0.68, 0);
    axle.name = `truckAxle-${axleIndex}`;
    truck.add(axle);

    [-1, 1].forEach(side => {
      const wheel = createDetailedWheel(materials, 0.62, 0.34);
      wheel.position.set(x, 0.63, side * 1.16);
      wheel.name = `truckWheel-${axleIndex}-${side}`;
      truck.add(wheel);
      truck.userData.wheels.push(wheel);

      const suspension = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.72, 10), materials.steel);
      suspension.position.set(x + (axleIndex === 0 ? -0.2 : 0.18), 1.0, side * 0.83);
      suspension.rotation.z = side * 0.23;
      suspension.name = `suspensionStrut-${axleIndex}-${side}`;
      truck.add(suspension);

      const mudguard = new THREE.Mesh(
        new THREE.TorusGeometry(0.69, 0.055, 7, 24, Math.PI),
        paint,
      );
      mudguard.position.set(x, 0.66, side * 1.18);
      mudguard.rotation.x = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      mudguard.rotation.z = Math.PI / 2;
      mudguard.name = `mudguard-${axleIndex}-${side}`;
      truck.add(mudguard);
    });
  });

  addTruckCabDetails(truck, materials, paint);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.45, 12), materials.darkSteel);
  exhaust.position.set(0.05, 2.25, -0.95);
  truck.add(exhaust);
  return truck;
}

function addTruckCabDetails(truck, materials, paint) {
  const railMaterial = materials.steel;
  const railRuns = [
    [[0.2, 2.58, -1.03], [1.45, 2.58, -1.03]],
    [[0.2, 2.58, 1.03], [1.45, 2.58, 1.03]],
  ];
  railRuns.forEach((points, index) => {
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(...points.map(point => new THREE.Vector3(...point))), 1, 0.035, 8, false),
      railMaterial,
    );
    rail.name = `cabSafetyRail-${index}`;
    truck.add(rail);
  });

  [-1, 1].forEach(side => {
    const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), railMaterial);
    mirrorArm.rotation.z = Math.PI / 2;
    mirrorArm.position.set(1.22, 2.1, side * 1.15);
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.28, 0.2, 2, 0.025), materials.darkSteel);
    mirror.position.set(1.42, 2.1, side * 1.25);
    mirror.name = `sideMirror-${side}`;
    truck.add(mirrorArm, mirror);

    for (let stepIndex = 0; stepIndex < 3; stepIndex++) {
      const step = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.055, 0.22, 2, 0.018), materials.steel);
      step.position.set(1.78 - stepIndex * 0.17, 0.9 + stepIndex * 0.24, side * 1.28);
      step.name = `cabStep-${side}-${stepIndex}`;
      truck.add(step);
    }
  });

  const grille = new THREE.Group();
  grille.position.set(2.44, 1.52, 0);
  for (let i = -4; i <= 4; i++) {
    const slat = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.52, 0.035, 2, 0.01), materials.darkSteel);
    slat.position.z = i * 0.18;
    grille.add(slat);
  }
  grille.name = 'radiatorGrille';
  truck.add(grille);

  const bedInterior = new THREE.Mesh(new RoundedBoxGeometry(3.05, 0.08, 2.05, 3, 0.03), materials.darkSteel);
  bedInterior.position.set(-1.27, 2.31, 0);
  bedInterior.rotation.z = -0.12;
  bedInterior.name = 'dumpBedInterior';
  truck.add(bedInterior);
}

function createCabGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.62, -0.65);
  shape.lineTo(0.64, -0.65);
  shape.lineTo(0.52, 0.63);
  shape.lineTo(-0.42, 0.82);
  shape.lineTo(-0.7, 0.18);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.92, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.07, bevelSegments: 3 });
  geometry.translate(0, 0, -0.96);
  return geometry;
}

function createDumpBedGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.75, -0.55);
  shape.lineTo(1.65, -0.42);
  shape.lineTo(1.35, 0.85);
  shape.lineTo(-1.42, 1.18);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.38, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.08, bevelSegments: 3 });
  geometry.translate(0, 0, -1.19);
  return geometry;
}

function createDetailedWheel(materials, radius, width) {
  const wheel = new THREE.Group();
  wheel.userData.rollAxis = 'z';
  wheel.userData.rollingRadius = radius;
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, radius * 0.28, 14, 28), materials.rubber);
  const rimGeometry = new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, width + 0.02, 20);
  rimGeometry.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeometry, materials.steel);
  const hubGeometry = new THREE.CylinderGeometry(radius * 0.13, radius * 0.13, width + 0.08, 14);
  hubGeometry.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeometry, materials.darkSteel);
  wheel.add(tire, rim, hub);
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.026, radius * 0.026, width + 0.1, 8), materials.darkSteel);
    bolt.geometry.rotateX(Math.PI / 2);
    bolt.position.set(Math.cos(angle) * radius * 0.25, Math.sin(angle) * radius * 0.25, 0);
    wheel.add(bolt);
  }
  for (let i = 0; i < 14; i++) {
    const angle = i / 14 * Math.PI * 2;
    const tread = new THREE.Mesh(new RoundedBoxGeometry(radius * 0.25, radius * 0.07, width + 0.05, 2, 0.018), materials.rubber);
    tread.position.set(Math.cos(angle) * radius * 0.91, Math.sin(angle) * radius * 0.91, 0);
    tread.rotation.z = angle;
    wheel.add(tread);
  }
  return wheel;
}

function createMineTrain(materials) {
  const train = new THREE.Group();
  train.userData.wheels = [];
  const locomotive = new THREE.Group();
  const chassis = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.36, 1.35, 4, 0.08), materials.darkSteel);
  chassis.position.y = 0.44;
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.86, 1.16, 5, 0.12), materials.yellowSteel);
  hood.position.set(0.55, 1.04, 0);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.05, 1.45, 1.18, 5, 0.11), materials.blueSteel);
  cab.position.set(-1.02, 1.27, 0);
  locomotive.add(chassis, hood, cab);
  [-1.1, 0.95].forEach(x => [-0.54, 0.54].forEach(z => {
    const wheel = createDetailedWheel(materials, 0.33, 0.16);
    wheel.position.set(x, 0.31, z);
    locomotive.add(wheel);
    train.userData.wheels.push(wheel);
  }));
  train.add(locomotive);
  for (let cartIndex = 0; cartIndex < 3; cartIndex++) {
    const cart = new THREE.Group();
    cart.position.x = -3.3 - cartIndex * 2.35;
    const body = new THREE.Mesh(createMineCartGeometry(), materials.rust);
    body.position.y = 1.05;
    cart.add(body);
    [-0.72, 0.72].forEach(x => [-0.54, 0.54].forEach(z => {
      const wheel = createDetailedWheel(materials, 0.29, 0.14);
      wheel.position.set(x, 0.3, z);
      cart.add(wheel);
      train.userData.wheels.push(wheel);
    }));
    train.add(cart);
  }
  train.scale.setScalar(0.72);
  return train;
}

function createMineCartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.95, -0.48);
  shape.lineTo(0.95, -0.48);
  shape.lineTo(1.18, 0.55);
  shape.lineTo(-1.18, 0.55);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.06, bevelSegments: 2 });
  geometry.translate(0, 0, -0.6);
  return geometry;
}

function createUndergroundUtilityVehicle(materials) {
  const vehicle = new THREE.Group();
  vehicle.userData.wheels = [];
  const chassis = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.34, 1.45, 4, 0.08), materials.darkSteel);
  chassis.position.y = 0.48;
  const cab = new THREE.Mesh(createCabGeometry(), materials.yellowSteel);
  cab.scale.set(0.72, 0.72, 0.72);
  cab.position.set(0.72, 1.05, 0);
  const tray = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.65, 1.38, 4, 0.08), materials.blueSteel);
  tray.position.set(-0.82, 1.0, 0);
  vehicle.add(chassis, cab, tray);
  [-1.05, 1.05].forEach(x => [-0.67, 0.67].forEach(z => {
    const wheel = createDetailedWheel(materials, 0.34, 0.18);
    wheel.position.set(x, 0.34, z);
    vehicle.add(wheel);
    vehicle.userData.wheels.push(wheel);
  }));
  vehicle.scale.setScalar(0.68);
  return vehicle;
}

function buildMonitorPoints(root, materials, runtime) {
  const group = new THREE.Group();
  group.name = 'roofMonitoringNetwork';
  runtime.monitorMarkers = [];
  runtime.personLocators = [];

  MONITOR_POINTS.forEach((point, index) => {
    const markerRoot = new THREE.Group();
    markerRoot.name = point.id;
    markerRoot.position.fromArray(point.position);
    markerRoot.userData.monitorPoint = point;

    const markerMaterial = materials.locator.clone();
    const marker = new THREE.Mesh(new THREE.SphereGeometry(point.type === 'camera' ? 0.14 : 0.11, 14, 10), markerMaterial);
    marker.name = `${point.id}-signal`;
    markerRoot.add(marker);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), markerMaterial);
    ring.rotation.x = Math.PI / 2;
    markerRoot.add(ring);

    const element = document.createElement('span');
    element.className = `monitor-point-label ${point.type || 'sensor'}`;
    element.textContent = point.id;
    element.title = `${point.id} · ${point.location}`;
    const label = new CSS2DObject(element);
    label.position.set(0, 0.4, 0);
    markerRoot.add(label);

    runtime.monitorMarkers.push({ root: markerRoot, marker, ring, label, point });
    if (point.type === 'person') {
      markerRoot.userData.baseX = point.position[0];
      markerRoot.userData.phase = index * 1.7;
      runtime.personLocators.push(markerRoot);
    }
    group.add(markerRoot);
  });

  root.add(group);
  updateMonitorMarkers(runtime);
}

function updateMonitorMarkers(runtime) {
  const state = getMineState();
  const colors = { safe: 0x17c879, warn: 0xffb12b, danger: 0xff4136 };
  runtime.monitorMarkers.forEach(({ marker, ring, point }) => {
    const level = getMetricLevel(point.metric, state.metrics[point.metric]);
    marker.material.color.setHex(colors[level]);
    marker.material.emissive.setHex(colors[level]);
    ring.material.color.setHex(colors[level]);
    ring.material.emissive.setHex(colors[level]);
  });
}

function registerEquipment(object, id) {
  const equipment = EQUIPMENT.find(item => item.id === id);
  if (!equipment) throw new Error(`Unknown equipment id: ${id}`);
  object.userData.equipmentId = id;
  object.userData.equipmentStatus = equipment.status;
  object.userData.equipmentName = equipment.name;
  return object;
}

function validateEquipmentBindings(root) {
  const bindings = new Map();
  root.traverse(object => {
    const id = object.userData?.equipmentId;
    if (!id) return;
    if (!bindings.has(id)) bindings.set(id, []);
    bindings.get(id).push(object.name);
  });
  const missing = EQUIPMENT.filter(item => !bindings.has(item.id));
  const duplicates = [...bindings.entries()].filter(([, names]) => names.length !== 1);
  if (missing.length || duplicates.length) {
    console.warn('设备台账与三维实体绑定不一致', { missing, duplicates });
  } else {
    console.info(`设备台账校验通过：${bindings.size} 套设备均有唯一三维实体`);
  }
}

function buildOperationalLabels(root, runtime) {
  const labels = [
    ['露天采场', -15, 15, -8, 'surface'],
    ['洗选厂', 18, 22, -8, 'surface'],
    ['主运输斜井', -19, 8, -1, 'underground'],
    ['轨道运输巷', 8, -1, 3, 'underground'],
    ['回风巷', 18, -1, -1, 'underground'],
    ['中央变电所', 14, -10, -9, 'underground'],
    ['水泵房', -13, -10, -9, 'underground'],
    ['3# 煤层 - 1206 工作面', 5, -18.5, -13, 'working-face'],
  ];
  labels.forEach(([text, x, y, z, category]) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `mine-scene-label ${category}`;
    element.textContent = text;
    element.dataset.sceneTarget = category;
    const label = new CSS2DObject(element);
    label.position.set(x, y, z);
    label.name = `label-${category}`;
    root.add(label);
    runtime.labels.push(label);
  });
}

function createAnimator(runtime) {
  return (delta, elapsed) => {
    runtime.rotatingParts.forEach(part => { part.object.rotation[part.axis] += delta * part.speed; });
    runtime.conveyorItems.forEach(item => {
      const motion = item.userData.motion;
      item.position[motion.axis] += delta * motion.speed;
      if (item.position[motion.axis] > motion.max) item.position[motion.axis] = motion.min;
    });
    runtime.routeVehicles.forEach(vehicle => updateRouteVehicle(vehicle, delta));
    runtime.oscillators.forEach(item => {
      if (item.object.material?.emissiveIntensity !== undefined) item.object.material.emissiveIntensity = item.base + Math.sin(elapsed * 1.9 + item.phase) * item.amplitude;
    });
    runtime.personLocators?.forEach(marker => {
      marker.position.x = marker.userData.baseX + Math.sin(elapsed * 0.28 + marker.userData.phase) * 1.5;
    });
    if (runtime.workingFaceShearer) runtime.workingFaceShearer.position.x = Math.sin(elapsed * 0.22) * 4.8;
    if (runtime.monitorMarkers && elapsed - (runtime.lastMonitorUpdate || 0) > 0.5) {
      updateMonitorMarkers(runtime);
      runtime.lastMonitorUpdate = elapsed;
    }
  };
}

function updateRouteVehicle(vehicle, delta) {
  const routeLength = vehicle.routeLength ??= vehicle.curve.getLength();
  const previous = vehicle.progress;
  const requestedStep = (vehicle.distancePerSecond / routeLength) * vehicle.direction * delta;
  let next = previous + requestedStep;
  let signedProgress = requestedStep;

  if (vehicle.pingPong) {
    if (next > 1) {
      next = 2 - next;
      signedProgress = next - previous;
      vehicle.direction = -1;
    } else if (next < 0) {
      next = -next;
      signedProgress = next - previous;
      vehicle.direction = 1;
    }
  } else {
    next = THREE.MathUtils.euclideanModulo(next, 1);
  }
  vehicle.progress = THREE.MathUtils.clamp(next, 0, 1);

  const point = vehicle.curve.getPointAt(vehicle.progress);
  const tangent = vehicle.curve.getTangentAt(vehicle.progress).normalize();
  vehicle.object.position.copy(point);
  vehicle.object.rotation.y = Math.atan2(-tangent.z, tangent.x);

  const signedDistance = signedProgress * routeLength;
  const worldRadius = vehicle.wheelRadius * Math.abs(vehicle.object.scale.x || 1);
  const wheelAngle = -signedDistance / worldRadius;
  vehicle.wheels.forEach(wheel => {
    wheel.rotation[wheel.userData.rollAxis || 'z'] += wheelAngle;
  });
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
