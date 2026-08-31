import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { preparePbrMesh } from './materials.js';

const FLOOR_Y = -10.7;

export function buildPhotorealMine(sourceMaterials) {
  const root = new THREE.Group();
  root.name = 'photorealUndergroundMine';

  const materials = createMaterialLibrary(sourceMaterials);
  const runtime = {
    shearer: null,
    locomotive: null,
    conveyorBelts: [],
    conveyorItems: [],
    rotatingParts: [],
    workers: [],
    lamps: [],
    dust: null,
    update: () => {},
  };

  buildRoadwayNetwork(root, materials, runtime);
  buildWorkingFace(root, materials, runtime);
  buildTransportSystem(root, materials, runtime);
  buildUtilities(root, materials, runtime);
  buildAtmosphere(root, runtime);

  root.traverse(object => preparePbrMesh(object));
  runtime.update = createAnimator(runtime);
  root.userData.runtime = runtime;
  return { root, runtime };
}

function createMaterialLibrary(source) {
  const clone = (material, options = {}) => {
    const next = material.clone();
    Object.assign(next, options);
    return next;
  };

  return {
    rock: clone(source.roadwayRock, { side: THREE.DoubleSide, roughness: 0.98 }),
    floor: clone(source.roadwayFloor, { side: THREE.DoubleSide, roughness: 1 }),
    coal: clone(source.coalRock, {
      color: new THREE.Color(0x3d4140),
      side: THREE.DoubleSide,
      roughness: 0.78,
      metalness: 0.16,
      emissive: new THREE.Color(0x030303),
      emissiveIntensity: 0.25,
    }),
    steel: clone(source.wornMetal, { color: new THREE.Color(0x7b8585), roughness: 0.62, metalness: 0.82 }),
    darkSteel: clone(source.wornMetal, { color: new THREE.Color(0x343b3c), roughness: 0.68, metalness: 0.8 }),
    blueSteel: clone(source.paintedMetal, { color: new THREE.Color(0x2c6271), roughness: 0.58, metalness: 0.7 }),
    rust: clone(source.coarseRust, { roughness: 0.83, metalness: 0.62 }),
    yellow: clone(source.wornMetal, { color: new THREE.Color(0xd19118), roughness: 0.56, metalness: 0.7 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 0.92, metalness: 0.03 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x171b1b, roughness: 0.74, metalness: 0.05 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x151716, roughness: 0.86, metalness: 0.04 }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0xffd58d,
      emissive: 0xff9f32,
      emissiveIntensity: 7,
      roughness: 0.28,
    }),
    redLamp: new THREE.MeshStandardMaterial({ color: 0x4a0906, emissive: 0xff240e, emissiveIntensity: 6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9eb8bd, roughness: 0.16, metalness: 0, transmission: 0.26, transparent: true, opacity: 0.68 }),
    reflective: new THREE.MeshStandardMaterial({ color: 0xe3d34a, emissive: 0xc79913, emissiveIntensity: 0.45, roughness: 0.5 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x8c5f42, roughness: 0.92 }),
    workwear: new THREE.MeshStandardMaterial({ color: 0x26363e, roughness: 0.84 }),
  };
}

function buildRoadwayNetwork(root, materials, runtime) {
  const roadway = new THREE.Group();
  roadway.name = 'dualRoadwayNetwork';
  root.add(roadway);

  const tunnels = [
    { name: 'mainTransportRoadway', position: [4.5, FLOOR_Y, -6], length: 30, width: 4.6, height: 4.2, ribs: true, openSide: 'right', openingCenters: [-8.5, 17.4] },
    { name: 'returnAirRoadway', position: [4.5, FLOOR_Y, 3], length: 30, width: 4.2, height: 3.9, ribs: true, openSide: 'left', openingCenters: [-8.5, 17.4] },
    { name: 'westCrosscut', position: [-8.5, FLOOR_Y, -1.5], length: 9, width: 3.8, height: 3.7, rotation: Math.PI / 2, openEndDepth: 2.15 },
    { name: 'eastCrosscut', position: [17.4, FLOOR_Y, -1.5], length: 9, width: 4, height: 3.9, rotation: Math.PI / 2, openEndDepth: 2.15 },
  ];

  tunnels.forEach(config => {
    const tunnel = createTunnel(config, materials);
    roadway.add(tunnel);
    if (config.ribs) addSteelRibs(tunnel, config, materials);
    addRoadwayLights(tunnel, config, materials, runtime);
  });

  addRoofBolting(roadway, materials, -6, -9.2, 18.1, 4.05);
  addRoofBolting(roadway, materials, 3, -9.2, 18.1, 3.75);

  addRockScatter(roadway, materials, 110, [-10, 19], [FLOOR_Y + 0.02, FLOOR_Y + 0.16], [-7.8, 5]);
}

function addRoofBolting(parent, materials, zCenter, startX, endX, roofHeight) {
  for (let x = startX; x <= endX; x += 1.45) {
    [-1.25, 0, 1.25].forEach((zOffset, index) => {
      const bolt = new THREE.Group();
      bolt.position.set(x, FLOOR_Y + roofHeight - (index === 1 ? 0.08 : 0.35), zCenter + zOffset);
      bolt.rotation.z = (index - 1) * 0.2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 7), materials.darkSteel);
      rod.position.y = 0.28;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 4), materials.rust);
      plate.rotation.y = Math.PI / 4;
      bolt.name = 'roofBolt';
      bolt.add(rod, plate);
      parent.add(bolt);
    });
  }
}

function createTunnel(config, materials) {
  const group = new THREE.Group();
  group.name = config.name;
  group.position.fromArray(config.position);
  group.rotation.y = config.rotation || 0;

  const wallHeight = config.height - config.width * 0.5;
  const radius = config.width * 0.5;
  const profile = [new THREE.Vector2(-radius, 0), new THREE.Vector2(-radius, wallHeight)];
  for (let i = 0; i <= 14; i++) {
    const angle = Math.PI - (i / 14) * Math.PI;
    profile.push(new THREE.Vector2(Math.cos(angle) * radius, wallHeight + Math.sin(angle) * radius));
  }
  profile.push(new THREE.Vector2(radius, 0));

  const shell = new THREE.Mesh(createLongitudinalShell(config.length, profile, config), materials.rock);
  shell.name = `${config.name}RockLining`;
  shell.receiveShadow = true;
  group.add(shell);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(config.length, config.width, 24, 4), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.name = `${config.name}Floor`;
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}

function createLongitudinalShell(length, profile, options = {}) {
  const xSegments = Math.max(18, Math.round(length * 1.2));
  const vertices = [];
  const uvs = [];
  const indices = [];
  let perimeter = 0;
  const distances = [0];
  for (let p = 1; p < profile.length; p++) {
    perimeter += profile[p].distanceTo(profile[p - 1]);
    distances.push(perimeter);
  }

  for (let xIndex = 0; xIndex <= xSegments; xIndex++) {
    const xRatio = xIndex / xSegments;
    const x = (xRatio - 0.5) * length;
    for (let p = 0; p < profile.length; p++) {
      const edgeNoise = Math.sin(x * 1.73 + p * 2.11) * 0.035 + Math.sin(x * 4.2 - p) * 0.015;
      vertices.push(x, profile[p].y + edgeNoise, profile[p].x);
      uvs.push(xRatio * length / 3, distances[p] / perimeter * 4);
    }
  }

  const row = profile.length;
  for (let xIndex = 0; xIndex < xSegments; xIndex++) {
    const xCenter = ((xIndex + 0.5) / xSegments - 0.5) * length;
    const atOpenEnd = options.openEndDepth && Math.abs(xCenter) > length * 0.5 - options.openEndDepth;
    for (let p = 0; p < row - 1; p++) {
      const isLeftWall = p === 0;
      const isRightWall = p === row - 2;
      const atSideOpening = options.openingCenters?.some(center => Math.abs(xCenter - center + (options.position?.[0] || 0)) < 2.05);
      const opensThisWall = (options.openSide === 'left' && isLeftWall) || (options.openSide === 'right' && isRightWall);
      if (atOpenEnd || (atSideOpening && opensThisWall)) continue;
      const a = xIndex * row + p;
      const b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addSteelRibs(tunnel, config, materials) {
  const wallHeight = config.height - config.width * 0.5;
  const radius = config.width * 0.5;
  const points = [new THREE.Vector3(0, 0.04, -radius + 0.08), new THREE.Vector3(0, wallHeight, -radius + 0.08)];
  for (let i = 0; i <= 14; i++) {
    const angle = Math.PI - i / 14 * Math.PI;
    points.push(new THREE.Vector3(0, wallHeight + Math.sin(angle) * radius - 0.1, Math.cos(angle) * radius * 0.97));
  }
  points.push(new THREE.Vector3(0, 0.04, radius - 0.08));
  const ribGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.065, 7, false);

  for (let x = -config.length / 2 + 0.8; x < config.length / 2; x += 1.65) {
    const rib = new THREE.Mesh(ribGeometry, materials.rust);
    rib.position.x = x;
    rib.name = 'steelRib';
    tunnel.add(rib);
  }
}

function addRoadwayLights(tunnel, config, materials, runtime) {
  for (let x = -config.length / 2 + 1.6; x < config.length / 2; x += 4.2) {
    const fixture = new THREE.Group();
    fixture.name = 'mineLampFixture';
    fixture.position.set(x, config.height - 0.38, -config.width * 0.22);

    const cage = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.13, 0.2, 3, 0.04), materials.darkSteel);
    const tube = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.07, 0.1, 2, 0.025), materials.lamp);
    tube.position.y = -0.07;
    fixture.add(cage, tube);

    const light = new THREE.PointLight(0xffa544, 15, 8.5, 2);
    light.position.y = -0.25;
    light.name = 'underLight';
    light.castShadow = runtime.lamps.length < 3;
    light.shadow.mapSize.set(512, 512);
    fixture.add(light);
    tunnel.add(fixture);
    runtime.lamps.push(tube);
  }
}

function buildWorkingFace(root, materials, runtime) {
  const face = new THREE.Group();
  face.name = 'workingFace1206';
  root.add(face);

  const coalWall = createCoalFace(materials.coal);
  coalWall.position.set(20.2, FLOOR_Y, -1.5);
  coalWall.name = 'coalWall';
  face.add(coalWall);

  for (let z = -6.15; z <= 3.15; z += 0.82) {
    const support = createHydraulicSupport(materials);
    support.position.set(17.2, FLOOR_Y + 0.06, z);
    support.name = 'support';
    support.userData.partId = `ZY12000-${Math.round((z + 6.15) / 0.82 + 1).toString().padStart(2, '0')}`;
    face.add(support);
  }

  const afc = createScraperConveyor(10.4, materials, runtime);
  afc.position.set(18.65, FLOOR_Y + 0.18, -1.5);
  afc.rotation.y = Math.PI / 2;
  face.add(afc);

  const shearer = createShearer(materials, runtime);
  shearer.position.set(19.05, FLOOR_Y + 0.7, -1.5);
  face.add(shearer);
  runtime.shearer = shearer;

  addGoaf(face, materials);
  addFaceSign(face, materials);
}

function createCoalFace(material) {
  const rows = 12;
  const columns = 30;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const z = -5.3 + column / columns * 10.6;
      const y = row / rows * 4.05;
      const x = Math.sin(z * 2.6 + row) * 0.06 + Math.sin(y * 4.1 - column) * 0.035;
      vertices.push(x, y, z);
      uvs.push(column / columns * 5, row / rows * 2.2);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
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

function createHydraulicSupport(materials) {
  const support = new THREE.Group();
  support.userData.explodable = true;

  const base = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.28, 0.68, 4, 0.08), materials.blueSteel);
  base.position.set(-0.1, 0.18, 0);
  base.name = 'supportBase';
  support.add(base);

  const canopy = new THREE.Mesh(createTaperedBeamGeometry(2.65, 0.72, 0.24), materials.blueSteel);
  canopy.position.set(0.18, 3.38, 0);
  canopy.rotation.z = -0.055;
  canopy.name = 'supportCanopy';
  support.add(canopy);

  [-0.26, 0.26].forEach(z => {
    const ram = createHydraulicRam(2.55, materials);
    ram.position.set(-0.42, 0.42, z);
    ram.rotation.z = -0.075;
    ram.name = 'hydraulicLeg';
    support.add(ram);
  });

  const shield = new THREE.Mesh(createShieldGeometry(), materials.blueSteel);
  shield.position.set(-0.98, 1.85, 0);
  shield.name = 'rearShield';
  support.add(shield);

  const linkage = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.55, 10), materials.steel);
  linkage.position.set(-0.45, 1.12, 0.29);
  linkage.rotation.z = -0.72;
  linkage.name = 'fourBarLinkage';
  support.add(linkage, linkage.clone());
  support.children.at(-1).position.z = -0.29;

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 0.6, 0.36),
    new THREE.Vector3(-0.15, 1.2, 0.42),
    new THREE.Vector3(-0.35, 2.2, 0.4),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 18, 0.026, 6), materials.cable);
  hose.name = 'hydraulicHose';
  support.add(hose);

  return support;
}

function createHydraulicRam(height, materials) {
  const group = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.15, height * 0.62, 14), materials.darkSteel);
  barrel.position.y = height * 0.31;
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, height * 0.52, 14), materials.steel);
  piston.position.y = height * 0.73;
  const collars = [0.08, height * 0.6].map(y => {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 14), materials.rust);
    collar.position.y = y;
    return collar;
  });
  group.add(barrel, piston, ...collars);
  return group;
}

function createTaperedBeamGeometry(length, width, height) {
  const shape = new THREE.Shape();
  shape.moveTo(-length * 0.5, -height * 0.5);
  shape.lineTo(length * 0.48, -height * 0.42);
  shape.lineTo(length * 0.5, height * 0.38);
  shape.lineTo(-length * 0.42, height * 0.5);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2 });
  geometry.translate(0, 0, -width * 0.5);
  return geometry;
}

function createShieldGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, -0.82);
  shape.lineTo(0.28, -0.63);
  shape.lineTo(0.42, 0.72);
  shape.lineTo(-0.08, 0.88);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.68, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.04, bevelSegments: 2 });
  geometry.translate(0, 0, -0.34);
  return geometry;
}

function createShearer(materials, runtime) {
  const shearer = new THREE.Group();
  shearer.name = 'shearer';
  shearer.userData.explodable = true;

  const body = new THREE.Mesh(new RoundedBoxGeometry(2.9, 1.05, 1.08, 6, 0.16), materials.yellow);
  body.name = 'shearerMainBody';
  shearer.add(body);

  const topHousing = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.52, 0.84, 5, 0.12), materials.darkSteel);
  topHousing.position.set(-0.2, 0.69, 0);
  topHousing.name = 'electricalHousing';
  shearer.add(topHousing);

  [-1, 1].forEach((side, index) => {
    const arm = new THREE.Group();
    arm.position.set(side * 1.33, 0.26, side * 0.28);
    arm.rotation.z = side * -0.35;
    arm.name = index ? 'rightRangingArm' : 'leftRangingArm';

    const armMesh = new THREE.Mesh(createTaperedBeamGeometry(1.72, 0.45, 0.48), materials.yellow);
    armMesh.position.x = side * 0.6;
    if (side < 0) armMesh.rotation.y = Math.PI;
    arm.add(armMesh);

    const drum = createCuttingDrum(materials);
    drum.position.set(side * 1.45, side * 0.22, 0);
    drum.rotation.z = Math.PI / 2;
    drum.name = 'drum';
    arm.add(drum);
    runtime.rotatingParts.push({ object: drum, axis: 'y', speed: side * 4.8 });
    shearer.add(arm);
  });

  for (let x = -1.05; x <= 1.05; x += 0.7) {
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.18, 1.22, 3, 0.045), materials.darkSteel);
    shoe.position.set(x, -0.61, 0);
    shoe.name = 'haulageShoe';
    shearer.add(shoe);
  }

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 12), materials.redLamp);
  beacon.position.set(0.58, 1.03, 0.25);
  beacon.name = 'warningBeacon';
  shearer.add(beacon);
  runtime.lamps.push(beacon);
  return shearer;
}

function createCuttingDrum(materials) {
  const group = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.58, 20), materials.rust);
  group.add(hub);
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2 + ring * 0.34;
      const pick = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 6), materials.steel);
      pick.position.set(Math.cos(angle) * (0.5 + ring * 0.055), (ring - 1) * 0.2, Math.sin(angle) * (0.5 + ring * 0.055));
      pick.rotation.z = -angle;
      pick.rotation.x = Math.PI / 2;
      pick.name = 'cuttingPick';
      group.add(pick);
    }
  }
  return group;
}

function createScraperConveyor(length, materials, runtime) {
  const group = new THREE.Group();
  group.name = 'armouredFaceConveyor';
  const panCount = 20;
  for (let i = 0; i < panCount; i++) {
    const z = (i / (panCount - 1) - 0.5) * length;
    const pan = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.18, length / panCount * 0.93, 2, 0.035), materials.darkSteel);
    pan.position.z = z;
    pan.name = 'scraperPan';
    group.add(pan);
    const flight = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.09, 0.055, 2, 0.018), materials.steel);
    flight.position.set(0, 0.13, z);
    flight.name = 'scraperFlight';
    flight.userData.conveyor = { axis: 'z', min: -length * 0.5, max: length * 0.5, speed: 0.58 };
    group.add(flight);
    runtime.conveyorItems.push(flight);
  }
  runtime.conveyorBelts.push({ object: group, speed: 0.32 });
  return group;
}

function addGoaf(parent, materials) {
  const group = new THREE.Group();
  group.name = 'goaf';
  const random = seededRandom(1206);
  for (let i = 0; i < 95; i++) {
    const size = 0.16 + random() * 0.58;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, random() > 0.7 ? 1 : 0), materials.rock);
    rock.position.set(15.4 + random() * 1.25, FLOOR_Y + size * 0.5 + random() * 1.2, -6.2 + random() * 9.6);
    rock.scale.set(0.7 + random(), 0.45 + random() * 0.8, 0.7 + random());
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.name = 'goafRock';
    group.add(rock);
  }
  parent.add(group);
}

function addFaceSign(parent, materials) {
  const sign = new THREE.Group();
  sign.position.set(16.9, FLOOR_Y + 2.35, -5.52);
  sign.rotation.y = Math.PI / 2;
  const board = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.48, 0.055, 3, 0.035), materials.blueSteel);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#164653';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#d2e8e5';
  context.lineWidth = 8;
  context.strokeRect(8, 8, 496, 144);
  context.font = '700 62px Microsoft YaHei, sans-serif';
  context.fillStyle = '#f0f4ed';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('1206 综采工作面', 256, 82);
  const labelMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), toneMapped: false });
  labelMaterial.map.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.4), labelMaterial);
  label.position.z = 0.031;
  sign.add(board, label);
  parent.add(sign);
}

function buildTransportSystem(root, materials, runtime) {
  const transport = new THREE.Group();
  transport.name = 'transportSystem';
  root.add(transport);

  createRailLine(transport, materials, -6);
  const train = createMineTrain(materials, runtime);
  train.position.set(-1.2, FLOOR_Y + 0.19, -6);
  transport.add(train);
  runtime.locomotive = train;

  const belt = createBeltConveyor(25, materials, runtime);
  belt.position.set(3.5, FLOOR_Y + 0.43, 3.1);
  transport.add(belt);
}

function createRailLine(parent, materials, z) {
  const railGeometry = new THREE.BoxGeometry(28, 0.09, 0.07);
  [-0.58, 0.58].forEach(offset => {
    const rail = new THREE.Mesh(railGeometry, materials.steel);
    rail.position.set(3.5, FLOOR_Y + 0.12, z + offset);
    rail.name = 'rail';
    parent.add(rail);
  });
  for (let x = -10.2; x < 17.6; x += 0.62) {
    const sleeper = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.12, 1.65, 2, 0.025), materials.rust);
    sleeper.position.set(x, FLOOR_Y + 0.06, z);
    sleeper.name = 'sleeper';
    parent.add(sleeper);
  }
}

function createMineTrain(materials, runtime) {
  const train = new THREE.Group();
  train.name = 'mineTrain';
  const locomotive = createLocomotive(materials, runtime);
  train.add(locomotive);
  for (let i = 0; i < 3; i++) {
    const cart = createMineCart(materials, runtime);
    cart.position.x = -2.15 - i * 1.9;
    train.add(cart);
  }
  return train;
}

function createLocomotive(materials, runtime) {
  const group = new THREE.Group();
  group.name = 'electricLocomotive';
  const chassis = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.34, 1.22, 4, 0.08), materials.darkSteel);
  chassis.position.y = 0.42;
  group.add(chassis);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.88, 1.05, 6, 0.14), materials.yellow);
  hood.position.set(0.4, 0.98, 0);
  group.add(hood);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(0.78, 1.32, 1.08, 5, 0.1), materials.blueSteel);
  cab.position.set(-0.7, 1.16, 0);
  group.add(cab);
  [-1, 1].forEach(z => {
    const window = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.43, 0.025, 3, 0.04), materials.glass);
    window.position.set(-0.7, 1.42, z * 0.555);
    group.add(window);
  });
  [-0.72, 0.72].forEach(x => [-0.47, 0.47].forEach(z => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 18), materials.darkSteel);
    wheel.position.set(x, 0.3, z);
    wheel.rotation.x = Math.PI / 2;
    wheel.name = 'trainWheel';
    group.add(wheel);
    runtime.rotatingParts.push({ object: wheel, axis: 'z', speed: 2.5 });
  }));
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), materials.lamp);
  headlamp.rotation.z = Math.PI / 2;
  headlamp.position.set(1.12, 1.08, 0);
  group.add(headlamp);
  const beam = new THREE.SpotLight(0xffd79b, 45, 15, Math.PI / 7, 0.7, 1.8);
  beam.position.set(1.18, 1.08, 0);
  beam.target.position.set(7, 0.65, 0);
  beam.name = 'underLight';
  group.add(beam, beam.target);
  return group;
}

function createMineCart(materials, runtime) {
  const cart = new THREE.Group();
  cart.name = 'mineCart';
  const shape = new THREE.Shape();
  shape.moveTo(-0.78, -0.46);
  shape.lineTo(0.78, -0.46);
  shape.lineTo(0.98, 0.42);
  shape.lineTo(-0.98, 0.42);
  shape.closePath();
  const tub = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.05, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }), materials.rust);
  tub.geometry.translate(0, 0, -0.525);
  tub.position.y = 0.98;
  cart.add(tub);
  [-0.57, 0.57].forEach(x => [-0.47, 0.47].forEach(z => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), materials.darkSteel);
    wheel.position.set(x, 0.29, z);
    wheel.rotation.x = Math.PI / 2;
    wheel.name = 'trainWheel';
    cart.add(wheel);
    runtime.rotatingParts.push({ object: wheel, axis: 'z', speed: 2.5 });
  }));
  return cart;
}

function createBeltConveyor(length, materials, runtime) {
  const conveyor = new THREE.Group();
  conveyor.name = 'beltConveyor';
  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 1.2), materials.belt);
  belt.position.y = 0.45;
  belt.name = 'movingBelt';
  conveyor.add(belt);
  for (let x = -length / 2; x <= length / 2; x += 1.2) {
    const frame = new THREE.Group();
    frame.position.x = x;
    [-0.67, 0.67].forEach(z => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.52, 7), materials.rust);
      leg.position.set(0, 0.2, z);
      frame.add(leg);
    });
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.35, 10), materials.steel);
    roller.rotation.x = Math.PI / 2;
    roller.position.y = 0.46;
    roller.name = 'beltRoller';
    frame.add(roller);
    runtime.rotatingParts.push({ object: roller, axis: 'z', speed: 4.5 });
    conveyor.add(frame);
  }
  for (let i = 0; i < 45; i++) {
    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + (i % 4) * 0.018, 0), materials.coal);
    coal.position.set(-length / 2 + i / 45 * length, 0.56, (i % 5 - 2) * 0.18);
    coal.name = 'beltCoal';
    coal.userData.conveyor = { axis: 'x', min: -length * 0.5, max: length * 0.5, speed: 0.72 };
    conveyor.add(coal);
    runtime.conveyorItems.push(coal);
  }
  runtime.conveyorBelts.push({ object: conveyor, speed: 0.55, length });
  return conveyor;
}

function buildUtilities(root, materials, runtime) {
  const utilities = new THREE.Group();
  utilities.name = 'roadwayUtilities';
  root.add(utilities);

  const ductCurve = new THREE.LineCurve3(new THREE.Vector3(-9.5, FLOOR_Y + 3.15, 4.45), new THREE.Vector3(16.8, FLOOR_Y + 3.15, 4.45));
  const duct = new THREE.Mesh(new THREE.TubeGeometry(ductCurve, 70, 0.46, 20, false), materials.yellow);
  duct.name = 'ventilationDuct';
  utilities.add(duct);
  for (let x = -9; x < 17; x += 1.15) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.026, 8, 20), materials.darkSteel);
    hoop.position.set(x, FLOOR_Y + 3.15, 4.45);
    hoop.rotation.y = Math.PI / 2;
    utilities.add(hoop);
  }

  addPipeRun(utilities, materials, -9.5, 17, FLOOR_Y + 1.15, -8.05, 0.095, materials.blueSteel);
  addPipeRun(utilities, materials, -9.5, 17, FLOOR_Y + 1.48, -8.05, 0.07, materials.rust);
  addCableBundles(utilities, materials);

  const worker = createWorker(materials);
  worker.position.set(7.5, FLOOR_Y + 0.03, -4.65);
  utilities.add(worker);
  runtime.workers.push(worker);

  const camera = createCctv(materials);
  camera.position.set(13, FLOOR_Y + 3.05, -7.9);
  utilities.add(camera);
}

function addPipeRun(parent, materials, start, end, y, z, radius, material) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(start, y, z), new THREE.Vector3(end, y, z));
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 10, false), material);
  pipe.name = 'utilityPipe';
  parent.add(pipe);
  for (let x = start + 1; x < end; x += 2.4) {
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.025, 0.018, 6, 12), materials.steel);
    clamp.position.set(x, y, z);
    clamp.rotation.y = Math.PI / 2;
    parent.add(clamp);
  }
}

function addCableBundles(parent, materials) {
  [-7.82, -7.68, -7.54].forEach((z, index) => {
    const points = [];
    for (let x = -9; x <= 17; x += 2) points.push(new THREE.Vector3(x, FLOOR_Y + 2.25 + Math.sin(x * 0.7 + index) * 0.05, z));
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.022, 6), materials.cable);
    cable.name = 'powerCable';
    parent.add(cable);
  });
}

function createWorker(materials) {
  const worker = new THREE.Group();
  worker.name = 'inspectionWorker';
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.66, 7, 12), materials.workwear);
  torso.position.y = 1.05;
  worker.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), materials.skin);
  head.position.y = 1.65;
  worker.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.yellow);
  helmet.position.y = 1.72;
  worker.add(helmet);
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), materials.lamp);
  headlamp.rotation.x = Math.PI / 2;
  headlamp.position.set(0, 1.75, 0.19);
  worker.add(headlamp);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.58, 5, 8), materials.workwear);
    leg.position.set(side * 0.12, 0.38, 0);
    leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
    worker.add(leg);
    const strip = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 14), materials.reflective);
    strip.position.set(side * 0.12, 0.55, 0);
    strip.rotation.x = Math.PI / 2;
    worker.add(strip);
  });
  return worker;
}

function createCctv(materials) {
  const group = new THREE.Group();
  group.name = 'cctvCamera';
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), materials.rust);
  bracket.rotation.z = Math.PI / 2;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.22, 0.24, 4, 0.055), materials.darkSteel);
  body.position.x = 0.34;
  body.rotation.z = -0.22;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.045, 16), materials.glass);
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.58, -0.055, 0);
  group.add(bracket, body, lens);
  return group;
}

function buildAtmosphere(root, runtime) {
  const random = seededRandom(77);
  const count = 720;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -10 + random() * 30;
    positions[i * 3 + 1] = FLOOR_Y + 0.15 + random() * 3.7;
    positions[i * 3 + 2] = -8 + random() * 13;
    phases[i] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xc4ad86, size: 0.035, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(geometry, material);
  dust.name = 'dust';
  dust.userData.phases = phases;
  root.add(dust);
  runtime.dust = dust;
}

function addRockScatter(parent, materials, count, xRange, yRange, zRange) {
  const random = seededRandom(312);
  const geometry = new THREE.DodecahedronGeometry(0.12, 0);
  for (let i = 0; i < count; i++) {
    const rock = new THREE.Mesh(geometry, i % 5 === 0 ? materials.coal : materials.rock);
    rock.position.set(THREE.MathUtils.lerp(xRange[0], xRange[1], random()), THREE.MathUtils.lerp(yRange[0], yRange[1], random()), THREE.MathUtils.lerp(zRange[0], zRange[1], random()));
    rock.scale.set(0.45 + random() * 1.6, 0.35 + random(), 0.45 + random() * 1.4);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.name = 'roadwayRock';
    parent.add(rock);
  }
}

function createAnimator(runtime) {
  const dustPositions = runtime.dust.geometry.attributes.position;
  return (delta, elapsed) => {
    runtime.rotatingParts.forEach(part => { part.object.rotation[part.axis] += delta * part.speed; });
    runtime.conveyorItems.forEach(item => {
      const motion = item.userData.conveyor;
      item.position[motion.axis] += delta * motion.speed;
      if (item.position[motion.axis] > motion.max) item.position[motion.axis] = motion.min;
    });
    if (runtime.shearer) {
      runtime.shearer.position.z = -1.5 + Math.sin(elapsed * 0.21) * 3.35;
      runtime.shearer.rotation.y = Math.sin(elapsed * 0.21) >= 0 ? 0 : Math.PI;
    }
    if (runtime.locomotive) runtime.locomotive.position.x = -1.5 + Math.sin(elapsed * 0.12) * 6.1;
    runtime.workers.forEach((worker, index) => {
      worker.position.x = 6.5 + Math.sin(elapsed * 0.28 + index) * 2.2;
      const left = worker.getObjectByName('leftLeg');
      const right = worker.getObjectByName('rightLeg');
      if (left && right) {
        left.rotation.x = Math.sin(elapsed * 2.4) * 0.35;
        right.rotation.x = -left.rotation.x;
      }
    });
    runtime.lamps.forEach((lamp, index) => { lamp.material.emissiveIntensity = 5.7 + Math.sin(elapsed * 2.1 + index) * 0.22; });
    for (let i = 0; i < dustPositions.count; i++) {
      dustPositions.array[i * 3] += Math.sin(elapsed * 0.19 + runtime.dust.userData.phases[i]) * delta * 0.017;
      dustPositions.array[i * 3 + 1] += delta * (0.012 + (i % 7) * 0.001);
      if (dustPositions.array[i * 3 + 1] > FLOOR_Y + 4) dustPositions.array[i * 3 + 1] = FLOOR_Y + 0.1;
    }
    dustPositions.needsUpdate = true;
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
