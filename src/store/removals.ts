import { reactive } from 'vue';

const removedByRoot = reactive<Record<string, Set<string>>>({});

export function removeStaticDevice(rootId: string, deviceId: string): void {
  if (!removedByRoot[rootId]) removedByRoot[rootId] = reactive(new Set<string>());
  removedByRoot[rootId].add(deviceId);
}

export function isRemovedDevice(rootId: string, deviceId: string): boolean {
  return removedByRoot[rootId]?.has(deviceId) ?? false;
}
