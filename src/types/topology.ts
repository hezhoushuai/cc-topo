export type DeviceType =
  | 'workstation'
  | 'switch'
  | 'router'
  | 'server'
  | 'ap'
  | 'laptop'
  | 'phone'
  | 'tablet'
  | 'printer'
  | 'nas'
  | 'firewall';

export type LinkKind = 'wired' | 'wireless';

export type DeviceStatus = 'online' | 'warning' | 'offline';

export interface BaseDevice {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  status?: DeviceStatus;
  isChild?: boolean;
  unreachable?: boolean;
}

export interface BranchDevice extends BaseDevice {}

export interface Branch {
  id: string;
  kind: LinkKind;
  side?: 'left' | 'right';
  hub: BaseDevice;
  children: BranchDevice[];
}

export interface Topology {
  center: BaseDevice;
  branches: Branch[];
}

export interface SelectableDevice extends BaseDevice {
  description: string;
}

export interface DeviceMetrics {
  cpu: number;
  mem: number;
  disk: number;
}

export type NodeRole = 'center' | 'hub' | 'leaf';

export interface NodeData {
  device: BaseDevice;
  role: NodeRole;
  activePorts?: string[];
  togglePorts?: TogglePortInfo[];
  portCount?: { left: number; right: number };
  portConnections?: Record<string, number>;
}

export interface TogglePortInfo {
  portId: string;
  collapsed: boolean;
}

export interface EdgeData {
  kind: LinkKind;
  branchId?: string;
  expanded?: boolean;
  unreachable?: boolean;
}

export interface NicInfo {
  id: string;
  name: string;
  side: 'left' | 'right';
  index: number;
  mac: string;
  ip: string;
  netmask: string;
  gateway: string;
  kind: LinkKind;
}
