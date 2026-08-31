import * as THREE from 'three';

function cloneLayerMaterial(base, color, name) {
  const material = base.clone();
  material.color = new THREE.Color(color);
  material.roughness = 0.98;
  material.metalness = 0;
  material.envMapIntensity = 0.28;
  material.name = name;
  return material;
}

function register(runtime, role, object) {
  runtime.objectsByRole.set(role, object);
  object.userData.role = role;
  return object;
}

function addLayer(parent, descriptor, material, z, depth) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(430, descriptor.height, depth), material);
  mesh.position.set(76, descriptor.y, z);
  mesh.name = `atlas-${descriptor.name}-layer`;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addStrataLines(parent, material) {
  for (const y of [-24, -48, -82, -116, -136, -166]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(432, 0.35, 1.2), material);
    line.position.set(76, y, -210.8);
    line.name = 'atlas-strata-line';
    parent.add(line);
  }
}

function addCutawayFrame(parent, materials, runtime) {
  const frame = register(runtime, 'mainAtlasWindow', new THREE.Group());
  frame.name = 'mainAtlasWindow';
  // Keep the role anchor for focus/contract checks, but do not draw a rectangular
  // picture-frame in the default underground view. That old frame made the scene
  // read as a suspended wall instead of a mined space.
  parent.add(frame);
}

function addRockButtresses(parent, materials) {
  const rock = materials.darkRock;
  for (const descriptor of [
    { x: 76, y: 14, z: -196, sx: 452, sy: 20, sz: 24 },
    { x: -146, y: -94, z: -96, sx: 18, sy: 190, sz: 178 },
    { x: 298, y: -94, z: -96, sx: 18, sy: 190, sz: 178 },
    { x: 76, y: -196, z: -96, sx: 452, sy: 12, sz: 178 },
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(descriptor.sx, descriptor.sy, descriptor.sz), rock);
    mesh.position.set(descriptor.x, descriptor.y, descriptor.z);
    mesh.name = 'atlas-rock-buttress';
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function addAtlasGroundBed(parent, materials) {
  const floorMaterial = materials.darkRock.clone();
  floorMaterial.color.setHex(0x2c2924);
  floorMaterial.roughness = 1;
  floorMaterial.metalness = 0;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(258, 0.72, 188), floorMaterial);
  floor.position.set(-70, -156.55, -112);
  floor.name = 'underground-atlas-rock-ground-bed';
  floor.receiveShadow = true;
  parent.add(floor);

  const seamMaterial = materials.coal.clone();
  seamMaterial.color.setHex(0x101111);
  seamMaterial.roughness = 0.88;
  const seamTable = new THREE.Mesh(new THREE.BoxGeometry(210, 0.36, 166), seamMaterial);
  seamTable.position.set(-82, -155.82, -110);
  seamTable.name = 'underground-atlas-coal-seam-table';
  seamTable.receiveShadow = true;
  parent.add(seamTable);
}

function addLongwallPanelContext(parent, materials) {
  const panel = new THREE.Group();
  panel.name = 'longwall-panel-context';

  const floorMaterial = materials.coal.clone();
  floorMaterial.color.setHex(0x181817);
  floorMaterial.roughness = 0.9;
  floorMaterial.transparent = true;
  floorMaterial.opacity = 0.82;
  const panelFloor = new THREE.Mesh(new THREE.BoxGeometry(138, 0.42, 166), floorMaterial);
  panelFloor.position.set(-82, -155.38, -110);
  panelFloor.name = 'longwall-panel-coal-floor';
  panel.add(panelFloor);

  const highlightMaterial = materials.weatheredSteel.clone();
  highlightMaterial.color.setHex(0xb88931);
  highlightMaterial.roughness = 0.7;
  highlightMaterial.transparent = true;
  highlightMaterial.opacity = 0.78;
  for (const descriptor of [
    { size: [140, 0.24, 1.1], position: [-82, -154.82, -27] },
    { size: [140, 0.24, 1.1], position: [-82, -154.82, -193] },
    { size: [1.1, 0.24, 166], position: [-151, -154.82, -110] },
    { size: [1.1, 0.24, 166], position: [-13, -154.82, -110] },
  ]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(...descriptor.size), highlightMaterial);
    edge.position.set(...descriptor.position);
    edge.name = 'longwall-panel-display-boundary';
    panel.add(edge);
  }

  const gateMaterial = materials.road.clone();
  gateMaterial.color.setHex(0x34312c);
  gateMaterial.roughness = 0.96;
  for (const descriptor of [
    { name: 'headgate-intake-belt-side', z: -45 },
    { name: 'tailgate-return-side', z: -175 },
  ]) {
    const gate = new THREE.Mesh(new THREE.BoxGeometry(138, 0.3, 6.8), gateMaterial);
    gate.position.set(-82, -154.9, descriptor.z);
    gate.name = descriptor.name;
    panel.add(gate);
  }

  const gobMaterial = materials.darkRock.clone();
  gobMaterial.color.setHex(0x2d2924);
  gobMaterial.roughness = 1;
  const gob = new THREE.Mesh(new THREE.BoxGeometry(24, 2.6, 156), gobMaterial);
  gob.position.set(-134, -153.75, -110);
  gob.name = 'longwall-gob-mass';
  panel.add(gob);

  const coalWallMaterial = materials.coal.clone();
  coalWallMaterial.color.setHex(0x0e0f0f);
  const coalWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 5.6, 156), coalWallMaterial);
  coalWall.position.set(-103.8, -152.15, -110);
  coalWall.name = 'atlas-longwall-coal-wall-reference';
  panel.add(coalWall);

  parent.add(panel);
}

export function buildMineAtlas(materials, runtime) {
  const root = new THREE.Group();
  root.name = 'mineV2IntegratedAtlas';

  const geology = register(runtime, 'atlasGeologyMass', new THREE.Group());
  geology.name = 'atlasGeologyMass';

  const seam = register(runtime, 'coalSeamCutaway', new THREE.Mesh(
    new THREE.BoxGeometry(156, 7.5, 3.2),
    cloneLayerMaterial(materials.coal, 0x101111, 'coalSeamCutawayMaterial'),
  ));
  seam.position.set(-104, -151.5, -30);
  seam.name = 'coalSeamCutaway';
  seam.receiveShadow = true;
  geology.add(seam);

  addAtlasGroundBed(geology, materials);
  addLongwallPanelContext(geology, materials);
  root.add(geology);
  addCutawayFrame(root, materials, runtime);
  return root;
}
