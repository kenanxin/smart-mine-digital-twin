import * as THREE from 'three';
import { MINE_V2_CONFIG } from './config.mjs';
import { ROADWAY_NODES } from './topology.mjs';

const FACE_CENTER = ROADWAY_NODES.find(node => node.id === 'working-face-1206').position;

function paintedSteel(materials, color) {
  const material = materials.steel.clone();
  material.color.set(color);
  material.roughness = 0.56;
  return material;
}

function register(runtime, role, object) {
  runtime.objectsByRole.set(role, object);
  object.userData.role = role;
  return object;
}

function registerAlias(runtime, role, object) {
  runtime.objectsByRole.set(role, object);
  object.userData.roleAliases = [...(object.userData.roleAliases ?? []), role];
  return object;
}

function addTube(root, points, radius, material, name) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 7, false), material);
  tube.name = name;
  root.add(tube);
  return tube;
}

function addRail(root, start, end, radius, material, name) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
  rail.position.copy(a.add(b).multiplyScalar(0.5));
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  rail.name = name;
  root.add(rail);
  return rail;
}

function buildSupport(materials) {
  const root = new THREE.Group();
  root.name = 'support';
  const blue = paintedSteel(materials, 0x355f70);
  const yellow = paintedSteel(materials, 0xc49322);
  for (const z of [-0.72, 0.72]) {
    const ski = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.24, 0.52), materials.steel);
    ski.position.set(0, 0.13, z);
    ski.name = 'supportBaseSki';
    root.add(ski);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.28, 2.12), blue);
  base.position.y = 0.34;
  base.name = 'supportBaseFrame';
  root.add(base);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.28, 3.05), blue);
  canopy.position.set(-0.15, 4.45, 0);
  canopy.rotation.z = -0.06;
  canopy.name = 'supportCanopy';
  root.add(canopy);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.25, 2.65), blue);
  shield.position.set(-1.08, 2.42, 0);
  shield.rotation.z = -0.2;
  shield.name = 'supportShield';
  root.add(shield);
  for (const x of [0.18, 0.68]) {
    for (const z of [-0.7, 0.7]) {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.45, 12), yellow);
      cylinder.position.set(x, 1.55, z);
      cylinder.rotation.z = -0.08;
      cylinder.name = 'supportHydraulicCylinder';
      root.add(cylinder);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.45, 10), materials.steel);
      rod.position.set(x - 0.08, 3.38, z);
      rod.rotation.z = -0.08;
      rod.name = 'supportChromeRod';
      root.add(rod);
    }
  }
  for (const z of [-0.9, 0.9]) {
    const link = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.18), yellow);
    link.position.set(-0.32, 1.32, z);
    link.rotation.z = -0.62;
    link.name = 'supportFourBarLink';
    root.add(link);
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12), materials.steel);
    pivot.rotation.x = Math.PI / 2;
    pivot.position.set(-0.72, 1.72, z);
    pivot.name = 'supportPivot';
    root.add(pivot);
  }
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.82), yellow);
  valve.position.set(0.86, 2.35, 0);
  valve.name = 'supportValveBlock';
  root.add(valve);
  const hoseMaterial = materials.rubber.clone();
  hoseMaterial.color.setHex(0x171b1b);
  for (const z of [-0.42, 0.42]) {
    addTube(root, [[0.82, 2.52, z], [1.08, 2.12, z], [0.82, 1.48, z]], 0.055, hoseMaterial, 'supportHydraulicHose');
  }
  return root;
}

function buildSupports(materials, runtime, length) {
  const array = register(runtime, 'hydraulicSupportArray', new THREE.Group());
  array.name = 'hydraulicSupportArray';
  const count = 40;
  for (let index = 0; index < count; index += 1) {
    const support = buildSupport(materials);
    support.position.set(-105.5, -155, -110 - length * 0.5 + 2 + index * ((length - 4) / (count - 1)));
    array.add(support);
  }
  return array;
}

function buildScraper(materials, runtime, length) {
  const root = register(runtime, 'scraperConveyor', new THREE.Group());
  root.name = 'scraperConveyor';
  const panMaterial = paintedSteel(materials, 0x465052);
  const panCount = 34;
  for (let index = 0; index < panCount; index += 1) {
    const pan = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, length / panCount - 0.08), panMaterial);
    pan.position.set(-102.8, -154.55, -110 - length * 0.5 + (index + 0.5) * length / panCount);
    root.add(pan);
  }
  return root;
}

function buildShearer(materials, runtime) {
  const root = register(runtime, 'shearer', new THREE.Group());
  root.name = 'workingFaceShearer';
  root.position.set(-103, -153.9, -110);
  const yellow = paintedSteel(materials, 0xc88b20);
  const darkSteel = paintedSteel(materials, 0x262d2f);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.75, 3.2), yellow);
  body.position.y = 1.2;
  body.name = 'shearerMainBody';
  root.add(body);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 3.55), darkSteel);
  deck.position.y = 2.18;
  deck.name = 'shearerServiceDeck';
  root.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.15, 1.9), materials.glass);
  cabin.position.set(0.55, 2.65, 0);
  cabin.name = 'shearerControlCab';
  root.add(cabin);
  const enclosureMaterial = paintedSteel(materials, 0xb87618);
  for (const x of [-1.55, -0.35, 1.65]) {
    const enclosure = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 2.74), enclosureMaterial);
    enclosure.position.set(x, 1.34, 0);
    enclosure.name = 'shearerElectricalEnclosure';
    root.add(enclosure);
    for (let slot = -2; slot <= 2; slot += 1) {
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 1.65), darkSteel);
      grille.position.set(x + 0.51, 1.34 + slot * 0.15, 0);
      grille.name = 'shearerCoolingGrille';
      root.add(grille);
    }
  }
  for (const side of [-1, 1]) {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.45, 18), darkSteel);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(1.82, 1.05, side * 1.9);
    motor.name = 'shearerTractionMotor';
    root.add(motor);
    const warning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.035), paintedSteel(materials, 0xe0b326));
    warning.position.set(-0.2, 0.82, side * 1.63);
    warning.name = 'shearerWarningStripe';
    root.add(warning);
  }
  const handrailMaterial = paintedSteel(materials, 0xd8b03a);
  for (const z of [-1.55, 1.55]) {
    addRail(root, [-1.75, 2.38, z], [2.0, 2.38, z], 0.045, handrailMaterial, 'shearerHandrail');
    for (const x of [-1.75, 0.1, 2.0]) {
      addRail(root, [x, 2.2, z], [x, 2.82, z], 0.04, handrailMaterial, 'shearerHandrailPost');
    }
  }
  const hoseMaterial = materials.rubber.clone();
  hoseMaterial.color.setHex(0x101312);
  addTube(root, [[-1.65, 2.05, -1.48], [-2.35, 2.65, -1.85], [-2.35, 1.7, -2.65]], 0.075, hoseMaterial, 'shearerHydraulicHose');
  addTube(root, [[-1.65, 2.05, 1.48], [-2.35, 2.65, 1.85], [-2.35, 1.7, 2.65]], 0.075, hoseMaterial, 'shearerHydraulicHose');
  const workLampMaterial = materials.lamp.clone();
  workLampMaterial.emissiveIntensity = 2.1;
  for (const z of [-1.15, 1.15]) {
    const workLamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.18), workLampMaterial);
    workLamp.position.set(2.68, 1.85, z);
    workLamp.name = 'shearerWorkLamp';
    root.add(workLamp);
  }
  for (const z of [-1.28, 1.28]) {
    for (let index = -2; index <= 2; index += 1) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.48), darkSteel);
      shoe.position.set(index * 0.88, 0.18, z);
      shoe.name = 'shearerTrackShoe';
      root.add(shoe);
    }
  }
  for (const z of [-2.2, 2.2]) {
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.62, 18), darkSteel);
    pivot.rotation.x = Math.PI / 2;
    pivot.position.set(-1.85, 1.48, Math.sign(z) * 1.72);
    pivot.name = 'shearerRangingPivot';
    root.add(pivot);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.7, 2.35), yellow);
    arm.position.set(-2.05, 1.6, z);
    arm.rotation.x = z < 0 ? -0.3 : 0.3;
    arm.name = 'shearerRangingArm';
    root.add(arm);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.05, 1.05, 24), darkSteel);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(-2.25, 1.72, z + Math.sign(z) * 1.25);
    drum.name = 'shearerCuttingDrum';
    root.add(drum);
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      const pick = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 7), materials.steel);
      pick.position.set(
        drum.position.x + Math.cos(angle) * 1.18,
        drum.position.y + Math.sin(angle) * 1.18,
        drum.position.z + (index % 3 - 1) * 0.32,
      );
      pick.rotation.z = angle - Math.PI / 2;
      pick.name = 'shearerCuttingPick';
      root.add(pick);
    }
  }
  runtime.workingFaceShearer = root;
  return root;
}

function buildStageLoader(materials, runtime) {
  const root = register(runtime, 'stageLoader', new THREE.Group());
  registerAlias(runtime, 'stageLoaderSZZ1200', root);
  root.name = 'stageLoader';
  root.position.set(-78, -154.2, -43);
  root.rotation.y = Math.PI / 2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 52), paintedSteel(materials, 0x4b5557));
  frame.position.y = 0.55;
  root.add(frame);
  const drive = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 3.8), paintedSteel(materials, 0xc88b20));
  drive.position.set(0, 1.15, 24);
  root.add(drive);
  return root;
}

function buildCrusher(materials, runtime) {
  const root = register(runtime, 'crusherPLM3000', new THREE.Group());
  root.name = 'crusherPLM3000';
  root.position.set(-72, -154.05, -61);
  root.rotation.y = Math.PI / 2;
  const yellow = paintedSteel(materials, 0xc78d24);
  const dark = paintedSteel(materials, 0x2b3031);
  const skid = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.42, 7.4), materials.steel);
  skid.position.y = 0.24;
  skid.name = 'crusherSkidBase';
  root.add(skid);
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.15, 5.2), yellow);
  chamber.position.y = 1.62;
  chamber.name = 'crusherMainChamber';
  root.add(chamber);
  const feedHopper = new THREE.Mesh(new THREE.ConeGeometry(2.65, 1.9, 4), materials.weatheredSteel);
  feedHopper.rotation.y = Math.PI * 0.25;
  feedHopper.position.set(0, 3.55, -1.35);
  feedHopper.scale.z = 1.22;
  feedHopper.name = 'crusherFeedHopper';
  root.add(feedHopper);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.6, 18), dark);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(2.75, 1.65, 1.55);
  motor.name = 'crusherDriveMotor';
  root.add(motor);
  for (const z of [-2.25, 0, 2.25]) {
    const guard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.18, 0.18), dark);
    guard.position.set(0, 2.75, z);
    guard.name = 'crusherSafetyRail';
    root.add(guard);
  }
  return root;
}

function buildGoaf(materials, length) {
  const root = new THREE.Group();
  root.name = 'goafBoundary';
  for (let index = 0; index < 54; index += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + (index % 7) * 0.16, 0), materials.darkRock);
    rock.position.set(-119 - (index % 5) * 1.3, -154.2 + (index % 3) * 0.65, -110 - length * 0.5 + 2 + (index / 53) * (length - 4));
    rock.scale.y = 0.65;
    rock.name = 'goafRock';
    root.add(rock);
  }
  return root;
}

function addFaceLighting(root, materials, length) {
  const lampMaterial = materials.lamp.clone();
  lampMaterial.color.setHex(0xffe7b8);
  lampMaterial.emissive.setHex(0xffc86b);
  lampMaterial.emissiveIntensity = 3.4;
  for (let index = 0; index < 7; index += 1) {
    const z = -110 - length * 0.5 + 12 + index * ((length - 24) / 6);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 2.3), lampMaterial);
    housing.position.set(-98.5, -150.15, z);
    housing.name = 'workingFaceLamp';
    root.add(housing);
    const light = new THREE.PointLight(0xffd39a, 16, 24, 1.7);
    light.position.set(-98.5, -150.5, z);
    light.name = 'workingFacePointLight';
    root.add(light);
  }
}

export function buildWorkingFace(materials, runtime) {
  const { length, width, height } = MINE_V2_CONFIG.workingFace;
  const root = register(runtime, 'workingFace', new THREE.Group());
  root.name = 'workingFace1206';

  const faceFloorMaterial = materials.road.clone();
  faceFloorMaterial.color.setHex(0x242827);
  faceFloorMaterial.roughness = 0.92;
  faceFloorMaterial.envMapIntensity = 0.08;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, length), faceFloorMaterial);
  floor.position.set(FACE_CENTER[0] + width * 0.38, FACE_CENTER[1] - 0.23, FACE_CENTER[2]);
  floor.name = 'workingFaceFloor';
  root.add(floor);
  const coalDebrisGeometry = new THREE.DodecahedronGeometry(0.42, 0);
  for (let index = 0; index < 42; index += 1) {
    const debris = new THREE.Mesh(coalDebrisGeometry, materials.coal);
    const lane = index % 7;
    debris.position.set(
      FACE_CENTER[0] + 3.6 + lane * 3.2,
      FACE_CENTER[1] + 0.08 + (index % 3) * 0.06,
      FACE_CENTER[2] - length * 0.46 + (index / 41) * length * 0.92,
    );
    debris.scale.set(0.7 + (index % 4) * 0.13, 0.28 + (index % 3) * 0.08, 0.72 + (index % 5) * 0.11);
    debris.rotation.set(index * 0.31, index * 0.73, index * 0.17);
    debris.name = 'workingFaceCoalDebris';
    root.add(debris);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 3, 0.7, length + 2), materials.rock);
  roof.position.set(FACE_CENTER[0] + width * 0.38, FACE_CENTER[1] + height + 0.35, FACE_CENTER[2]);
  roof.name = 'workingFaceRoof';
  root.add(roof);
  runtime.workingFaceRoof = roof;

  const coalWall = register(runtime, 'coalWall', new THREE.Mesh(new THREE.BoxGeometry(3.2, height, length), materials.coal));
  coalWall.position.set(FACE_CENTER[0] - 1.6, FACE_CENTER[1] + height * 0.5, FACE_CENTER[2]);
  coalWall.name = 'coalWall';
  root.add(coalWall);

  root.add(buildSupports(materials, runtime, length));
  root.add(buildScraper(materials, runtime, length - 4));
  root.add(buildShearer(materials, runtime));
  root.add(buildStageLoader(materials, runtime));
  root.add(buildCrusher(materials, runtime));
  root.add(buildGoaf(materials, length));
  addFaceLighting(root, materials, length);

  const faceLight = new THREE.RectAreaLight(0xffd4a0, 45, 18, 130);
  faceLight.position.set(-96, -149.5, -110);
  faceLight.rotation.y = Math.PI / 2;
  faceLight.name = 'workingFaceAreaLight';
  root.add(faceLight);
  return root;
}
