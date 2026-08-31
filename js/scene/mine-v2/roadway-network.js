import * as THREE from 'three';
import { MINE_V2_CONFIG } from './config.mjs';
import { ATLAS_EXPOSED_EDGE_IDS, ROADWAY_EDGES, ROADWAY_NODES } from './topology.mjs';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const nodesById = new Map(ROADWAY_NODES.map(node => [node.id, node]));
const exposedEdgeIds = new Set(ATLAS_EXPOSED_EDGE_IDS);

function edgePoints(edge) {
  return (edge.points ?? [nodesById.get(edge.from).position, nodesById.get(edge.to).position])
    .map(position => new THREE.Vector3(...position));
}

function segmentFrame(start, end) {
  const tangent = end.clone().sub(start);
  const length = tangent.length();
  tangent.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(FORWARD, tangent);
  return { length, tangent, quaternion, center: start.clone().add(end).multiplyScalar(0.5) };
}

function localToWorld(vector, frame) {
  return vector.clone().applyQuaternion(frame.quaternion).add(frame.center);
}

function addContinuousHorseshoe(group, samples, width, height, material, name) {
  const halfWidth = width * 0.5;
  const radius = halfWidth;
  const spring = Math.max(1.45, height - radius);
  const shellMaterial = material.clone();
  shellMaterial.side = THREE.DoubleSide;
  shellMaterial.color.setHex(0x9b8c78);
  shellMaterial.roughness = 0.97;
  shellMaterial.metalness = 0;
  shellMaterial.aoMap = null;
  shellMaterial.metalnessMap = null;
  shellMaterial.normalScale?.set(0.72, 0.72);
  shellMaterial.emissive = new THREE.Color(0x211a14);
  shellMaterial.emissiveIntensity = 0.48;
  const crossSection = [new THREE.Vector2(-halfWidth, 0), new THREE.Vector2(-halfWidth, spring)];
  const archSegments = 14;
  for (let index = 1; index <= archSegments; index += 1) {
    const angle = Math.PI - index / archSegments * Math.PI;
    crossSection.push(new THREE.Vector2(Math.cos(angle) * radius, spring + Math.sin(angle) * radius));
  }
  crossSection.push(new THREE.Vector2(halfWidth, 0));

  const positions = [];
  const uvs = [];
  const indices = [];
  let distance = 0;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    if (sampleIndex > 0) distance += samples[sampleIndex].distanceTo(samples[sampleIndex - 1]);
    const previous = samples[Math.max(0, sampleIndex - 1)];
    const next = samples[Math.min(samples.length - 1, sampleIndex + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const right = UP.clone().cross(tangent).normalize();
    for (let crossIndex = 0; crossIndex < crossSection.length; crossIndex += 1) {
      const point = crossSection[crossIndex];
      const vertex = samples[sampleIndex].clone().addScaledVector(right, point.x).addScaledVector(UP, point.y);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(crossIndex / (crossSection.length - 1) * 2.5, distance / 5);
    }
  }

  const ringSize = crossSection.length;
  for (let sampleIndex = 0; sampleIndex < samples.length - 1; sampleIndex += 1) {
    for (let crossIndex = 0; crossIndex < ringSize - 1; crossIndex += 1) {
      const a = sampleIndex * ringSize + crossIndex;
      const b = a + ringSize;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const shell = new THREE.Mesh(geometry, shellMaterial);
  shell.name = name;
  group.add(shell);
}

function addSupportRib(group, frame, width, height, material, name) {
  const halfWidth = width * 0.5 - 0.08;
  const radius = halfWidth;
  const spring = Math.max(1.45, height - width * 0.5);
  const points = [new THREE.Vector3(-halfWidth, 0.08, 0), new THREE.Vector3(-halfWidth, spring, 0)];
  for (let index = 0; index <= 16; index += 1) {
    const angle = Math.PI - index / 16 * Math.PI;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, spring + Math.sin(angle) * radius, 0));
  }
  points.push(new THREE.Vector3(halfWidth, 0.08, 0));
  const worldPoints = points.map(point => localToWorld(point, frame));
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(worldPoints, false, 'centripetal'), 28, 0.055, 6, false);
  const rib = new THREE.Mesh(geometry, material);
  rib.name = name;
  group.add(rib);
}

function addSegment(group, start, end, edge, materials, index) {
  const frame = segmentFrame(start, end);
  const width = edge.width;
  const height = MINE_V2_CONFIG.roadway.defaultHeight;
  const radius = width * 0.5;
  const spring = Math.max(1.45, height - radius);
  const floorMaterial = materials.road.clone();
  floorMaterial.color.setHex(0x3f3b35);
  floorMaterial.emissive = new THREE.Color(0x15120f);
  floorMaterial.emissiveIntensity = 0.24;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.12, frame.length + 1.05), floorMaterial);
  floor.position.copy(localToWorld(new THREE.Vector3(0, 0.035, 0), frame));
  floor.quaternion.copy(frame.quaternion);
  floor.name = `${edge.id}-compacted-floor`;
  group.add(floor);

  if (edge.type === 'return-airway' && index === 0) {
    const ventMarkerMaterial = materials.weatheredSteel.clone();
    ventMarkerMaterial.color.setHex(0x4f5859);
    ventMarkerMaterial.roughness = 0.88;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.2), ventMarkerMaterial);
    marker.position.copy(localToWorld(new THREE.Vector3(-width * 0.34, 0.22, -frame.length * 0.16), frame));
    marker.quaternion.copy(frame.quaternion);
    marker.name = `${edge.id}-embedded-return-air-grille`;
    group.add(marker);
  }

  const drain = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, frame.length - 0.1), materials.concrete);
  drain.position.copy(localToWorld(new THREE.Vector3(width * 0.5 - 0.3, -0.02, 0), frame));
  drain.quaternion.copy(frame.quaternion);
  drain.name = `${edge.id}-drainage`;
  group.add(drain);

  if (['main-incline', 'main-level', 'auxiliary-roadway'].includes(edge.type)) {
    for (const side of [-0.48, 0.48]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, frame.length - 0.25), materials.steel);
      rail.position.copy(localToWorld(new THREE.Vector3(side, 0.02, 0), frame));
      rail.quaternion.copy(frame.quaternion);
      rail.name = `${edge.id}-rail`;
      group.add(rail);
    }
  }

  if (edge.type === 'gate-road') {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, frame.length - 0.3), materials.rubber);
    belt.position.copy(localToWorld(new THREE.Vector3(0, 0.42, 0), frame));
    belt.quaternion.copy(frame.quaternion);
    belt.name = `${edge.id}-belt`;
    group.add(belt);
  }

  if (index % 2 === 0) {
    const localLight = new THREE.PointLight(0xffc987, 32, 12, 1.9);
    localLight.position.copy(localToWorld(new THREE.Vector3(0, 1.2, 0), frame));
    localLight.name = `${edge.id}-low-local-light-${index}`;
    group.add(localLight);
  }
}

function buildEdge(edge, materials) {
  const group = new THREE.Group();
  group.name = `roadway-${edge.id}`;
  const points = edgePoints(edge);
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const divisions = Math.max(2, Math.ceil(curve.getLength() / 24));
  const samples = points.length === 2
    ? Array.from({ length: divisions + 1 }, (_, index) => points[0].clone().lerp(points[1], index / divisions))
    : curve.getPoints(divisions);
  if (edge.type === 'gate-road') {
    // In the atlas view, long arched tunnel shells read like suspended pipes.
    // Keep the compacted floor/belt visible; reserve full roof interiors for future roadway drill-in views.
  } else if (edge.type === 'main-level') {
    // Same reason: the competition overview should read as an integrated mine atlas, not elevated tracks.
  } else {
    // Do not add a long exposed roof shell in the default atlas view.
  }
  for (let index = 0; index < samples.length - 1; index += 1) {
    addSegment(group, samples[index], samples[index + 1], edge, materials, index);
  }
  return group;
}

function buildEmbeddedEdgeTrace(edge, materials) {
  const group = new THREE.Group();
  group.name = `embedded-roadway-trace-${edge.id}`;
  const points = edgePoints(edge);
  const traceMaterial = materials.darkRock.clone();
  traceMaterial.color.setHex(edge.type === 'return-airway' ? 0x3e3933 : 0x272522);
  traceMaterial.roughness = 1;
  traceMaterial.transparent = true;
  traceMaterial.opacity = 0.14;
  traceMaterial.depthWrite = false;
  for (let index = 0; index < points.length - 1; index += 1) {
    const frame = segmentFrame(points[index], points[index + 1]);
    const trace = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.4, edge.width * 0.36), 0.18, frame.length), traceMaterial);
    trace.position.copy(localToWorld(new THREE.Vector3(0, 0.12, 0), frame));
    trace.quaternion.copy(frame.quaternion);
    trace.name = `${edge.id}-buried-route-shadow`;
    group.add(trace);
  }
  return group;
}

function buildJunction(node, connectedEdges, materials) {
  const radius = Math.max(...connectedEdges.map(edge => edge.width)) * 0.72;
  const group = new THREE.Group();
  group.name = `junction-${node.id}`;
  group.position.fromArray(node.position);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.34, 20), materials.road);
  floor.position.y = -0.17;
  floor.name = `${node.id}-junction-floor`;
  group.add(floor);

  return group;
}

function buildChamber(node, materials) {
  const group = new THREE.Group();
  group.name = `chamber-${node.id}`;
  group.position.fromArray(node.position);
  const width = node.id === 'pump-chamber' ? 10 : 12;
  const depth = node.id === 'pump-chamber' ? 8 : 9;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.38, depth), materials.concrete);
  floor.position.y = -0.19;
  group.add(floor);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(width, 4.5, 0.55), materials.darkRock);
  rear.position.set(0, 2.05, -depth * 0.5);
  group.add(rear);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.5, depth), materials.darkRock);
    wall.position.set(side * width * 0.5, 2.05, 0);
    group.add(wall);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.55, depth + 0.3), materials.rock);
  roof.position.y = 4.35;
  group.add(roof);
  return group;
}

function createUndergroundVehicle(materials, color, name) {
  const root = new THREE.Group();
  root.name = name;
  const paint = materials.steel.clone();
  paint.color.setHex(color);
  paint.roughness = 0.58;
  const dark = materials.steel.clone();
  dark.color.setHex(0x24292a);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.42, 7.6), dark);
  chassis.position.y = 0.68;
  chassis.name = `${name}-chassis`;
  root.add(chassis);
  const battery = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.25, 3.2), paint);
  battery.position.set(0, 1.42, -1.5);
  battery.name = `${name}-battery-box`;
  root.add(battery);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.85, 2.35), paint);
  cab.position.set(0, 1.72, 2.15);
  cab.name = `${name}-cab`;
  root.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.78, 0.1), materials.glass);
  windshield.position.set(0, 2.02, 3.36);
  windshield.name = `${name}-windshield`;
  root.add(windshield);

  for (const z of [-2.55, 2.4]) {
    for (const x of [-0.92, 0.92]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 16), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.43, z);
      wheel.name = `${name}-rail-wheel`;
      root.add(wheel);
    }
  }

  const lampMaterial = materials.lamp.clone();
  lampMaterial.color.setHex(0xfff0c9);
  for (const x of [-0.68, 0.68]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), lampMaterial);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(x, 1.35, 3.85);
    lamp.name = `${name}-headlamp`;
    root.add(lamp);
  }
  const beam = new THREE.SpotLight(0xffe1a8, 180, 34, 0.42, 0.55, 1.6);
  beam.position.set(0, 1.55, 3.8);
  beam.target.position.set(0, 0.8, 20);
  root.add(beam, beam.target);
  return root;
}

function addUndergroundFleet(root, materials) {
  const fleet = [
    { edgeId: 'main-level-h2', t: 0.58, color: 0xd28b22, name: 'underground-locomotive-h2' },
    { edgeId: 'main-level-h3', t: 0.52, color: 0xd6a12e, name: 'underground-shuttle-h3' },
  ];
  for (const descriptor of fleet) {
    const edge = ROADWAY_EDGES.find(item => item.id === descriptor.edgeId);
    const curve = new THREE.CatmullRomCurve3(edgePoints(edge), false, 'centripetal');
    const vehicle = createUndergroundVehicle(materials, descriptor.color, descriptor.name);
    const position = curve.getPointAt(descriptor.t);
    const tangent = curve.getTangentAt(descriptor.t);
    vehicle.position.copy(position);
    vehicle.position.y += 0.18;
    vehicle.rotation.y = Math.atan2(tangent.x, tangent.z);
    root.add(vehicle);
  }
}

export function buildRoadwayNetwork(materials, runtime) {
  const root = new THREE.Group();
  root.name = 'mineV2RoadwayNetwork';
  const activeEdges = ROADWAY_EDGES;
  for (const edge of activeEdges) {
    root.add(exposedEdgeIds.has(edge.id) ? buildEdge(edge, materials) : buildEmbeddedEdgeTrace(edge, materials));
  }

  for (const node of ROADWAY_NODES) {
    const connectedEdges = activeEdges.filter(edge => exposedEdgeIds.has(edge.id) && (edge.from === node.id || edge.to === node.id));
    const allConnectedEdges = activeEdges.filter(edge => edge.from === node.id || edge.to === node.id);
    if (connectedEdges.length === 0 && node.type !== 'chamber') continue;
    if (connectedEdges.length >= 3) root.add(buildJunction(node, connectedEdges, materials));
    if (node.type === 'chamber') {
      const chamber = buildChamber(node, materials);
      root.add(chamber);
      runtime.objectsByRole.set(node.id === 'pump-chamber' ? 'pumpRoom' : 'centralSubstation', chamber);
    }

    const light = new THREE.PointLight(0xffc58a, node.type === 'portal' ? 220 : 95, 30, 1.85);
    light.position.fromArray(node.position);
    if (connectedEdges.length === 0 && allConnectedEdges.length > 0) light.intensity = 55;
    light.position.y += 3.7;
    light.name = `${node.id}-roadway-light`;
    root.add(light);
  }
  runtime.roadwayObjects = root.children;
  return root;
}
