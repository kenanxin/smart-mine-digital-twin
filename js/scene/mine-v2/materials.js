import * as THREE from 'three';

function cloneTexture(texture, repeat) {
  if (!texture) return null;
  const next = texture.clone();
  next.wrapS = THREE.RepeatWrapping;
  next.wrapT = THREE.RepeatWrapping;
  next.repeat.set(...repeat);
  next.needsUpdate = true;
  return next;
}

function clonePbr(source, options, repeat) {
  if (!source) return new THREE.MeshStandardMaterial(options);
  const material = source.clone();
  for (const slot of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap']) {
    material[slot] = cloneTexture(source[slot], repeat);
  }
  Object.assign(material, options);
  material.needsUpdate = true;
  return material;
}

export function createMineV2Materials(source) {
  const terrain = clonePbr(source.roadwayRock, {
    color: new THREE.Color(0x918b80), roughness: 1, metalness: 0, envMapIntensity: 0.5,
  }, [28, 17]);
  terrain.normalScale?.set(1.05, 1.05);

  const rock = clonePbr(source.roadwayRock, {
    color: new THREE.Color(0x81786b), roughness: 0.96, metalness: 0.02, envMapIntensity: 0.52,
  }, [18, 11]);
  rock.normalScale?.set(1.7, 1.7);

  const darkRock = clonePbr(source.coalRock, {
    color: new THREE.Color(0x4d4b47), roughness: 0.95, metalness: 0.03, envMapIntensity: 0.42,
  }, [20, 12]);
  darkRock.normalScale?.set(1.5, 1.5);

  const coal = clonePbr(source.coalRock, {
    color: new THREE.Color(0x2b2c2a), roughness: 0.78, metalness: 0.08, envMapIntensity: 0.5,
  }, [24, 5]);

  const paintedSteel = clonePbr(source.paintedMetal, {
    color: new THREE.Color(0x758286), roughness: 0.64, metalness: 0.5, envMapIntensity: 0.72,
  }, [5, 4]);
  paintedSteel.normalScale?.set(0.65, 0.65);

  const weatheredSteel = clonePbr(source.coarseRust, {
    color: new THREE.Color(0x6a6257), roughness: 0.78, metalness: 0.52, envMapIntensity: 0.58,
  }, [4, 4]);
  weatheredSteel.normalScale?.set(0.7, 0.7);

  return {
    terrain,
    rock,
    darkRock,
    coal,
    road: new THREE.MeshStandardMaterial({ color: 0x55514a, roughness: 0.96, envMapIntensity: 0.38 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x777a76, roughness: 0.9, metalness: 0.02 }),
    steel: clonePbr(source.wornMetal, { color: new THREE.Color(0x78817f), roughness: 0.58, metalness: 0.76 }, [4, 4]),
    paintedSteel,
    weatheredSteel,
    rubber: new THREE.MeshStandardMaterial({ color: 0x111211, roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x7897a0, roughness: 0.12, transmission: 0.2, transparent: true, opacity: 0.76 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa43a, emissiveIntensity: 4.5, roughness: 0.3 }),
  };
}
