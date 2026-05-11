import { reactive } from 'vue';
import { postRemoval as apiPostRemoval, deleteRemoval as apiDeleteRemoval } from '../api/index';

const removedByRoot = reactive<Record<string, Set<string>>>({});

export function removeStaticDevice(rootId: string, deviceId: string): void {
  if (!removedByRoot[rootId]) removedByRoot[rootId] = reactive(new Set<string>());
  removedByRoot[rootId].add(deviceId);
  // Persist to backend
  apiPostRemoval(rootId, deviceId).catch((err) => {
    console.warn('[removals] Failed to persist removal:', err);
  });
}

export function restoreStaticDevice(rootId: string, deviceId: string): void {
  removedByRoot[rootId]?.delete(deviceId);
  apiDeleteRemoval(rootId, deviceId).catch((err) => {
    console.warn('[removals] Failed to delete removal:', err);
  });
}

export function isRemovedDevice(rootId: string, deviceId: string): boolean {
  return removedByRoot[rootId]?.has(deviceId) ?? false;
}

export function initRemovals(rootId: string, deviceIds: string[]): void {
  removedByRoot[rootId] = reactive(new Set<string>(deviceIds));
}
