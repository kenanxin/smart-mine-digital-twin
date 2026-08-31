import * as THREE from 'three';

export function createSceneAdapter(runtime) {
  return {
    setViewMode(mode) {
      runtime.setViewMode?.(mode);
    },
    getRole(role) {
      return runtime.objectsByRole.get(role) ?? null;
    },
    getWorldPosition(role, target = new THREE.Vector3()) {
      const object = runtime.objectsByRole.get(role);
      if (!object) return null;
      object.updateWorldMatrix(true, false);
      return object.getWorldPosition(target);
    },
    getObject(role) {
      return runtime.objectsByRole.get(role) ?? null;
    },
    getObjectMeta(role) {
      return runtime.objectsByRole.get(role)?.userData?.focusMeta ?? null;
    },
    hasRole(role) {
      return runtime.objectsByRole.has(role);
    },
    getZonePreset(id) {
      return runtime.zonePresets?.[id] ?? null;
    },
    focusZone(id) {
      const preset = runtime.zonePresets?.[id] ?? null;
      if (!preset) return null;
      runtime.requestCameraFocus?.(preset);
      return preset;
    },
  };
}
