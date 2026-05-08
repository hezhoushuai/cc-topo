import type { SelectableDevice, Topology } from '../types/topology';

export const selectableDevices: SelectableDevice[] = [
  {
    id: 'pc-fin-01',
    name: 'DESKTOP-FIN-01',
    type: 'workstation',
    ip: '10.10.20.101',
    status: 'online',
    description: '财务部 · 工位 3F-A12',
  },
  {
    id: 'srv-web-prod-01',
    name: 'SRV-WEB-PROD-01',
    type: 'server',
    ip: '10.20.0.11',
    status: 'online',
    description: '生产环境 · 主 Web 节点',
  },
  {
    id: 'pc-rd-22',
    name: 'LAPTOP-RD-22',
    type: 'laptop',
    ip: '10.10.40.88',
    status: 'offline',
    description: '研发部 · 移动办公（离线）',
  },
  {
    id: 'srv-db-master',
    name: 'SRV-DB-MASTER',
    type: 'server',
    ip: '10.20.0.31',
    status: 'online',
    description: '核心数据库 · 主节点',
  },
  {
    id: 'pc-hr-09',
    name: 'WORKSTATION-HR-09',
    type: 'workstation',
    ip: '10.10.30.42',
    status: 'online',
    description: '人事部 · 工位 2F-B07',
  },
  {
    id: 'pad-mgr-02',
    name: 'TABLET-MGR-02',
    type: 'tablet',
    ip: '10.10.60.18',
    status: 'online',
    description: '管理层 · 移动设备',
  },
];

const topologies: Record<string, Topology> = {
  'pc-fin-01': {
    center: {
      id: 'pc-fin-01',
      name: 'DESKTOP-FIN-01',
      type: 'workstation',
      ip: '10.10.20.101',
      status: 'online',
    },
    branches: [
      {
        id: 'b-fin-core',
        kind: 'wired',
        hub: {
          id: 'sw-core-01',
          name: 'SW-CORE-01',
          type: 'switch',
          ip: '10.0.0.1',
          status: 'online',
        },
        children: [
          { id: 'srv-fin-db', name: 'SRV-FIN-DB', type: 'server', ip: '10.20.0.21', status: 'online', isChild: true },
          { id: 'srv-erp-app', name: 'SRV-ERP-APP', type: 'server', ip: '10.20.0.22', status: 'online', isChild: true },
          { id: 'nas-finance', name: 'NAS-FINANCE', type: 'nas', ip: '10.20.10.5', status: 'online', isChild: true },
          { id: 'srv-file-02', name: 'SRV-FILE-02', type: 'server', ip: '10.20.0.23', status: 'warning', isChild: true, unreachable: true },
        ],
      },
      {
        id: 'b-fin-floor',
        kind: 'wired',
        hub: {
          id: 'sw-floor-3f',
          name: 'SW-FLOOR-3F',
          type: 'switch',
          ip: '10.0.3.1',
          status: 'online',
        },
        children: [
          { id: 'pc-hr-09', name: 'WORKSTATION-HR-09', type: 'workstation', ip: '10.10.30.42', status: 'online' },
          { id: 'printer-3f', name: 'PRINTER-HP-3F', type: 'printer', ip: '10.10.30.250', status: 'online' },
        ],
      },
      {
        id: 'b-fin-wifi',
        kind: 'wireless',
        hub: {
          id: 'ap-3f-north',
          name: 'AP-3F-NORTH',
          type: 'ap',
          ip: '10.0.3.50',
          status: 'online',
        },
        children: [
          { id: 'laptop-mgr-08', name: 'LAPTOP-MGR-08', type: 'laptop', ip: '10.10.60.12', status: 'online', isChild: true },
          { id: 'pad-mgr-02', name: 'TABLET-MGR-02', type: 'tablet', ip: '10.10.60.18', status: 'online', isChild: true },
          { id: 'phone-fin-01', name: 'PHONE-FIN-01', type: 'phone', ip: '10.10.60.31', status: 'online', isChild: true, unreachable: true },
        ],
      },
    ],
  },

  'srv-web-prod-01': {
    center: {
      id: 'srv-web-prod-01',
      name: 'SRV-WEB-PROD-01',
      type: 'server',
      ip: '10.20.0.11',
      status: 'online',
    },
    branches: [
      {
        id: 'b-web-dc',
        kind: 'wired',
        hub: {
          id: 'sw-dc-core-a',
          name: 'SW-DC-CORE-A',
          type: 'switch',
          ip: '10.20.0.254',
          status: 'online',
        },
        children: [
          { id: 'srv-db-master', name: 'SRV-DB-MASTER', type: 'server', ip: '10.20.0.31', status: 'online', isChild: true },
          { id: 'srv-cache-redis', name: 'SRV-CACHE-REDIS', type: 'server', ip: '10.20.0.41', status: 'online', isChild: true },
          { id: 'lb-nginx-01', name: 'LB-NGINX-01', type: 'router', ip: '10.20.0.5', status: 'online', isChild: true },
          { id: 'srv-mq-kafka', name: 'SRV-MQ-KAFKA', type: 'server', ip: '10.20.0.51', status: 'warning', isChild: true, unreachable: true },
        ],
      },
      {
        id: 'b-web-edge',
        kind: 'wired',
        hub: {
          id: 'fw-edge-01',
          name: 'FW-EDGE-01',
          type: 'firewall',
          ip: '10.0.0.254',
          status: 'online',
        },
        children: [
          { id: 'router-isp-1', name: 'ROUTER-ISP-1', type: 'router', ip: '10.0.0.253', status: 'online' },
          { id: 'router-isp-2', name: 'ROUTER-ISP-2', type: 'router', ip: '10.0.0.252', status: 'online' },
        ],
      },
    ],
  },

  'pc-rd-22': {
    center: {
      id: 'pc-rd-22',
      name: 'LAPTOP-RD-22',
      type: 'laptop',
      ip: '10.10.40.88',
      status: 'offline',
    },
    branches: [
      {
        id: 'b-rd-wifi',
        kind: 'wireless',
        hub: {
          id: 'ap-4f-east',
          name: 'AP-4F-EAST',
          type: 'ap',
          ip: '10.0.4.51',
          status: 'online',
        },
        children: [
          { id: 'laptop-rd-15', name: 'LAPTOP-RD-15', type: 'laptop', ip: '10.10.40.71', status: 'online' },
          { id: 'phone-rd-22', name: 'PHONE-RD-22', type: 'phone', ip: '10.10.40.131', status: 'online' },
          { id: 'pad-design-01', name: 'TABLET-DESIGN-01', type: 'tablet', ip: '10.10.40.140', status: 'offline' },
        ],
      },
      {
        id: 'b-rd-dock',
        kind: 'wired',
        hub: {
          id: 'sw-dock-rd',
          name: 'SW-DOCK-RD',
          type: 'switch',
          ip: '10.0.4.1',
          status: 'online',
        },
        children: [
          { id: 'srv-build-01', name: 'SRV-BUILD-01', type: 'server', ip: '10.20.5.11', status: 'online' },
          { id: 'srv-git-lab', name: 'SRV-GIT-LAB', type: 'server', ip: '10.20.5.12', status: 'online' },
          { id: 'nas-code', name: 'NAS-CODE', type: 'nas', ip: '10.20.5.20', status: 'online' },
        ],
      },
    ],
  },

  'srv-db-master': {
    center: {
      id: 'srv-db-master',
      name: 'SRV-DB-MASTER',
      type: 'server',
      ip: '10.20.0.31',
      status: 'online',
    },
    branches: [
      {
        id: 'b-db-core',
        kind: 'wired',
        hub: {
          id: 'sw-dc-core-a',
          name: 'SW-DC-CORE-A',
          type: 'switch',
          ip: '10.20.0.254',
          status: 'online',
        },
        children: [
          { id: 'srv-web-prod-01', name: 'SRV-WEB-PROD-01', type: 'server', ip: '10.20.0.11', status: 'online' },
          { id: 'srv-web-prod-02', name: 'SRV-WEB-PROD-02', type: 'server', ip: '10.20.0.12', status: 'online' },
          { id: 'srv-db-slave', name: 'SRV-DB-SLAVE', type: 'server', ip: '10.20.0.32', status: 'online' },
          { id: 'srv-backup-01', name: 'SRV-BACKUP-01', type: 'server', ip: '10.20.0.61', status: 'warning' },
        ],
      },
      {
        id: 'b-db-storage',
        kind: 'wired',
        hub: {
          id: 'sw-storage',
          name: 'SW-STORAGE',
          type: 'switch',
          ip: '10.20.10.1',
          status: 'online',
        },
        children: [
          { id: 'nas-prod-01', name: 'NAS-PROD-01', type: 'nas', ip: '10.20.10.11', status: 'online' },
          { id: 'nas-prod-02', name: 'NAS-PROD-02', type: 'nas', ip: '10.20.10.12', status: 'online' },
        ],
      },
    ],
  },

  'pc-hr-09': {
    center: {
      id: 'pc-hr-09',
      name: 'WORKSTATION-HR-09',
      type: 'workstation',
      ip: '10.10.30.42',
      status: 'online',
    },
    branches: [
      {
        id: 'b-hr-floor',
        kind: 'wired',
        hub: {
          id: 'sw-floor-2f',
          name: 'SW-FLOOR-2F',
          type: 'switch',
          ip: '10.0.2.1',
          status: 'online',
        },
        children: [
          { id: 'pc-hr-10', name: 'WORKSTATION-HR-10', type: 'workstation', ip: '10.10.30.43', status: 'online' },
          { id: 'pc-hr-11', name: 'WORKSTATION-HR-11', type: 'workstation', ip: '10.10.30.44', status: 'online' },
          { id: 'printer-2f', name: 'PRINTER-HP-2F', type: 'printer', ip: '10.10.30.249', status: 'online' },
        ],
      },
      {
        id: 'b-hr-wifi',
        kind: 'wireless',
        hub: {
          id: 'ap-2f-south',
          name: 'AP-2F-SOUTH',
          type: 'ap',
          ip: '10.0.2.50',
          status: 'online',
        },
        children: [
          { id: 'phone-hr-09', name: 'PHONE-HR-09', type: 'phone', ip: '10.10.60.42', status: 'online' },
        ],
      },
    ],
  },

  'pad-mgr-02': {
    center: {
      id: 'pad-mgr-02',
      name: 'TABLET-MGR-02',
      type: 'tablet',
      ip: '10.10.60.18',
      status: 'online',
    },
    branches: [
      {
        id: 'b-pad-wifi',
        kind: 'wireless',
        hub: {
          id: 'ap-3f-north',
          name: 'AP-3F-NORTH',
          type: 'ap',
          ip: '10.0.3.50',
          status: 'online',
        },
        children: [
          { id: 'pc-fin-01', name: 'DESKTOP-FIN-01', type: 'workstation', ip: '10.10.20.101', status: 'online' },
          { id: 'laptop-mgr-08', name: 'LAPTOP-MGR-08', type: 'laptop', ip: '10.10.60.12', status: 'online' },
          { id: 'phone-fin-01', name: 'PHONE-FIN-01', type: 'phone', ip: '10.10.60.31', status: 'online' },
        ],
      },
    ],
  },
};

export function getTopology(deviceId: string): Topology | undefined {
  return topologies[deviceId];
}

export function collectAllDeviceIds(): string[] {
  const ids = new Set<string>();
  for (const t of Object.values(topologies)) {
    ids.add(t.center.id);
    for (const b of t.branches) {
      ids.add(b.hub.id);
      for (const c of b.children) ids.add(c.id);
    }
  }
  for (const d of selectableDevices) ids.add(d.id);
  return Array.from(ids);
}
