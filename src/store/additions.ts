import { reactive } from 'vue';
import type { BaseDevice, LinkKind } from '../types/topology';

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
}

export function getAdditions(selectedRootId: string): DeviceAddition[] {
  return additionsBySelected[selectedRootId] ?? [];
}

export function removeDevice(selectedRootId: string, deviceId: string): void {
  const list = additionsBySelected[selectedRootId];
  if (!list) return;
  const idx = list.findIndex((a) => a.id === deviceId);
  if (idx !== -1) list.splice(idx, 1);
}

let counter = 1;
export function nextAdditionId(): string {
  return `add-${Date.now().toString(36)}-${counter++}`;
}
