import * as THREE from 'three';
import { ROADWAY_NODES, SURFACE_ROUTES } from './topology.mjs';
import { getPitHaulPathPoint } from './terrain-profile.mjs';

const FORWARD = new THREE.Vector3(0, 0, 1);

function addRoadSegment(group, start, end, width, materials, name) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const roadMaterial = materials.road.clone();
  roadMaterial.color.setHex(0x292d2c);
  roadMaterial.roughness = 0.94;
  const shoulderMaterial = materials.darkRock.clone();
  shoulderMaterial.color.setHex(0x35332d);
  shoulderMaterial.roughness = 1;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(width + 1.8, 0.18, length + 0.7), shoulderMaterial);
  shoulder.position.copy(start).add(end).multiplyScalar(0.5);
  shoulder.position.y -= 0.11;
  shoulder.quaternion.setFromUnitVectors(FORWARD, direction.clone().normalize());
  shoulder.name = `${name}-shoulder`;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, length + 0.35), roadMaterial);
  road.position.copy(start).add(end).multiplyScalar(0.5);
  road.quaternion.setFromUnitVectors(FORWARD, direction.normalize());
  road.name = name;
  road.receiveShadow = true;
  group.add(road);
}

function resolveRoute(route, getGroundHeight) {
  const controls = route.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const offset = route.points[0][2];
  const planCurve = new THREE.CatmullRomCurve3(controls, false, 'centripetal');
  const divisions = Math.max(12, Math.ceil(planCurve.getLength() / 7));
  return planCurve.getPoints(divisions).map(point => new THREE.Vector3(
    point.x,
    getGroundHeight(point.x, point.z) + offset,
    point.z,
  ));
}

function buildRoads(group, materials, getGroundHeight) {
  const curves = new Map();
  for (const route of SURFACE_ROUTES) {
    const resolved = resolveRoute(route, getGroundHeight);
    for (let index = 0; index < resolved.length - 1; index += 1) {
      addRoadSegment(group, resolved[index], resolved[index + 1], route.width, materials, `${route.id}-road`);
    }
    curves.set(route.id, new THREE.CatmullRomCurve3(resolved, false, 'centripetal'));
  }
  return curves;
}

function buildPitHaulRoads(group, materials, getGroundHeight, curves) {
  const resolved = [];
  for (let index = 0; index <= 112; index += 1) {
    const [x, y, z] = getPitHaulPathPoint(index / 112);
    resolved.push(new THREE.Vector3(x, y, z));
  }
  const shoulderMaterial = materials.terrain.clone();
  shoulderMaterial.color.setHex(0x514a3e);
  shoulderMaterial.vertexColors = false;
  addRoadRibbon(group, resolved, 17, shoulderMaterial, 'pit-haul-ramp-graded-shoulder', 0.08);
  const compactedEarth = materials.terrain.clone();
  compactedEarth.color.setHex(0x756b59);
  compactedEarth.vertexColors = false;
  compactedEarth.roughness = 1;
  addRoadRibbon(group, resolved, 12.5, compactedEarth, 'pit-haul-ramp-compacted-earth', 0.14);
  const trackMaterial = materials.darkRock.clone();
  trackMaterial.color.setHex(0x4a4237);
  trackMaterial.vertexColors = false;
  for (const offset of [-3.25, 3.25]) {
    const trackPoints = resolved.map((point, index) => {
      const previous = resolved[Math.max(0, index - 1)];
      const next = resolved[Math.min(resolved.length - 1, index + 1)];
      const tangent = next.clone().sub(previous);
      tangent.y = 0;
      tangent.normalize();
      return point.clone().add(new THREE.Vector3(-tangent.z, 0.19, tangent.x).multiplyScalar(offset));
    });
    addRoadRibbon(group, trackPoints, 0.72, trackMaterial, 'pit-haul-ramp-wheel-track', 0);
  }
  curves.set('pit-haul-ramp', new THREE.CatmullRomCurve3(resolved, false, 'centripetal'));
}

function buildingMaterial(materials, color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.38, envMapIntensity: 0.74 });
}

function addRoadRibbon(group, points, width, material, name, yOffset = 0) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = next.clone().sub(previous);
    tangent.y = 0;
    tangent.normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width * 0.5);
    const center = points[index].clone();
    center.y += yOffset;
    const left = center.clone().add(side);
    const right = center.clone().sub(side);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    const v = index / Math.max(1, points.length - 1);
    uvs.push(0, v, 1, v);
    if (index < points.length - 1) {
      const base = index * 2;
      indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ribbonMaterial = material.clone();
  ribbonMaterial.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, ribbonMaterial);
  mesh.name = name;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBuilding(group, materials, getGroundHeight, { name, position, size, color, roofColor = 0x30383a }) {
  const [x, z] = position;
  const [width, height, depth] = size;
  const groundY = getGroundHeight(x, z);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial(materials, color));
  shell.position.set(x, groundY + height * 0.5, z);
  shell.name = name;
  group.add(shell);

  const roofRise = THREE.MathUtils.clamp(width * 0.13, 2.2, 5.5);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-width * 0.52, 0);
  roofShape.lineTo(width * 0.52, 0);
  roofShape.lineTo(0, roofRise);
  roofShape.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: depth + 1.2, bevelEnabled: false });
  const roofMaterial = materials.weatheredSteel.clone();
  roofMaterial.color = new THREE.Color(roofColor);
  roofMaterial.roughness = 0.72;
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(x, groundY + height, z - (depth + 1.2) * 0.5);
  roof.name = `${name}-pitched-roof`;
  group.add(roof);

  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, depth + 1.7, 8), materials.weatheredSteel);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(x, groundY + height + roofRise, z);
  ridge.name = `${name}-ridge-cap`;
  group.add(ridge);

  for (const side of [-1, 1]) {
    const gutter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, depth + 1.5, 8), materials.weatheredSteel);
    gutter.rotation.x = Math.PI / 2;
    gutter.position.set(x + side * width * 0.515, groundY + height, z);
    gutter.name = `${name}-gutter`;
    group.add(gutter);
  }

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, 0.7, depth + 1.2), materials.concrete);
  plinth.position.set(x, groundY + 0.35, z);
  plinth.name = `${name}-plinth`;
  group.add(plinth);

  for (const side of [-1, 1]) {
    for (let index = 0; index < Math.max(2, Math.floor(width / 16)); index += 1) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.65, height + 0.5, 0.65), materials.steel);
      column.position.set(
        x - width * 0.42 + index * (width * 0.84 / Math.max(1, Math.floor(width / 16) - 1)),
        groundY + height * 0.5,
        z + side * (depth * 0.5 + 0.34),
      );
      column.name = `${name}-steel-column`;
      group.add(column);
    }
  }

  const windowMaterial = materials.glass.clone();
  windowMaterial.color.setHex(0x314548);
  windowMaterial.opacity = 0.58;
  const rows = Math.max(2, Math.floor(width / 10));
  for (let index = 0; index < rows; index += 1) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.18), windowMaterial);
    window.position.set(x - width * 0.35 + index * (width * 0.7 / Math.max(1, rows - 1)), groundY + height * 0.58, z + depth * 0.5 + 0.1);
    group.add(window);
  }
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x343b3c, roughness: 0.72, metalness: 0.42 });
  const doorWidth = Math.min(8, width * 0.24);
  const doorHeight = Math.min(6.5, height * 0.58);
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.24), doorMaterial);
  door.position.set(x + width * 0.27, groundY + doorHeight * 0.5, z + depth * 0.5 + 0.13);
  door.name = `${name}-rolling-door`;
  group.add(door);
  for (let slat = 1; slat < 6; slat += 1) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(doorWidth * 0.92, 0.05, 0.05), materials.steel);
    seam.position.set(door.position.x, groundY + doorHeight * slat / 6, door.position.z + 0.14);
    seam.name = `${name}-door-slat`;
    group.add(seam);
  }
  const ventCount = Math.max(2, Math.round(width / 26));
  for (let index = 0; index < ventCount; index += 1) {
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 2.5, 12), materials.steel);
    vent.position.set(
      x - width * 0.25 + index * (width * 0.5 / Math.max(1, ventCount - 1)),
      groundY + height + roofRise * 0.48,
      z,
    );
    vent.name = `${name}-roof-vent`;
    group.add(vent);
  }

  const ribCount = Math.max(6, Math.round(width / 5));
  const ribMaterial = materials.weatheredSteel.clone();
  ribMaterial.color.setHex(0x5f696a);
  for (let index = 0; index <= ribCount; index += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, height * 0.94, 0.11), ribMaterial);
    rib.position.set(x - width * 0.48 + index * width * 0.96 / ribCount, groundY + height * 0.52, z + depth * 0.5 + 0.16);
    rib.name = `${name}-cladding-rib`;
    group.add(rib);
  }
  return shell;
}

function buildPortal(group, materials, getGroundHeight) {
  const portal = ROADWAY_NODES.find(node => node.id === 'portal');
  const [x, , z] = portal.position;
  const root = new THREE.Group();
  root.name = 'mineV2Portal';
  root.position.set(x, getGroundHeight(x, z), z);
  root.rotation.y = -0.28;

  const opening = new THREE.Mesh(new THREE.BoxGeometry(8.5, 6.3, 1), materials.rubber);
  opening.position.y = 3.1;
  root.add(opening);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 7.2, 5.5), materials.concrete);
    wing.position.set(side * 5.1, 3.35, -1.7);
    root.add(wing);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(12.3, 1.5, 4.3), materials.concrete);
  crown.position.set(0, 6.6, -1.1);
  root.add(crown);
  const lamp = new THREE.PointLight(0xffc47f, 650, 35, 1.8);
  lamp.position.set(0, 5.4, 2.5);
  root.add(lamp);
  group.add(root);
}

function addBeamBetween(group, start, end, thickness, material, name) {
  const direction = end.clone().sub(start);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, direction.length()), material);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(FORWARD, direction.normalize());
  beam.name = name;
  group.add(beam);
  return beam;
}

function addProcessHouse(group, materials, getGroundHeight) {
  const x = 315;
  const z = -36;
  const groundY = getGroundHeight(x, z);
  const root = new THREE.Group();
  root.name = 'coal-washery-complex';

  const frameMaterial = materials.weatheredSteel.clone();
  frameMaterial.color.setHex(0x535b5c);
  const cladding = materials.paintedSteel.clone();
  cladding.color.setHex(0x8d9a9d);
  cladding.roughness = 0.72;
  const base = new THREE.Mesh(new THREE.BoxGeometry(54, 1.2, 31), materials.concrete);
  base.position.set(x, groundY + 0.6, z);
  base.name = 'washery-foundation';
  root.add(base);

  const masses = [
    { cx: x - 15, width: 24, height: 19, depth: 27 },
    { cx: x + 4, width: 18, height: 34, depth: 27 },
    { cx: x + 21, width: 15, height: 25, depth: 24 },
  ];
  for (const mass of masses) {
    const shell = new THREE.Mesh(new THREE.BoxGeometry(mass.width, mass.height, mass.depth), cladding);
    shell.position.set(mass.cx, groundY + 1.2 + mass.height * 0.5, z);
    shell.name = 'washery-process-volume';
    root.add(shell);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(mass.width + 0.8, 0.45, mass.depth + 0.8), materials.weatheredSteel);
    roof.position.set(mass.cx, groundY + 1.2 + mass.height + 0.22, z);
    roof.name = 'washery-flat-roof';
    root.add(roof);

    for (const side of [-1, 1]) {
      for (let level = 0; level <= mass.height; level += 6.5) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(mass.width + 1.1, 0.22, 0.22), frameMaterial);
        rail.position.set(mass.cx, groundY + 1.1 + Math.min(level, mass.height), z + side * (mass.depth * 0.5 + 0.2));
        rail.name = 'washery-frame-rail';
        root.add(rail);
      }
      for (let column = -mass.width * 0.42; column <= mass.width * 0.43; column += 6) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, mass.height + 0.8, 0.32), frameMaterial);
        post.position.set(mass.cx + column, groundY + 1.2 + mass.height * 0.5, z + side * (mass.depth * 0.5 + 0.25));
        post.name = 'washery-frame-column';
        root.add(post);
      }
    }
  }

  const windowMaterial = materials.glass.clone();
  windowMaterial.color.setHex(0x4c6268);
  windowMaterial.opacity = 0.48;
  for (const levelY of [10, 17, 24]) {
    for (let index = 0; index < 5; index += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 0.14), windowMaterial);
      window.position.set(x - 5 + index * 5.2, groundY + levelY, z + 13.58);
      window.name = 'washery-maintenance-window';
      root.add(window);
    }
  }

  const stairRoot = new THREE.Group();
  stairRoot.name = 'washery-external-stair';
  stairRoot.position.set(x + 29, groundY + 1.2, z + 10);
  for (let step = 0; step < 18; step += 1) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.7), frameMaterial);
    tread.position.set(0, step * 0.42, -step * 0.42);
    stairRoot.add(tread);
  }
  root.add(stairRoot);
  group.add(root);
  return { x, z, groundY, topY: groundY + 35.5 };
}

function addTransferStation(group, materials, getGroundHeight) {
  const x = 273;
  const z = -47;
  const groundY = getGroundHeight(x, z);
  const root = new THREE.Group();
  root.name = 'raw-coal-transfer-station';
  const frameMaterial = materials.weatheredSteel.clone();
  frameMaterial.color.setHex(0x4c5150);
  for (const dx of [-6.2, 6.2]) {
    for (const dz of [-5.2, 5.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 17, 0.65), frameMaterial);
      leg.position.set(x + dx, groundY + 8.5, z + dz);
      leg.name = 'transfer-station-leg';
      root.add(leg);
      const brace = addBeamBetween(
        root,
        new THREE.Vector3(x + dx, groundY + 1, z + dz),
        new THREE.Vector3(x - dx, groundY + 15, z + dz),
        0.28,
        frameMaterial,
        'transfer-station-brace',
      );
      brace.castShadow = true;
    }
  }
  const enclosureMaterial = materials.paintedSteel.clone();
  enclosureMaterial.color.setHex(0x839093);
  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 14), enclosureMaterial);
  enclosure.position.set(x, groundY + 21, z);
  enclosure.name = 'transfer-station-enclosure';
  root.add(enclosure);
  const hopper = new THREE.Mesh(new THREE.ConeGeometry(6.2, 7, 4), materials.weatheredSteel);
  hopper.rotation.y = Math.PI * 0.25;
  hopper.position.set(x, groundY + 12.5, z);
  hopper.name = 'raw-coal-hopper';
  root.add(hopper);
  group.add(root);
  return { x, z, groundY, topY: groundY + 27 };
}

function addConveyorGallery(group, materials, start, end, name) {
  const root = new THREE.Group();
  root.name = name;
  const direction = end.clone().sub(start);
  const length = direction.length();
  const center = start.clone().add(end).multiplyScalar(0.5);
  root.position.copy(center);
  root.quaternion.setFromUnitVectors(FORWARD, direction.clone().normalize());
  const galleryMaterial = materials.paintedSteel.clone();
  galleryMaterial.color.setHex(0x919c9e);
  const enclosure = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.7, length), galleryMaterial);
  enclosure.name = `${name}-enclosure`;
  root.add(enclosure);
  const frameMaterial = materials.weatheredSteel.clone();
  frameMaterial.color.setHex(0x444b4b);
  for (const side of [-1, 1]) {
    const lowerChord = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, length + 0.7), frameMaterial);
    lowerChord.position.set(side * 2.45, -2.25, 0);
    root.add(lowerChord);
    const upperChord = lowerChord.clone();
    upperChord.position.y = 2.25;
    root.add(upperChord);
  }
  const bayCount = Math.max(4, Math.floor(length / 6));
  for (let bay = 0; bay <= bayCount; bay += 1) {
    const z = -length * 0.5 + bay * length / bayCount;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.7, 0.22), frameMaterial);
      post.position.set(side * 2.45, 0, z);
      root.add(post);
    }
  }
  group.add(root);
  return root;
}

function addSiloAndLoadout(group, materials, getGroundHeight) {
  const z = -38;
  const groundY = getGroundHeight(385, z);
  const root = new THREE.Group();
  root.name = 'product-coal-silo-and-loadout';
  const centers = [367, 386, 405];
  for (const x of centers) {
    const hopper = new THREE.Mesh(new THREE.ConeGeometry(8.2, 8.5, 32), materials.weatheredSteel);
    hopper.rotation.x = Math.PI;
    hopper.position.set(x, groundY + 10.5, z);
    hopper.name = 'product-coal-hopper';
    root.add(hopper);
    const siloMaterial = materials.concrete.clone();
    siloMaterial.color.setHex(0x8b8b83);
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(8.1, 8.1, 27, 40), siloMaterial);
    silo.position.set(x, groundY + 28, z);
    silo.name = 'product-coal-silo';
    root.add(silo);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(8.3, 4.8, 40), materials.weatheredSteel);
    cap.position.set(x, groundY + 43.9, z);
    cap.name = 'silo-roof';
    root.add(cap);
    for (const dx of [-5.4, 5.4]) {
      for (const dz of [-5.4, 5.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 8, 10), materials.weatheredSteel);
        leg.position.set(x + dx, groundY + 4, z + dz);
        leg.name = 'silo-support-leg';
        root.add(leg);
      }
    }
  }
  const headGallery = new THREE.Mesh(new THREE.BoxGeometry(57, 3.5, 4.8), materials.paintedSteel);
  headGallery.position.set(386, groundY + 47.4, z);
  headGallery.name = 'silo-head-gallery';
  root.add(headGallery);
  const loadout = new THREE.Mesh(new THREE.BoxGeometry(19, 12, 15), materials.paintedSteel);
  loadout.position.set(421, groundY + 7, z + 31);
  loadout.name = 'truck-loadout-bin';
  root.add(loadout);
  group.add(root);
  return { x: 367, z, groundY, topY: groundY + 47.4 };
}

function addCoalYard(group, materials, getGroundHeight) {
  const x = 323;
  const z = -100;
  const groundY = getGroundHeight(x, z);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(86, 0.28, 35), materials.road);
  pad.position.set(x, groundY + 0.14, z);
  pad.name = 'coal-stockyard-pad';
  group.add(pad);
  for (const [dx, scaleX, scaleZ] of [[-22, 1.2, 1], [3, 1.45, 1.05], [26, 1.05, 0.86]]) {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(11.5, 6.2, 36), materials.coal);
    pile.scale.set(scaleX, 1, scaleZ);
    pile.position.set(x + dx, groundY + 3.2, z);
    pile.name = 'raw-coal-stockpile';
    group.add(pile);
  }
  const wallMaterial = materials.concrete.clone();
  wallMaterial.color.setHex(0x66655f);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(88, 2.6, 0.7), wallMaterial);
    wall.position.set(x, groundY + 1.3, z + side * 18);
    wall.name = 'stockyard-retaining-wall';
    group.add(wall);
  }
}

function addServiceBuilding(group, materials, getGroundHeight, { name, position, size, color }) {
  const [x, z] = position;
  const [width, height, depth] = size;
  const groundY = getGroundHeight(x, z);
  const wallMaterial = materials.paintedSteel.clone();
  wallMaterial.color.setHex(color);
  wallMaterial.roughness = 0.76;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
  shell.position.set(x, groundY + height * 0.5, z);
  shell.name = name;
  group.add(shell);
  const roofMaterial = materials.weatheredSteel.clone();
  roofMaterial.color.setHex(0x4e5657);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.55, depth + 0.9), roofMaterial);
  roof.position.set(x, groundY + height + 0.28, z);
  roof.name = `${name}-flat-roof`;
  group.add(roof);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 1.3, 0.65, depth + 1.3), materials.concrete);
  plinth.position.set(x, groundY + 0.33, z);
  group.add(plinth);

  const doorMaterial = materials.weatheredSteel.clone();
  doorMaterial.color.setHex(0x3f4748);
  const doorCount = width > 40 ? 3 : 2;
  for (let index = 0; index < doorCount; index += 1) {
    const doorWidth = Math.min(7.2, width / (doorCount + 1));
    const doorHeight = Math.min(6.3, height * 0.72);
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.22), doorMaterial);
    door.position.set(x - width * 0.28 + index * width * 0.28, groundY + doorHeight * 0.5, z + depth * 0.5 + 0.12);
    door.name = `${name}-rolling-door`;
    group.add(door);
    for (let slat = 1; slat < 7; slat += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(doorWidth * 0.94, 0.045, 0.045), materials.steel);
      line.position.set(door.position.x, groundY + doorHeight * slat / 7, door.position.z + 0.13);
      group.add(line);
    }
  }
  for (let bay = 0; bay <= Math.floor(width / 8); bay += 1) {
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.28, height + 0.5, 0.28), materials.weatheredSteel);
    column.position.set(x - width * 0.48 + bay * width * 0.96 / Math.max(1, Math.floor(width / 8)), groundY + height * 0.5, z + depth * 0.5 + 0.18);
    column.name = `${name}-frame-column`;
    group.add(column);
  }
}

function addSubstationYard(group, materials, getGroundHeight) {
  const x = 418;
  const z = 68;
  const groundY = getGroundHeight(x, z);
  addServiceBuilding(group, materials, getGroundHeight, {
    name: 'surface-substation', position: [x, z], size: [31, 7.5, 18], color: 0x7f8b8d,
  });
  const yard = new THREE.Mesh(new THREE.BoxGeometry(34, 0.24, 18), materials.concrete);
  yard.position.set(x - 1, groundY + 0.12, z - 22);
  yard.name = 'substation-switchyard';
  group.add(yard);
  for (const dx of [-9, 0, 9]) {
    const transformer = new THREE.Mesh(new THREE.BoxGeometry(5.4, 4.2, 3.6), materials.weatheredSteel);
    transformer.position.set(x + dx, groundY + 2.3, z - 22);
    transformer.name = 'surface-transformer';
    group.add(transformer);
    for (const side of [-1, 1]) {
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.2, 3.2), materials.steel);
      radiator.position.set(x + dx + side * 2.9, groundY + 2.3, z - 22);
      group.add(radiator);
    }
  }
}

function buildPlant(group, materials, getGroundHeight) {
  const plantAnchor = new THREE.Group();
  plantAnchor.name = 'surfaceProcessingPlant';
  plantAnchor.position.set(315, getGroundHeight(315, -36) + 16, -36);
  group.add(plantAnchor);
  group.userData.surfaceProcessingPlant = plantAnchor;
  const transfer = addTransferStation(group, materials, getGroundHeight);
  const washery = addProcessHouse(group, materials, getGroundHeight);
  const silos = addSiloAndLoadout(group, materials, getGroundHeight);
  addConveyorGallery(
    group,
    materials,
    new THREE.Vector3(transfer.x + 5, transfer.topY - 2, transfer.z),
    new THREE.Vector3(washery.x - 23, washery.groundY + 21, washery.z),
    'raw-coal-conveyor-gallery',
  );
  addConveyorGallery(
    group,
    materials,
    new THREE.Vector3(washery.x + 24, washery.groundY + 25, washery.z),
    new THREE.Vector3(silos.x, silos.topY - 1, silos.z),
    'product-coal-conveyor-gallery',
  );
  addServiceBuilding(group, materials, getGroundHeight, { name: 'maintenance-workshop', position: [266, 72], size: [52, 10, 27], color: 0x8a9698 });
  addServiceBuilding(group, materials, getGroundHeight, { name: 'spares-warehouse', position: [315, 91], size: [38, 8, 21], color: 0x818d8f });
  addSubstationYard(group, materials, getGroundHeight);
  addCoalYard(group, materials, getGroundHeight);
}

function buildVehicle(materials, { color, length, width, wheelRadius, dumpBody = false }) {
  const root = new THREE.Group();
  const paint = buildingMaterial(materials, color);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.5, length * 0.82), materials.steel);
  chassis.position.y = wheelRadius * 1.4;
  root.add(chassis);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, wheelRadius * 2.1, length * 0.3), paint);
  cab.position.set(0, wheelRadius * 2.4, length * 0.25);
  root.add(cab);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, wheelRadius * 0.82, length * 0.16), paint);
  hood.position.set(0, wheelRadius * 1.82, length * 0.46);
  hood.name = 'vehicle-hood';
  root.add(hood);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, wheelRadius * 0.72, 0.12), materials.glass);
  windshield.position.set(0, wheelRadius * 2.65, length * 0.405);
  root.add(windshield);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, wheelRadius * 0.3, 0.32), materials.steel);
  bumper.position.set(0, wheelRadius * 0.86, length * 0.53);
  bumper.name = 'vehicle-front-bumper';
  root.add(bumper);
  const lampMaterial = materials.lamp.clone();
  lampMaterial.emissiveIntensity = 1.5;
  for (const side of [-1, 1]) {
    const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.14, wheelRadius * 0.14, 0.12, 12), lampMaterial);
    headlamp.rotation.x = Math.PI / 2;
    headlamp.position.set(side * width * 0.29, wheelRadius * 1.72, length * 0.545);
    headlamp.name = 'vehicle-headlamp';
    root.add(headlamp);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, width * 0.25), materials.steel);
    mirrorArm.position.set(side * width * 0.54, wheelRadius * 2.7, length * 0.31);
    mirrorArm.rotation.y = Math.PI / 2;
    mirrorArm.name = 'vehicle-mirror-arm';
    root.add(mirrorArm);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, wheelRadius * 0.42, wheelRadius * 0.28), materials.glass);
    mirror.position.set(side * width * 0.63, wheelRadius * 2.7, length * 0.31);
    mirror.name = 'vehicle-mirror';
    root.add(mirror);
  }

  const rear = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.9, dumpBody ? wheelRadius * 1.7 : wheelRadius * 1.25, length * 0.46),
    paint,
  );
  rear.position.set(0, wheelRadius * 2.25, -length * 0.2);
  if (dumpBody) rear.rotation.x = -0.08;
  root.add(rear);
  if (dumpBody) {
    for (const side of [-1, 1]) {
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, wheelRadius * 1.55, length * 0.48), paint);
      sidePanel.position.set(side * width * 0.47, wheelRadius * 2.5, -length * 0.2);
      sidePanel.rotation.x = -0.08;
      sidePanel.name = 'dump-body-side-panel';
      root.add(sidePanel);
      for (let rib = -2; rib <= 2; rib += 1) {
        const stiffener = new THREE.Mesh(new THREE.BoxGeometry(0.12, wheelRadius * 1.45, 0.14), materials.steel);
        stiffener.position.set(side * width * 0.57, wheelRadius * 2.5, -length * 0.2 + rib * length * 0.09);
        stiffener.rotation.x = -0.08;
        stiffener.name = 'dump-body-stiffener';
        root.add(stiffener);
      }
    }
  }

  const wheels = [];
  for (const z of [-length * 0.31, length * 0.3]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, width * 0.12, 18), materials.rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * width * 0.5, wheelRadius, z);
      wheel.name = 'vehicle-wheel';
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.36, wheelRadius * 0.36, width * 0.14, 16), materials.steel);
      hub.name = 'vehicle-wheel-hub';
      wheel.add(hub);
      root.add(wheel);
      wheels.push(wheel);
    }
  }
  return { root, wheels, wheelRadius };
}

function buildExcavator(materials) {
  const root = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd6a129, roughness: 0.58, metalness: 0.34, envMapIntensity: 0.72 });
  const trackMaterial = materials.rubber.clone();
  const upper = new THREE.Group();
  upper.name = 'excavator-upper-carriage';
  for (const side of [-1, 1]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.1, 6.6), trackMaterial);
    track.position.set(side * 2.1, 0.6, 0);
    track.name = 'excavator-track';
    root.add(track);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.64, 5.5), materials.steel);
    inner.position.set(side * 2.1, 0.62, 0);
    root.add(inner);
  }
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.65, 24), materials.steel);
  turntable.position.y = 1.45;
  root.add(turntable);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 4.5), yellow);
  body.position.set(0, 2.65, 0.35);
  upper.add(body);
  const counterweight = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.5, 20, 1, false, 0, Math.PI), yellow);
  counterweight.rotation.z = Math.PI / 2;
  counterweight.position.set(0, 2.75, 2.6);
  upper.add(counterweight);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.75, 2.15), materials.glass);
  cab.position.set(-1.35, 4.3, -0.45);
  cab.name = 'excavator-cab';
  upper.add(cab);
  const boomAssembly = new THREE.Group();
  boomAssembly.name = 'excavator-boom-assembly';
  addBeamBetween(boomAssembly, new THREE.Vector3(0.55, 3.9, -1.25), new THREE.Vector3(0.3, 7.4, -6.2), 1.05, yellow, 'excavator-boom');
  addBeamBetween(boomAssembly, new THREE.Vector3(0.3, 7.4, -6.2), new THREE.Vector3(0.15, 3.15, -10.2), 0.82, yellow, 'excavator-stick');
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.55, 2.15), materials.weatheredSteel);
  bucket.position.set(0.15, 2.25, -10.7);
  bucket.rotation.x = -0.42;
  bucket.name = 'excavator-bucket';
  boomAssembly.add(bucket);
  upper.add(boomAssembly);
  root.add(upper);
  root.userData.upperCarriage = upper;
  root.userData.boomAssembly = boomAssembly;
  return root;
}

function placeSurfaceVehicle(vehicle, point, tangent, direction, getGroundHeight) {
  const horizontal = tangent.clone();
  horizontal.y = 0;
  horizontal.normalize().multiplyScalar(direction);
  const halfWheelbase = vehicle.length * 0.36;
  const front = point.clone().addScaledVector(horizontal, halfWheelbase);
  const rear = point.clone().addScaledVector(horizontal, -halfWheelbase);
  const supportY = Math.max(
    point.y,
    getGroundHeight(point.x, point.z),
    getGroundHeight(front.x, front.z),
    getGroundHeight(rear.x, rear.z),
  );
  vehicle.root.position.set(point.x, supportY + 0.16, point.z);
  vehicle.root.rotation.set(0, Math.atan2(horizontal.x, horizontal.z), 0);
}

function addPitLoadingFleet(group, materials, getGroundHeight, runtime) {
  const loadingMachines = [];
  for (const [t, side, heading] of [[0.83, -1, -1.7]]) {
    const [x, pathY, z] = getPitHaulPathPoint(t);
    const [px, , pz] = getPitHaulPathPoint(Math.max(0, t - 0.01));
    const [nx, , nz] = getPitHaulPathPoint(Math.min(1, t + 0.01));
    const tangent = new THREE.Vector3(nx - px, 0, nz - pz).normalize();
    const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * 9.2);
    const excavator = buildExcavator(materials);
    const surfaceY = getGroundHeight(x + lateral.x, z + lateral.z);
    excavator.position.set(x + lateral.x, Math.max(pathY, surfaceY) + 0.85, z + lateral.z);
    excavator.rotation.y = Math.atan2(tangent.x, tangent.z) + heading;
    excavator.name = 'pit-loading-excavator';
    group.add(excavator);
    loadingMachines.push({ excavator, phase: t * Math.PI * 2 });
  }
  let elapsed = 0;
  runtime.updaters.push(delta => {
    elapsed += delta;
    for (const machine of loadingMachines) {
      machine.excavator.userData.upperCarriage.rotation.y = Math.sin(elapsed * 0.23 + machine.phase) * 0.28;
      machine.excavator.userData.boomAssembly.rotation.x = Math.sin(elapsed * 0.38 + machine.phase) * 0.035;
    }
  });
}

function addFleet(group, materials, runtime, curves, getGroundHeight) {
  const fleet = [
    { routeId: 'plant-access', speed: 0.5, progress: 0.18, direction: 1, color: 0xd19a2c, length: 11.2, width: 3.8, wheelRadius: 0.78, dumpBody: true },
    { routeId: 'portal-access', speed: 0.35, progress: 0.62, direction: -1, color: 0x4e7180, length: 5.5, width: 2.2, wheelRadius: 0.43, dumpBody: false },
    { routeId: 'pit-haul-ramp', speed: 2.4, progress: 0.12, direction: 1, color: 0xe0aa2f, length: 15.5, width: 6.2, wheelRadius: 1.35, dumpBody: true },
    { routeId: 'pit-haul-ramp', speed: 2.05, progress: 0.38, direction: -1, color: 0xdca126, length: 14.8, width: 5.9, wheelRadius: 1.28, dumpBody: true },
    { routeId: 'pit-haul-ramp', speed: 2.25, progress: 0.64, direction: 1, color: 0xe0aa32, length: 15.2, width: 6, wheelRadius: 1.32, dumpBody: true },
    { routeId: 'pit-haul-ramp', speed: 1.85, progress: 0.86, direction: -1, color: 0xd59b21, length: 14.5, width: 5.8, wheelRadius: 1.25, dumpBody: true },
  ];
  for (const descriptor of fleet) {
    const vehicle = buildVehicle(materials, descriptor);
    vehicle.root.name = `${descriptor.routeId}-vehicle`;
    group.add(vehicle.root);
    const curve = curves.get(descriptor.routeId);
    const point = curve.getPointAt(descriptor.progress);
    const tangent = curve.getTangentAt(descriptor.progress);
    const runtimeVehicle = { ...vehicle, curve, length: descriptor.length, speed: descriptor.speed, progress: descriptor.progress, direction: descriptor.direction };
    placeSurfaceVehicle(runtimeVehicle, point, tangent, descriptor.direction, getGroundHeight);
    runtime.routeVehicles.push(runtimeVehicle);
  }

  runtime.updaters.push(delta => {
    for (const vehicle of runtime.routeVehicles) {
      const distance = vehicle.speed * delta;
      vehicle.progress += vehicle.direction * distance / vehicle.curve.getLength();
      if (vehicle.progress >= 1 || vehicle.progress <= 0) {
        vehicle.progress = THREE.MathUtils.clamp(vehicle.progress, 0, 1);
        vehicle.direction *= -1;
      }
      const point = vehicle.curve.getPointAt(vehicle.progress);
      const tangent = vehicle.curve.getTangentAt(vehicle.progress);
      placeSurfaceVehicle(vehicle, point, tangent, vehicle.direction, getGroundHeight);
      for (const wheel of vehicle.wheels) wheel.rotateY(-vehicle.direction * distance / vehicle.wheelRadius);
    }
  });
}

export function buildSurfaceCampus(materials, runtime, getGroundHeight) {
  const root = new THREE.Group();
  root.name = 'mineV2SurfaceCampus';
  const curves = buildRoads(root, materials, getGroundHeight);
  buildPitHaulRoads(root, materials, getGroundHeight, curves);
  buildPortal(root, materials, getGroundHeight);
  const plantRoot = new THREE.Group();
  plantRoot.name = 'surface-coal-processing-complex';
  plantRoot.position.x = -45;
  buildPlant(plantRoot, materials, getGroundHeight);
  root.add(plantRoot);
  const plantAnchor = plantRoot.userData.surfaceProcessingPlant;
  if (plantAnchor) runtime.objectsByRole.set('surfaceProcessingPlant', plantAnchor);
  addPitLoadingFleet(root, materials, getGroundHeight, runtime);
  addFleet(root, materials, runtime, curves, getGroundHeight);
  return root;
}
