import { reactive } from 'vue';
import type { BaseDevice, LinkKind } from '../types/topology';
import { postAddition as apiPostAddition, deleteAddition as apiDeleteAddition } from '../api/index';

export interface DeviceAddition {
  id: string;
  parentDeviceId: string;
  parentNicId: string;
  device: BaseDevice;
  kind: LinkKind;
}

const additionsBySelected = reactive<Record<string, DeviceAddition[]>>({});

export function addDevice(selectedRootId: string, addition: DeviceAddition): void {
  if (!additionsBySelected[selectedRootId]) {
    additionsBySelected[selectedRootId] = [];
  }
  additionsBySelected[selectedRootId].push(addition);
  // Persist to backend (fire-and-forget, non-blocking)
  apiPostAddition(selectedRootId, addition).catch((err) => {
    console.warn('[additions] Failed to persist addition:', err);
  });
}

export function getAdditions(selectedRootId: string): DeviceAddition[] {
  return additionsBySelected[selectedRootId] ?? [];
}

export function removeDevice(selectedRootId: string, deviceId: string): void {
  const list = additionsBySelected[selectedRootId];
  if (!list) return;
  const idx = list.findIndex((a) => a.id === deviceId);
  if (idx !== -1) {
    list.splice(idx, 1);
    // Persist removal to backend
    apiDeleteAddition(selectedRootId, deviceId).catch((err) => {
      console.warn('[additions] Failed to delete addition:', err);
    });
  }
}

export function initAdditions(rootId: string, additions: DeviceAddition[]): void {
  additionsBySelected[rootId] = [...additions];
}

let counter = 1;
export function nextAdditionId(): string {
  return `add-${Date.now().toString(36)}-${counter++}`;
}
