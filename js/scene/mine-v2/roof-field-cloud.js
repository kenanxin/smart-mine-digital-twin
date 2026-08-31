import * as THREE from 'three';

const FIELD_MODES = ['stress', 'displacement', 'risk'];

const FIELD_BOUNDS = Object.freeze({
  xMin: -3.75,
  xMax: 3.75,
  zMin: 2.4,
  zMax: 23.5,
  y: 6.04,
});

const FIELD_PATCHES = Object.freeze([
  Object.freeze({
    id: 'gate-roadway',
    name: '运输顺槽顶板云图',
    xMin: -3.75,
    xMax: 3.75,
    zMin: 2.4,
    zMax: 23.5,
    y: 6.04,
    textureWidth: 384,
    textureHeight: 768,
    cols: 56,
    rows: 112,
    titlePosition: [-2.25, 6.82, 3.4],
  }),
  Object.freeze({
    id: 'face-exit',
    name: '工作面出口顶板云图',
    xMin: -3.85,
    xMax: 2.35,
    zMin: -9.2,
    zMax: 5.2,
    y: 4.62,
    textureWidth: 384,
    textureHeight: 512,
    cols: 52,
    rows: 82,
    titlePosition: [-3.15, 5.38, -8.2],
  }),
]);

const STAGE_ALPHA = Object.freeze({
  normalMonitor: 0.34,
  roofPressureRise: 0.40,
  roofSeparationAlarm: 0.44,
  supportResistanceAlarm: 0.58,
  roofFallWarning: 0.60,
  emergencyResponse: 0.42,
});

const MODE_META = {
  stress: { title: '顶板应力场', unit: 'MPa', min: 14, max: 38 },
  displacement: { title: '顶板位移场', unit: 'mm', min: 4, max: 46 },
  risk: { title: '综合风险场', unit: '风险指数', min: 0, max: 100 },
};

const MODE_DISPLAY_TITLE = {
  stress: '顶板应力场',
  displacement: '顶板位移场',
  risk: '综合风险场',
};

const STAGE_PROFILES = {
  normalMonitor: {
    stressBase: 17.5,
    displacementBase: 8.5,
    stressHotspots: [
      { x: 0, z: 8.5, amp: 2.4, sx: 2.8, sz: 6.5 },
      { x: -1.4, z: 3.2, amp: 1.2, sx: 1.8, sz: 3.0 },
    ],
    displacementHotspots: [
      { x: 0.1, z: 10.8, amp: 3.5, sx: 2.6, sz: 5.8 },
    ],
  },
  roofPressureRise: {
    stressBase: 19.0,
    displacementBase: 10.0,
    stressHotspots: [
      { x: 1.35, z: 12.0, amp: 10.5, sx: 1.35, sz: 3.3 },
      { x: -0.45, z: 8.4, amp: 5.5, sx: 2.5, sz: 4.6 },
    ],
    displacementHotspots: [
      { x: 0.2, z: 11.6, amp: 8.2, sx: 2.2, sz: 4.8 },
    ],
  },
  roofSeparationAlarm: {
    stressBase: 20.5,
    displacementBase: 13.5,
    stressHotspots: [
      { x: 0.45, z: 13.8, amp: 9.2, sx: 1.7, sz: 4.2 },
      { x: -0.2, z: 17.2, amp: 6.5, sx: 1.5, sz: 3.2 },
    ],
    displacementHotspots: [
      { x: 0.0, z: 16.0, amp: 22.5, sx: 1.45, sz: 3.0 },
      { x: -0.4, z: 10.2, amp: 9.5, sx: 1.9, sz: 3.8 },
    ],
  },
  supportResistanceAlarm: {
    stressBase: 22.0,
    displacementBase: 13.0,
    stressHotspots: [
      { x: -1.25, z: -4.2, amp: 15.8, sx: 1.15, sz: 2.4 },
      { x: -1.25, z: 4.4, amp: 15.0, sx: 1.15, sz: 2.5 },
      { x: -0.8, z: 8.0, amp: 7.2, sx: 1.8, sz: 4.2 },
    ],
    displacementHotspots: [
      { x: -1.1, z: -4.0, amp: 18.5, sx: 1.25, sz: 2.4 },
      { x: -1.1, z: 4.9, amp: 17.0, sx: 1.3, sz: 2.8 },
      { x: -0.15, z: 10.6, amp: 8.0, sx: 2.0, sz: 4.5 },
    ],
  },
  roofFallWarning: {
    stressBase: 20.8,
    displacementBase: 12.8,
    stressHotspots: [
      { x: -1.15, z: -4.6, amp: 21.0, sx: 1.15, sz: 2.5 },
      { x: -1.05, z: 5.0, amp: 20.0, sx: 1.2, sz: 3.0 },
      { x: 0.15, z: 14.8, amp: 14.5, sx: 1.7, sz: 4.2 },
      { x: 1.0, z: 18.2, amp: 7.5, sx: 1.4, sz: 2.7 },
    ],
    displacementHotspots: [
      { x: -1.0, z: -4.4, amp: 31.0, sx: 1.05, sz: 2.35 },
      { x: -0.9, z: 5.4, amp: 30.0, sx: 1.2, sz: 2.8 },
      { x: 0.05, z: 16.0, amp: 27.0, sx: 1.35, sz: 3.2 },
    ],
  },
  emergencyResponse: {
    stressBase: 19.4,
    displacementBase: 11.8,
    stressHotspots: [
      { x: -1.0, z: -4.2, amp: 12.0, sx: 1.45, sz: 2.8 },
      { x: -0.8, z: 5.2, amp: 13.5, sx: 1.5, sz: 3.6 },
      { x: 0.15, z: 15.5, amp: 10.5, sx: 1.8, sz: 4.0 },
    ],
    displacementHotspots: [
      { x: -1.05, z: -4.1, amp: 20.0, sx: 1.35, sz: 2.7 },
      { x: -0.9, z: 5.2, amp: 23.0, sx: 1.4, sz: 3.2 },
      { x: 0.05, z: 16.0, amp: 19.0, sx: 1.6, sz: 3.6 },
    ],
  },
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function colorRamp(t) {
  const stops = [
    [0.00, [18, 68, 166]],
    [0.20, [22, 174, 220]],
    [0.42, [41, 207, 139]],
    [0.62, [239, 214, 72]],
    [0.78, [245, 128, 48]],
    [1.00, [220, 38, 45]],
  ];
  const x = clamp01(t);
  for (let i = 1; i < stops.length; i += 1) {
    if (x <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      return mixColor(c0, c1, (x - p0) / (p1 - p0));
    }
  }
  return stops.at(-1)[1];
}

function stressColorRamp(t) {
  const stops = [
    [0.00, [22, 130, 150]],
    [0.26, [30, 185, 145]],
    [0.50, [92, 208, 108]],
    [0.68, [238, 216, 82]],
    [0.84, [245, 128, 48]],
    [1.00, [220, 38, 45]],
  ];
  const x = clamp01(t);
  for (let i = 1; i < stops.length; i += 1) {
    if (x <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      return mixColor(c0, c1, (x - p0) / (p1 - p0));
    }
  }
  return stops.at(-1)[1];
}

function gaussian(x, z, hotspot) {
  const dx = (x - hotspot.x) / hotspot.sx;
  const dz = (z - hotspot.z) / hotspot.sz;
  return hotspot.amp * Math.exp(-0.5 * (dx * dx + dz * dz));
}

function profileForStage(stageId) {
  return STAGE_PROFILES[stageId] ?? STAGE_PROFILES.normalMonitor;
}

function worldFromUv(u, v, bounds = FIELD_BOUNDS) {
  return {
    x: lerp(bounds.xMin, bounds.xMax, u),
    z: lerp(bounds.zMin, bounds.zMax, v),
  };
}

function sampleFields(stageId, x, z, time = 0) {
  const profile = profileForStage(stageId);
  const roofWave = Math.sin(z * 0.42 + x * 1.3) * 0.28;
  const stress = profile.stressBase
    + roofWave
    + profile.stressHotspots.reduce((sum, hotspot) => sum + gaussian(x, z, hotspot), 0);
  const displacement = profile.displacementBase
    + Math.sin(z * 0.35 - x * 0.7) * 0.45
    + profile.displacementHotspots.reduce((sum, hotspot) => sum + gaussian(x, z, hotspot), 0);
  const stressRatio = smoothstep(18, 36, stress);
  const displacementRatio = smoothstep(10, 42, displacement);
  const risk = Math.round(clamp01(stressRatio * 0.48 + displacementRatio * 0.52) * 100);
  return { stress, displacement, risk };
}

function valueForMode(fields, mode) {
  if (mode === 'stress') return fields.stress;
  if (mode === 'displacement') return fields.displacement;
  return fields.risk;
}

function normalizeValue(value, mode) {
  const meta = MODE_META[mode];
  return clamp01((value - meta.min) / (meta.max - meta.min));
}

function stageAlphaMultiplier(stageId) {
  return STAGE_ALPHA[stageId] ?? STAGE_ALPHA.normalMonitor;
}

function contourOpacityForState(stageId, mode) {
  return 0;
}

function patchOpacityForState(stageId, mode) {
  if (mode === 'risk' && (
    stageId === 'supportResistanceAlarm'
    || stageId === 'roofFallWarning'
    || stageId === 'emergencyResponse'
  )) return 0.62;
  if (mode === 'risk') return 0.36;
  return stageId === 'roofFallWarning' ? 0.42 : 0.32;
}

function isFaceStage(stageId) {
  return stageId === 'supportResistanceAlarm'
    || stageId === 'roofFallWarning'
    || stageId === 'emergencyResponse';
}

function createFieldTexture(state, bounds = FIELD_BOUNDS) {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.textureWidth ?? 512;
  canvas.height = bounds.textureHeight ?? 1024;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const image = ctx.createImageData(canvas.width, canvas.height);
  let max = { value: -Infinity, x: 0, z: 0 };
  const alphaMultiplier = stageAlphaMultiplier(state.stageId);

  for (let py = 0; py < canvas.height; py += 1) {
    const v = 1 - py / (canvas.height - 1);
    for (let px = 0; px < canvas.width; px += 1) {
      const u = px / (canvas.width - 1);
      const { x, z } = worldFromUv(u, v, bounds);
      const fields = sampleFields(state.stageId, x, z, state.time);
      const value = valueForMode(fields, state.mode);
      if (value > max.value) max = { value, x, z };
      const normalized = normalizeValue(value, state.mode);
      const [r, g, b] = state.mode === 'stress' ? stressColorRamp(normalized) : colorRamp(normalized);
      const isRisk = state.mode === 'risk';
      const baseVisibility = state.mode === 'stress' ? 0.50 : (isRisk ? 0.0 : 0.06);
      const visibilityCurve = Math.pow(normalized, state.mode === 'stress' ? 0.62 : (isRisk ? 1.34 : 1.45));
      const highValueBoost = normalized > 0.52 ? (isRisk ? 42 : 22) : 0;
      const edgeFade = Math.min(
        smoothstep(0.00, isRisk ? 0.20 : 0.14, u),
        smoothstep(0.00, isRisk ? 0.20 : 0.14, 1 - u),
        smoothstep(0.00, isRisk ? 0.18 : 0.10, v),
        smoothstep(0.00, isRisk ? 0.18 : 0.10, 1 - v),
      );
      const modeAlphaScale = state.mode === 'stress' ? 1 : (isRisk ? 0.78 : 0.58);
      const alpha = Math.round((baseVisibility * 96 + visibilityCurve * 168 + highValueBoost) * alphaMultiplier * edgeFade * modeAlphaScale);
      const idx = (py * canvas.width + px) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
      image.data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Subtle grid so it reads like an engineering result mesh.
  ctx.save();
  ctx.globalAlpha = state.mode === 'risk'
    ? (state.stageId === 'normalMonitor' ? 0.018 : 0.032)
    : (state.stageId === 'normalMonitor' ? 0.035 : 0.065);
  ctx.strokeStyle = '#d8f7ff';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += canvas.width / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += canvas.height / 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  return { canvas, max };
}

function createLabelSprite(text, color = '#e9fbff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(4, 10, 14, 0.78)';
  ctx.strokeStyle = 'rgba(91, 225, 255, 0.82)';
  ctx.lineWidth = 3;
  ctx.roundRect(8, 18, 496, 86, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '600 30px Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

function refreshLabelSprite(sprite, text, color = '#e9fbff') {
  const next = createLabelSprite(text, color);
  sprite.material.map.dispose();
  sprite.material.dispose();
  sprite.material = next.material;
}

function sampleGrid(stageId, mode, time, bounds = FIELD_BOUNDS, cols = 72, rows = 154) {
  const values = [];
  for (let row = 0; row < rows; row += 1) {
    const v = row / (rows - 1);
    const line = [];
    for (let col = 0; col < cols; col += 1) {
      const u = col / (cols - 1);
      const { x, z } = worldFromUv(u, v, bounds);
      line.push(valueForMode(sampleFields(stageId, x, z, time), mode));
    }
    values.push(line);
  }
  return values;
}

function buildContourSegments(state, bounds = FIELD_BOUNDS) {
  const cols = bounds.cols ?? 72;
  const rows = bounds.rows ?? 154;
  const values = sampleGrid(state.stageId, state.mode, state.time, bounds, cols, rows);
  const meta = MODE_META[state.mode];
  const levels = [];
  for (let i = 1; i <= 5; i += 1) levels.push(lerp(meta.min, meta.max, i / 6));
  const segments = [];

  function pointOnEdge(col, row, edge, level) {
    const x0 = col / (cols - 1);
    const z0 = row / (rows - 1);
    const x1 = (col + 1) / (cols - 1);
    const z1 = (row + 1) / (rows - 1);
    const v00 = values[row][col];
    const v10 = values[row][col + 1];
    const v11 = values[row + 1][col + 1];
    const v01 = values[row + 1][col];
    if (edge === 0) {
      const t = (level - v00) / ((v10 - v00) || 1);
      return worldFromUv(lerp(x0, x1, t), z0, bounds);
    }
    if (edge === 1) {
      const t = (level - v10) / ((v11 - v10) || 1);
      return worldFromUv(x1, lerp(z0, z1, t), bounds);
    }
    if (edge === 2) {
      const t = (level - v01) / ((v11 - v01) || 1);
      return worldFromUv(lerp(x0, x1, t), z1, bounds);
    }
    const t = (level - v00) / ((v01 - v00) || 1);
    return worldFromUv(x0, lerp(z0, z1, t), bounds);
  }

  for (const level of levels) {
    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const v00 = values[row][col];
        const v10 = values[row][col + 1];
        const v11 = values[row + 1][col + 1];
        const v01 = values[row + 1][col];
        const crossings = [];
        if ((v00 < level) !== (v10 < level)) crossings.push(0);
        if ((v10 < level) !== (v11 < level)) crossings.push(1);
        if ((v01 < level) !== (v11 < level)) crossings.push(2);
        if ((v00 < level) !== (v01 < level)) crossings.push(3);
        if (crossings.length < 2) continue;
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          const a = pointOnEdge(col, row, crossings[i], level);
          const b = pointOnEdge(col, row, crossings[i + 1], level);
          segments.push(a.x, bounds.y + 0.045, a.z, b.x, bounds.y + 0.045, b.z);
        }
      }
    }
  }
  return segments;
}

function applyTextureToMesh(mesh, texture) {
  const old = mesh.material.map;
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
  if (old) old.dispose();
}

function createFieldPatch(bounds, texture) {
  const width = bounds.xMax - bounds.xMin;
  const length = bounds.zMax - bounds.zMin;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length, 64, Math.max(64, bounds.rows ?? 112)),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  );
  mesh.name = `roof-field-cloud-surface-${bounds.id}`;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((bounds.xMin + bounds.xMax) / 2, bounds.y, (bounds.zMin + bounds.zMax) / 2);
  mesh.renderOrder = 18;

  const contour = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: 0xcaf7ff,
      transparent: true,
      opacity: 0.20,
      depthWrite: false,
    }),
  );
  contour.name = `roof-field-contour-lines-${bounds.id}`;
  contour.renderOrder = 19;

  return { bounds, mesh, contour };
}

export function createRoofFieldCloud() {
  const group = new THREE.Group();
  group.name = 'roof-engineering-field-cloud';
  group.userData.roofFieldCloud = true;

  const state = { stageId: 'normalMonitor', mode: 'risk', time: 0, lastTextureAt: -Infinity };
  group.userData.state = state;

  const patches = FIELD_PATCHES.map((bounds) => {
    const { canvas, max } = createFieldTexture(state, bounds);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const patch = createFieldPatch(bounds, texture);
    patch.max = max;
    group.add(patch.mesh);
    group.add(patch.contour);
    return patch;
  });

  const marker = new THREE.Group();
  marker.name = 'roof-field-max-marker';
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.28, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  marker.add(ring);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2a1, transparent: true, opacity: 0.78 }),
  );
  dot.position.y = 0.04;
  marker.add(dot);
  const label = createLabelSprite('MAX');
  label.position.set(0, 0.58, 0);
  label.scale.set(1.28, 0.34, 1);
  marker.add(label);
  const leader = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0, 0.42, 0),
    ]),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
  );
  leader.name = 'roof-field-max-leader';
  leader.renderOrder = 22;
  marker.add(leader);
  group.add(marker);

  const title = createLabelSprite('综合风险场 · 0-100', '#c9f8ff');
  title.name = 'roof-field-title-label';
  title.position.set(...FIELD_PATCHES[0].titlePosition);
  title.visible = false;
  group.add(title);

  group.userData.parts = { patches, marker, ring, label, leader, title };
  group.userData.max = patches.reduce((best, patch) => (patch.max.value > best.value ? patch.max : best), patches[0].max);
  updateRoofFieldCloud(group, 'normalMonitor', 'risk', 0, true);
  return group;
}

export function updateRoofFieldCloud(group, stageId = 'normalMonitor', mode = null, time = 0, force = false) {
  if (!group?.userData?.roofFieldCloud) return;
  const state = group.userData.state;
  if (mode && FIELD_MODES.includes(mode)) state.mode = mode;
  state.stageId = stageId ?? 'normalMonitor';
  state.time = time;

  const shouldRefreshTexture = force
    || state.stageId !== state.lastStageId
    || state.mode !== state.lastMode
    || force;
  if (!shouldRefreshTexture) return;

  const { patches, marker, label, title } = group.userData.parts;
  let max = { value: -Infinity, x: 0, z: 0, y: FIELD_BOUNDS.y };
  for (const patch of patches) {
    const visibleInStage = !isFaceStage(state.stageId) || patch.bounds.id === 'face-exit';
    patch.mesh.visible = visibleInStage;
    patch.contour.visible = visibleInStage;
    if (!visibleInStage) continue;
    const { canvas, max: patchMax } = createFieldTexture(state, patch.bounds);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    applyTextureToMesh(patch.mesh, texture);
    patch.mesh.material.opacity = patchOpacityForState(state.stageId, state.mode);
    patch.mesh.material.depthTest = state.mode !== 'risk';

    const contourOpacity = contourOpacityForState(state.stageId, state.mode);
    const contourSegments = contourOpacity > 0 ? buildContourSegments(state, patch.bounds) : [];
    patch.contour.geometry.dispose();
    patch.contour.geometry = new THREE.BufferGeometry();
    patch.contour.geometry.setAttribute('position', new THREE.Float32BufferAttribute(contourSegments, 3));
    patch.contour.material.opacity = contourOpacity;

    patch.max = { ...patchMax, y: patch.bounds.y, patchId: patch.bounds.id };
    if (visibleInStage && patch.max.value > max.value) max = patch.max;
  }

  marker.position.set(max.x, max.y + 0.08, max.z);
  marker.userData.baseY = marker.position.y;
  const meta = MODE_META[state.mode];
  const valueText = state.mode === 'risk'
    ? `${Math.round(max.value)}`
    : `${max.value.toFixed(state.mode === 'stress' ? 1 : 0)} ${meta.unit}`;
  refreshLabelSprite(label, `峰值 ${valueText}`, normalizeValue(max.value, state.mode) > 0.72 ? '#ffd6c2' : '#e9fbff');
  refreshLabelSprite(title, `${MODE_DISPLAY_TITLE[state.mode] ?? meta.title} · ${meta.min}-${meta.max}${state.mode === 'risk' ? '' : meta.unit}`, '#c9f8ff');

  const titlePatch = state.stageId === 'supportResistanceAlarm'
    || state.stageId === 'roofFallWarning'
    || state.stageId === 'emergencyResponse'
    ? FIELD_PATCHES.find(patch => patch.id === 'face-exit')
    : FIELD_PATCHES[0];
  title.position.set(...titlePatch.titlePosition);
  title.visible = false;

  state.lastStageId = state.stageId;
  state.lastMode = state.mode;
  state.lastTextureAt = time;
  group.userData.max = max;
}

export function animateRoofFieldCloud(group, time) {
  if (!group?.userData?.roofFieldCloud) return;
  const { marker, ring } = group.userData.parts;
  marker.position.y = marker.userData.baseY ?? FIELD_BOUNDS.y + 0.05;
  ring.material.opacity = 0.26 + Math.sin(time * 1.8) * 0.06;
  const stage = group.userData.state.stageId;
  updateRoofFieldCloud(group, stage, null, time, false);
}

export function setRoofFieldCloudMode(group, mode) {
  if (!FIELD_MODES.includes(mode)) return false;
  updateRoofFieldCloud(group, group.userData.state.stageId, mode, performance.now() * 0.001, true);
  return true;
}

export function getRoofFieldCloudMode(group) {
  return group?.userData?.state?.mode ?? 'risk';
}
