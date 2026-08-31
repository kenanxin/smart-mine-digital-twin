import { ROADWAY_NODES, sampleEdge } from './topology.mjs';

const nodeById = new Map(ROADWAY_NODES.map(node => [node.id, node]));
export const OVERVIEW_LABEL_LIMIT = 4;

const OVERVIEW_LABEL_IDS = Object.freeze([
  'CAM-01', 'JT-01', 'JT-02', 'SR-01',
]);

export const WORKING_FACE_LABEL_IDS = new Set([
  'RP-02',
  'RP-04',
  'SR-01',
  'EQ-STATE-01',
]);

export const UNDERGROUND_LABEL_IDS = new Set([
  'CH-01', 'CH-02',
]);

export function getOverviewLabelIds(anchors) {
  const anchorIds = new Set(anchors.map(anchor => anchor.id));
  return OVERVIEW_LABEL_IDS.filter(id => anchorIds.has(id)).slice(0, OVERVIEW_LABEL_LIMIT);
}

function sensorOnEdge(id, type, edgeId, mileage, unit, warn, danger) {
  const position = sampleEdge(edgeId, mileage);
  position[1] += 3.7;
  return { id, category: 'roof-sensor', type, edgeId, position, unit, warn, danger };
}

function sensorAtNode(id, type, nodeId, unit, warn, danger) {
  const position = [...nodeById.get(nodeId).position];
  position[1] += 3.7;
  return { id, category: 'roof-sensor', type, nodeId, position, unit, warn, danger };
}

function registryAnchor(id, category, type, nodeId, offset = [0, 2.4, 0]) {
  const node = nodeById.get(nodeId);
  return {
    id, category, type, nodeId,
    position: node.position.map((value, axis) => value + offset[axis]),
    unit: category === 'camera' ? 'stream' : category === 'person' ? 'presence' : 'state',
    warn: null,
    danger: null,
  };
}

export function buildMonitorAnchors() {
  return [
    sensorOnEdge('RP-01', 'roof-pressure', 'intake-gate-road', 0.2, 'MPa', 22, 28),
    sensorOnEdge('RP-02', 'roof-pressure', 'intake-gate-road', 0.62, 'MPa', 22, 28),
    sensorOnEdge('RP-03', 'roof-pressure', 'return-gate-road', 0.3, 'MPa', 22, 28),
    sensorOnEdge('RP-04', 'roof-pressure', 'return-gate-road', 0.72, 'MPa', 22, 28),
    sensorOnEdge('DS-01', 'roof-separation', 'main-level-h3', 0.25, 'mm', 18, 28),
    sensorOnEdge('DS-02', 'roof-separation', 'lower-gate-crosscut', 0.55, 'mm', 18, 28),
    sensorOnEdge('CV-01', 'convergence', 'main-incline-h2', 0.5, 'mm', 20, 32),
    sensorOnEdge('CV-02', 'convergence', 'main-incline-h3', 0.5, 'mm', 20, 32),
    sensorOnEdge('MS-01', 'microseismic', 'return-airway', 0.35, 'J', 650, 1100),
    sensorAtNode('SR-01', 'support-load', 'working-face-1206', 'kN', 9800, 11200),
    sensorAtNode('JT-01', 'junction-stress', 'h1-junction', 'MPa', 21, 27),
    sensorAtNode('JT-02', 'junction-stress', 'h2-junction', 'MPa', 21, 27),
    sensorAtNode('JT-03', 'junction-stress', 'h3-junction', 'MPa', 21, 27),
    sensorAtNode('CH-01', 'chamber-pressure', 'pump-chamber', 'MPa', 20, 26),
    sensorAtNode('CH-02', 'chamber-pressure', 'substation-chamber', 'MPa', 20, 26),
    registryAnchor('CAM-01', 'camera', 'camera', 'portal'),
    registryAnchor('CAM-02', 'camera', 'camera', 'h2-junction'),
    registryAnchor('CAM-03', 'camera', 'camera', 'h3-junction'),
    registryAnchor('CAM-04', 'camera', 'camera', 'working-face-1206'),
    registryAnchor('PER-01', 'person', 'person', 'h1-junction', [1.2, 0, 0]),
    registryAnchor('PER-02', 'person', 'person', 'substation-chamber', [-1.2, 0, 0]),
    registryAnchor('PER-03', 'person', 'person', 'working-face-1206', [4, 0, 8]),
    registryAnchor('EQ-STATE-01', 'equipment-status', 'equipment', 'working-face-1206'),
    registryAnchor('EQ-STATE-02', 'equipment-status', 'equipment', 'pump-chamber'),
    registryAnchor('EQ-STATE-03', 'equipment-status', 'equipment', 'substation-chamber'),
  ];
}
