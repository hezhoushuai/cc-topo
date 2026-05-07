import { reactive } from 'vue';

const activeNics = reactive(new Set<string>());

function key(deviceId: string, nicId: string): string {
  return `${deviceId}::${nicId}`;
}

export function isNicActive(deviceId: string, nicId: string): boolean {
  return activeNics.has(key(deviceId, nicId));
}

export function setActiveNics(keys: Iterable<string>): void {
  activeNics.clear();
  for (const k of keys) activeNics.add(k);
}
