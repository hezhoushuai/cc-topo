// 设备类型定义来源：public/data/device-types.json
// 构建后 dist/data/device-types.json 可直接编辑，刷新生效。
//
// 这里维护若干 module-level 容器（Record/Array），loadDeviceTypes() 调用后
// 就地填充。下游模块 import 后持有同一引用，运行时能读到最新数据。

import type { LinkKind } from '../types/topology';

export interface DeviceTypeDef {
  id: string;
  label: string;
  icon: string;
  color: [number, number, number];
  ports: { left: number; right: number };
  capacity: { cpuCores: number; memMB: number; diskGB: number };
  namePrefix: string;
  kindLeft: LinkKind;
  kindRight: LinkKind;
}

interface DeviceTypesJson {
  types: DeviceTypeDef[];
}

const DEFAULT_TYPE: DeviceTypeDef = {
  id: '_unknown',
  label: '设备',
  icon: '❓',
  color: [148, 163, 184],
  ports: { left: 1, right: 1 },
  capacity: { cpuCores: 1, memMB: 1024, diskGB: 8 },
  namePrefix: 'DEV-NEW',
  kindLeft: 'wired',
  kindRight: 'wired',
};

// 就地维护的容器（供其它模块复用同一引用）
export const deviceTypeList: DeviceTypeDef[] = [];
export const deviceTypeById: Record<string, DeviceTypeDef> = {};

export function getTypeDef(id: string): DeviceTypeDef {
  return deviceTypeById[id] ?? DEFAULT_TYPE;
}

export function getTypeIcon(id: string): string {
  return getTypeDef(id).icon;
}

export function getTypeLabel(id: string): string {
  return getTypeDef(id).label;
}

export function getNamePrefix(id: string): string {
  return getTypeDef(id).namePrefix;
}

export function deriveNicKind(type: string, side: 'left' | 'right'): LinkKind {
  const def = getTypeDef(type);
  return side === 'left' ? def.kindLeft : def.kindRight;
}

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadDeviceTypes(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const res = await fetch('/data/device-types.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load device-types.json: HTTP ${res.status}`);
    const data = (await res.json()) as DeviceTypesJson;

    deviceTypeList.length = 0;
    deviceTypeList.push(...(data.types ?? []));

    for (const k of Object.keys(deviceTypeById)) delete deviceTypeById[k];
    for (const t of deviceTypeList) deviceTypeById[t.id] = t;

    loaded = true;
  })();
  return loadingPromise;
}
