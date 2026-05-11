// 数据来源：public/data/topology.json（通过 mock/mockData.ts 加载）
// 这里把 mock 的扁平结构（devices + branches）转成 UI 需要的
// 树形 Topology 结构，并组装 SelectableDevice。

import type {
  BaseDevice,
  Branch,
  BranchDevice,
  DeviceStatus,
  DeviceType,
  LinkKind,
  SelectableDevice,
  Topology,
} from '../types/topology';
import {
  branches as srcBranches,
  devices as srcDevices,
  selectableDevices as srcSelectable,
} from '../mock/mockData';

function toBaseDevice(d: {
  id: string; name: string; type: string; ip: string; status: string;
  isChild?: boolean; unreachable?: boolean;
}): BaseDevice {
  return {
    id: d.id,
    name: d.name,
    type: d.type as DeviceType,
    ip: d.ip,
    status: d.status as DeviceStatus,
    isChild: d.isChild,
    unreachable: d.unreachable,
  };
}

// 注意：导出为同一个数组引用，loadTopologyData() 调用后再调用
// refreshSelectableDevices() 就地填充。Vue 组件在 mount 之后访问，
// 因此能拿到完整数据。
export const selectableDevices: SelectableDevice[] = [];

export function refreshSelectableDevices(): void {
  selectableDevices.length = 0;
  for (const s of srcSelectable) {
    const base = srcDevices[s.id];
    if (!base) continue;
    selectableDevices.push({ ...toBaseDevice(base), description: s.description });
  }
}

export function getTopology(deviceId: string): Topology | undefined {
  const center = srcDevices[deviceId];
  if (!center) return undefined;
  const rootBranches: Branch[] = srcBranches
    .filter((b) => b.rootId === deviceId)
    .sort((a, b) => a.position - b.position)
    .map((b) => ({
      id: b.id,
      side: b.side,
      kind: b.kind as LinkKind,
      hub: toBaseDevice(b.hub),
      children: b.children.map((c) => toBaseDevice(c) as BranchDevice),
    }));
  return { center: toBaseDevice(center), branches: rootBranches };
}

export function collectAllDeviceIds(): string[] {
  const ids = new Set<string>(Object.keys(srcDevices));
  for (const b of srcBranches) {
    ids.add(b.hub.id);
    for (const c of b.children) ids.add(c.id);
  }
  for (const s of srcSelectable) ids.add(s.id);
  return Array.from(ids);
}
