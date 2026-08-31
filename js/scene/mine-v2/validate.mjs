import { MINE_V2_CONFIG } from './config.mjs';

export function validateTopology(nodes, edges) {
  const errors = [];
  const nodeIds = new Set();
  const edgeIds = new Set();

  for (const node of nodes) {
    if (!node?.id) errors.push('Node is missing an id');
    else if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    else nodeIds.add(node.id);
    if (!Array.isArray(node?.position) || node.position.length !== 3) {
      errors.push(`Node ${node?.id ?? '<unknown>'} has an invalid position`);
    }
  }

  const adjacency = new Map([...nodeIds].map(id => [id, []]));
  for (const edge of edges) {
    if (!edge?.id) errors.push('Edge is missing an id');
    else if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}`);
    else edgeIds.add(edge.id);

    if (!nodeIds.has(edge.from)) errors.push(`Edge ${edge.id} references missing node ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge ${edge.id} references missing node ${edge.to}`);
    if (edge.points && edge.points.length < 2) errors.push(`Edge ${edge.id} needs at least two points`);
    if (edge.width < MINE_V2_CONFIG.roadway.minWidth || edge.width > MINE_V2_CONFIG.roadway.maxWidth) {
      errors.push(`Edge ${edge.id} width ${edge.width} is outside the approved range`);
    }
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to);
      adjacency.get(edge.to).push(edge.from);
    }
  }

  const visited = new Set();
  const queue = nodeIds.has('portal') ? ['portal'] : [];
  if (!queue.length) errors.push('Topology is missing portal');
  while (queue.length) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const connectedId of adjacency.get(nodeId) ?? []) {
      if (!visited.has(connectedId)) queue.push(connectedId);
    }
  }

  return {
    errors,
    unreachableNodeIds: [...nodeIds].filter(id => !visited.has(id)),
  };
}
