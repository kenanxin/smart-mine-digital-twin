export const MODEL_ASSETS = Object.freeze({
  mineScan: {
    url: './assets/models/ferriere-lower-tunnels/scene.optimized.glb',
    installed: true,
    label: 'Ferriere Mines - Lower Tunnels',
    author: 'Riccardo Rocca',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/ferriere-mines-lower-tunnels-17ba7a7ddbfb4d17a86ea1b405c9f5ea',
  },
  roadheader: {
    url: './assets/models/pk-3r-roadheader.glb',
    installed: false,
    label: 'PK-3R Roadheader',
    author: 'almapalinka',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/pk-3r-roadheader-e89ca2fe0f9f41b88780632269de9e30',
  },
  conveyorKit: {
    url: './assets/models/quarry-conveyor-system-kit/scene.optimized.glb',
    installed: true,
    label: 'Quarry Conveyor system Kit',
    author: 'DudleyLong',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/quarry-conveyor-system-kit-badf50e9d6ea47ac814e1cae037799ed',
  },
  locomotive: {
    url: './assets/models/narrow-gauge-electric-locomotive/scene.optimized.glb',
    installed: true,
    label: 'Narrow gauge electric locomotive',
    author: 'Lyskilde',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/narrow-gauge-electric-locomotive-9863ce9aa4c449758a304a92dbb03d6f',
  },
  mineCart: {
    url: './assets/models/mine-cart-rusted.glb',
    installed: false,
    label: 'Mine cart Rusted',
    author: 'Gustavo Simas',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/mine-cart-rusted-0b391322171c449fa0eb9092416fd2a6',
  },
  ventilationKit: {
    url: './assets/models/modular-ventilation-duct-kit/scene.optimized.glb',
    installed: true,
    label: 'Modular Ventilation Duct Kit Free',
    author: 'AMMediaGames',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/modular-ventilation-duct-kit-free-d4e35aa0424a43ec9f34d7f8341236a0',
  },
  industrialProps: {
    url: './assets/models/industrial-asset-pack/scene.optimized.glb',
    installed: true,
    label: 'Industrial asset pack',
    author: 'ForevereQ',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/industrial-asset-pack-free-94c5011772a84e8791779b342467f245',
  },
  cctv: {
    url: './assets/models/weathered-cctv-camera/scene.optimized.glb',
    installed: true,
    label: 'Weathered CCTV Security Camera',
    author: 'garwiglino1',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/weathered-cctv-security-camera-rigged-256f864b503d4ff9becbb08d1f51dee7',
  },
  worker: {
    url: './assets/models/construction-worker-animated.glb',
    installed: false,
    label: 'Low-Poly Construction Workers',
    author: 'Jungle Jim',
    license: 'CC BY 4.0',
    source: 'https://sketchfab.com/3d-models/low-poly-construction-workers-animated-7b62e6e1b58c476f8b421dd007a4ff90',
  },
});

export const TEXTURE_ASSETS = Object.freeze({
  coalRock: textureSet('dark_rock_02', '2k'),
  roadwayRock: textureSet('quarry_wall', '2k'),
  roadwayFloor: textureSet('rock_ground', '1k'),
  wornMetal: textureSet('metal_plate_02', '2k'),
  paintedMetal: textureSet('blue_metal_plate', '1k'),
  coarseRust: textureSet('rust_coarse_01', '1k'),
});

function textureSet(id, resolution) {
  const root = `./assets/textures/${id}/${id}`;
  return Object.freeze({
    diffuse: `${root}_diff_${resolution}.jpg`,
    normal: `${root}_nor_gl_${resolution}.jpg`,
    arm: `${root}_arm_${resolution}.jpg`,
  });
}
