// ============================================================
// 拓扑 Mock 数据
//
// 数据源是 public/data/topology.json：
// - 开发环境通过 Vite dev server 直接 fetch
// - 构建后该 JSON 会原样拷贝到 dist/data/topology.json，可在部署后编辑
//
// 下面的 selectableDevices / devices / branches 是 module-level 引用，
// 初始为空，loadTopologyData() 调用后会就地填充。
// 任何在调用 fetch 之前完成的 import 都会持有这些"空容器"的引用，
// 调用时（运行时）会看到已加载的内容。
// ============================================================

export interface MockDevice {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: string;
  isChild?: boolean;
  unreachable?: boolean;
}

export interface MockBranch {
  id: string;
  rootId: string;
  kind: string;
  side: 'left' | 'right';
  position: number;
  hub: MockDevice;
  children: MockDevice[];
}

interface TopologyJson {
  selectableDevices: { id: string; description: string }[];
  devices: Record<string, MockDevice>;
  branches: MockBranch[];
}

// 这些容器会被 loadTopologyData() 就地填充
export const selectableDevices: { id: string; description: string }[] = [];
export const devices: Record<string, MockDevice> = {};
export const branches: MockBranch[] = [];

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadTopologyData(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const res = await fetch('/data/topology.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load topology.json: HTTP ${res.status}`);
    const data = (await res.json()) as TopologyJson;

    selectableDevices.length = 0;
    selectableDevices.push(...(data.selectableDevices ?? []));

    for (const k of Object.keys(devices)) delete devices[k];
    Object.assign(devices, data.devices ?? {});

    branches.length = 0;
    branches.push(...(data.branches ?? []));

    loaded = true;
  })();
  return loadingPromise;
}

export function isTopologyDataLoaded(): boolean {
  return loaded;
}
