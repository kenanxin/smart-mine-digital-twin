const freezePlacement = placement => Object.freeze({ ...placement });

export const UNDERGROUND_ASSET_DEPLOYMENTS = Object.freeze([
  { id: 'belt-1206', assetKey: 'conveyorKit', type: 'belt', zoneId: 'longwall', edgeId: 'intake-gate-road', mileage: 0.34, targetLength: 28, floorOffset: 0.08 },
  { id: 'loco-h3', assetKey: 'locomotive', type: 'rail', zoneId: 'mainHaulage', edgeId: 'main-level-h3', mileage: 0.24, targetLength: 6.4, floorOffset: 0.1 },
].map(freezePlacement));
