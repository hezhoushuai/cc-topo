// ============================================================
// 拓扑 Mock 数据
// 修改此文件可调整所有拓扑显示内容
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

// ------ 可选设备列表（左侧下拉选择） ------
export const selectableDevices: { id: string; description: string }[] = [
  { id: 'pc-fin-01',       description: '财务部 · 工位 3F-A12' },
  { id: 'srv-web-prod-01', description: '生产环境 · 主 Web 节点' },
  { id: 'pc-rd-22',        description: '研发部 · 移动办公（离线）' },
  { id: 'srv-db-master',   description: '核心数据库 · 主节点' },
  { id: 'pc-hr-09',        description: '人事部 · 工位 2F-B07' },
  { id: 'pad-mgr-02',      description: '管理层 · 移动设备' },
];

// ------ 所有设备基础信息 ------
export const devices: Record<string, MockDevice> = {
  'pc-fin-01':       { id: 'pc-fin-01',       name: 'DESKTOP-FIN-01',      type: 'workstation', ip: '10.10.20.101', status: 'online'  },
  'srv-web-prod-01': { id: 'srv-web-prod-01', name: 'SRV-WEB-PROD-01',     type: 'server',      ip: '10.20.0.11',  status: 'online'  },
  'pc-rd-22':        { id: 'pc-rd-22',        name: 'LAPTOP-RD-22',        type: 'laptop',      ip: '10.10.40.88', status: 'offline' },
  'srv-db-master':   { id: 'srv-db-master',   name: 'SRV-DB-MASTER',       type: 'server',      ip: '10.20.0.31',  status: 'online'  },
  'pc-hr-09':        { id: 'pc-hr-09',        name: 'WORKSTATION-HR-09',   type: 'workstation', ip: '10.10.30.42', status: 'online'  },
  'pad-mgr-02':      { id: 'pad-mgr-02',      name: 'TABLET-MGR-02',       type: 'tablet',      ip: '10.10.60.18', status: 'online'  },
  'rt-campus-gw':    { id: 'rt-campus-gw',    name: 'RT-CAMPUS-GW',        type: 'router',      ip: '10.0.0.254',  status: 'online'  },
  'sw-core-01':      { id: 'sw-core-01',      name: 'SW-CORE-01',          type: 'switch',      ip: '10.0.0.1',    status: 'online'  },
  'srv-fin-db':      { id: 'srv-fin-db',      name: 'SRV-FIN-DB',          type: 'server',      ip: '10.20.0.21',  status: 'online',   isChild: true },
  'srv-erp-app':     { id: 'srv-erp-app',     name: 'SRV-ERP-APP',         type: 'server',      ip: '10.20.0.22',  status: 'online',   isChild: true },
  'nas-finance':     { id: 'nas-finance',     name: 'NAS-FINANCE',         type: 'nas',         ip: '10.20.10.5',  status: 'online',   isChild: true },
  'srv-file-02':     { id: 'srv-file-02',     name: 'SRV-FILE-02',         type: 'server',      ip: '10.20.0.23',  status: 'warning',  isChild: true, unreachable: true },
  'sw-floor-3f':     { id: 'sw-floor-3f',     name: 'SW-FLOOR-3F',         type: 'switch',      ip: '10.0.3.1',    status: 'online'  },
  'printer-3f':      { id: 'printer-3f',      name: 'PRINTER-HP-3F',       type: 'printer',     ip: '10.10.30.250',status: 'online'  },
  'ap-3f-north':     { id: 'ap-3f-north',     name: 'AP-3F-NORTH',         type: 'ap',          ip: '10.0.3.50',   status: 'online'  },
  'laptop-mgr-08':   { id: 'laptop-mgr-08',   name: 'LAPTOP-MGR-08',       type: 'laptop',      ip: '10.10.60.12', status: 'warning',  isChild: true, unreachable: true },
  'phone-fin-01':    { id: 'phone-fin-01',     name: 'PHONE-FIN-01',        type: 'phone',       ip: '10.10.60.31', status: 'warning',  isChild: true, unreachable: true },
  'sw-dc-core-a':    { id: 'sw-dc-core-a',    name: 'SW-DC-CORE-A',        type: 'switch',      ip: '10.20.0.254', status: 'online'  },
  'srv-cache-redis': { id: 'srv-cache-redis', name: 'SRV-CACHE-REDIS',     type: 'server',      ip: '10.20.0.41',  status: 'online',   isChild: true },
  'lb-nginx-01':     { id: 'lb-nginx-01',     name: 'LB-NGINX-01',         type: 'router',      ip: '10.20.0.5',   status: 'online',   isChild: true },
  'srv-mq-kafka':    { id: 'srv-mq-kafka',    name: 'SRV-MQ-KAFKA',        type: 'server',      ip: '10.20.0.51',  status: 'warning',  isChild: true, unreachable: true },
  'fw-edge-01':      { id: 'fw-edge-01',      name: 'FW-EDGE-01',          type: 'firewall',    ip: '10.0.0.254',  status: 'online'  },
  'router-isp-1':    { id: 'router-isp-1',    name: 'ROUTER-ISP-1',        type: 'router',      ip: '10.0.0.253',  status: 'online'  },
  'router-isp-2':    { id: 'router-isp-2',    name: 'ROUTER-ISP-2',        type: 'router',      ip: '10.0.0.252',  status: 'online'  },
  'ap-4f-east':      { id: 'ap-4f-east',      name: 'AP-4F-EAST',          type: 'ap',          ip: '10.0.4.51',   status: 'online'  },
  'laptop-rd-15':    { id: 'laptop-rd-15',    name: 'LAPTOP-RD-15',        type: 'laptop',      ip: '10.10.40.71', status: 'online'  },
  'phone-rd-22':     { id: 'phone-rd-22',     name: 'PHONE-RD-22',         type: 'phone',       ip: '10.10.40.131',status: 'online'  },
  'pad-design-01':   { id: 'pad-design-01',   name: 'TABLET-DESIGN-01',    type: 'tablet',      ip: '10.10.40.140',status: 'offline' },
  'sw-dock-rd':      { id: 'sw-dock-rd',      name: 'SW-DOCK-RD',          type: 'switch',      ip: '10.0.4.1',    status: 'online'  },
  'srv-build-01':    { id: 'srv-build-01',    name: 'SRV-BUILD-01',        type: 'server',      ip: '10.20.5.11',  status: 'online'  },
  'srv-git-lab':     { id: 'srv-git-lab',     name: 'SRV-GIT-LAB',         type: 'server',      ip: '10.20.5.12',  status: 'online'  },
  'nas-code':        { id: 'nas-code',        name: 'NAS-CODE',            type: 'nas',         ip: '10.20.5.20',  status: 'online'  },
  'fw-db-mgmt':      { id: 'fw-db-mgmt',      name: 'FW-DB-MGMT',          type: 'firewall',    ip: '10.20.0.253', status: 'online'  },
  'srv-web-prod-02': { id: 'srv-web-prod-02', name: 'SRV-WEB-PROD-02',     type: 'server',      ip: '10.20.0.12',  status: 'online'  },
  'srv-db-slave':    { id: 'srv-db-slave',    name: 'SRV-DB-SLAVE',        type: 'server',      ip: '10.20.0.32',  status: 'online'  },
  'srv-backup-01':   { id: 'srv-backup-01',   name: 'SRV-BACKUP-01',       type: 'server',      ip: '10.20.0.61',  status: 'warning' },
  'sw-storage':      { id: 'sw-storage',      name: 'SW-STORAGE',          type: 'switch',      ip: '10.20.10.1',  status: 'online'  },
  'nas-prod-01':     { id: 'nas-prod-01',     name: 'NAS-PROD-01',         type: 'nas',         ip: '10.20.10.11', status: 'online'  },
  'nas-prod-02':     { id: 'nas-prod-02',     name: 'NAS-PROD-02',         type: 'nas',         ip: '10.20.10.12', status: 'online'  },
  'sw-floor-2f':     { id: 'sw-floor-2f',     name: 'SW-FLOOR-2F',         type: 'switch',      ip: '10.0.2.1',    status: 'online'  },
  'pc-hr-10':        { id: 'pc-hr-10',        name: 'WORKSTATION-HR-10',   type: 'workstation', ip: '10.10.30.43', status: 'online'  },
  'pc-hr-11':        { id: 'pc-hr-11',        name: 'WORKSTATION-HR-11',   type: 'workstation', ip: '10.10.30.44', status: 'online'  },
  'printer-2f':      { id: 'printer-2f',      name: 'PRINTER-HP-2F',       type: 'printer',     ip: '10.10.30.249',status: 'online'  },
  'ap-2f-south':     { id: 'ap-2f-south',     name: 'AP-2F-SOUTH',         type: 'ap',          ip: '10.0.2.50',   status: 'online'  },
  'phone-hr-09':     { id: 'phone-hr-09',     name: 'PHONE-HR-09',         type: 'phone',       ip: '10.10.60.42', status: 'online'  },
  'sw-isolated-1f':  { id: 'sw-isolated-1f',  name: 'SW-ISOLATED-1F',      type: 'switch',      ip: '10.30.0.1',   status: 'online'  },
  'srv-legacy-01':   { id: 'srv-legacy-01',   name: 'SRV-LEGACY-01',       type: 'server',      ip: '10.30.0.11',  status: 'warning',  isChild: true, unreachable: true },
  'srv-legacy-02':   { id: 'srv-legacy-02',   name: 'SRV-LEGACY-02',       type: 'server',      ip: '10.30.0.12',  status: 'warning',  isChild: true, unreachable: true },
  'ws-isolated-01':  { id: 'ws-isolated-01',  name: 'WS-ISOLATED-01',      type: 'workstation', ip: '10.30.0.21',  status: 'warning',  isChild: true, unreachable: true },
};

// ------ 拓扑分支（每条记录为一个 Hub + 子节点列表） ------
// 注意：children 中的 isChild/unreachable/status 是该分支上下文中的显示属性，
//      与 devices 表中的基础属性相互独立（同一设备可在不同分支中呈现不同状态）
export const branches: MockBranch[] = [
  // ── pc-fin-01 ──────────────────────────────────────────────
  {
    id: 'b-fin-upstream', rootId: 'pc-fin-01', kind: 'wired', side: 'left', position: 0,
    hub: { id: 'rt-campus-gw', name: 'RT-CAMPUS-GW', type: 'router', ip: '10.0.0.254', status: 'online' },
    children: [],
  },
  {
    id: 'b-fin-core', rootId: 'pc-fin-01', kind: 'wired', side: 'right', position: 1,
    hub: { id: 'sw-core-01', name: 'SW-CORE-01', type: 'switch', ip: '10.0.0.1', status: 'online' },
    children: [
      { id: 'srv-fin-db',  name: 'SRV-FIN-DB',  type: 'server', ip: '10.20.0.21', status: 'online',  isChild: true },
      { id: 'srv-erp-app', name: 'SRV-ERP-APP', type: 'server', ip: '10.20.0.22', status: 'online',  isChild: true },
      { id: 'nas-finance', name: 'NAS-FINANCE',  type: 'nas',    ip: '10.20.10.5', status: 'online',  isChild: true },
      { id: 'srv-file-02', name: 'SRV-FILE-02',  type: 'server', ip: '10.20.0.23', status: 'warning', isChild: true, unreachable: true },
    ],
  },
  {
    id: 'b-fin-floor', rootId: 'pc-fin-01', kind: 'wired', side: 'right', position: 2,
    hub: { id: 'sw-floor-3f', name: 'SW-FLOOR-3F', type: 'switch', ip: '10.0.3.1', status: 'online' },
    children: [
      { id: 'pc-hr-09',   name: 'WORKSTATION-HR-09', type: 'workstation', ip: '10.10.30.42',  status: 'online' },
      { id: 'printer-3f', name: 'PRINTER-HP-3F',      type: 'printer',     ip: '10.10.30.250', status: 'online' },
    ],
  },
  {
    id: 'b-fin-wifi', rootId: 'pc-fin-01', kind: 'wireless', side: 'right', position: 3,
    hub: { id: 'ap-3f-north', name: 'AP-3F-NORTH', type: 'ap', ip: '10.0.3.50', status: 'online' },
    children: [
      { id: 'laptop-mgr-08', name: 'LAPTOP-MGR-08', type: 'laptop', ip: '10.10.60.12', status: 'warning', isChild: true, unreachable: true },
      { id: 'pad-mgr-02',    name: 'TABLET-MGR-02', type: 'tablet', ip: '10.10.60.18', status: 'warning', isChild: true, unreachable: true },
      { id: 'phone-fin-01',  name: 'PHONE-FIN-01',  type: 'phone',  ip: '10.10.60.31', status: 'warning', isChild: true, unreachable: true },
    ],
  },

  // ── srv-web-prod-01 ────────────────────────────────────────
  {
    id: 'b-web-dc', rootId: 'srv-web-prod-01', kind: 'wired', side: 'right', position: 0,
    hub: { id: 'sw-dc-core-a', name: 'SW-DC-CORE-A', type: 'switch', ip: '10.20.0.254', status: 'online' },
    children: [
      { id: 'srv-db-master',   name: 'SRV-DB-MASTER',   type: 'server', ip: '10.20.0.31', status: 'online',  isChild: true },
      { id: 'srv-cache-redis', name: 'SRV-CACHE-REDIS', type: 'server', ip: '10.20.0.41', status: 'online',  isChild: true },
      { id: 'lb-nginx-01',     name: 'LB-NGINX-01',     type: 'router', ip: '10.20.0.5',  status: 'online',  isChild: true },
      { id: 'srv-mq-kafka',    name: 'SRV-MQ-KAFKA',    type: 'server', ip: '10.20.0.51', status: 'warning', isChild: true, unreachable: true },
    ],
  },
  {
    id: 'b-web-edge', rootId: 'srv-web-prod-01', kind: 'wired', side: 'right', position: 1,
    hub: { id: 'fw-edge-01', name: 'FW-EDGE-01', type: 'firewall', ip: '10.0.0.254', status: 'online' },
    children: [
      { id: 'router-isp-1', name: 'ROUTER-ISP-1', type: 'router', ip: '10.0.0.253', status: 'online' },
      { id: 'router-isp-2', name: 'ROUTER-ISP-2', type: 'router', ip: '10.0.0.252', status: 'online' },
    ],
  },

  // ── pc-rd-22 ───────────────────────────────────────────────
  {
    id: 'b-rd-wifi', rootId: 'pc-rd-22', kind: 'wireless', side: 'right', position: 0,
    hub: { id: 'ap-4f-east', name: 'AP-4F-EAST', type: 'ap', ip: '10.0.4.51', status: 'online' },
    children: [
      { id: 'laptop-rd-15',  name: 'LAPTOP-RD-15',     type: 'laptop',  ip: '10.10.40.71',  status: 'online'  },
      { id: 'phone-rd-22',   name: 'PHONE-RD-22',      type: 'phone',   ip: '10.10.40.131', status: 'online'  },
      { id: 'pad-design-01', name: 'TABLET-DESIGN-01', type: 'tablet',  ip: '10.10.40.140', status: 'offline' },
    ],
  },
  {
    id: 'b-rd-dock', rootId: 'pc-rd-22', kind: 'wired', side: 'right', position: 1,
    hub: { id: 'sw-dock-rd', name: 'SW-DOCK-RD', type: 'switch', ip: '10.0.4.1', status: 'online' },
    children: [
      { id: 'srv-build-01', name: 'SRV-BUILD-01', type: 'server', ip: '10.20.5.11', status: 'online' },
      { id: 'srv-git-lab',  name: 'SRV-GIT-LAB',  type: 'server', ip: '10.20.5.12', status: 'online' },
      { id: 'nas-code',     name: 'NAS-CODE',      type: 'nas',    ip: '10.20.5.20', status: 'online' },
    ],
  },

  // ── srv-db-master ──────────────────────────────────────────
  {
    id: 'b-db-upstream', rootId: 'srv-db-master', kind: 'wired', side: 'left', position: 0,
    hub: { id: 'fw-db-mgmt', name: 'FW-DB-MGMT', type: 'firewall', ip: '10.20.0.253', status: 'online' },
    children: [],
  },
  {
    id: 'b-db-core', rootId: 'srv-db-master', kind: 'wired', side: 'right', position: 1,
    hub: { id: 'sw-dc-core-a', name: 'SW-DC-CORE-A', type: 'switch', ip: '10.20.0.254', status: 'online' },
    children: [
      { id: 'srv-web-prod-01', name: 'SRV-WEB-PROD-01', type: 'server', ip: '10.20.0.11', status: 'online'  },
      { id: 'srv-web-prod-02', name: 'SRV-WEB-PROD-02', type: 'server', ip: '10.20.0.12', status: 'online'  },
      { id: 'srv-db-slave',    name: 'SRV-DB-SLAVE',    type: 'server', ip: '10.20.0.32', status: 'online'  },
      { id: 'srv-backup-01',   name: 'SRV-BACKUP-01',   type: 'server', ip: '10.20.0.61', status: 'warning' },
    ],
  },
  {
    id: 'b-db-storage', rootId: 'srv-db-master', kind: 'wired', side: 'right', position: 2,
    hub: { id: 'sw-storage', name: 'SW-STORAGE', type: 'switch', ip: '10.20.10.1', status: 'online' },
    children: [
      { id: 'nas-prod-01', name: 'NAS-PROD-01', type: 'nas', ip: '10.20.10.11', status: 'online' },
      { id: 'nas-prod-02', name: 'NAS-PROD-02', type: 'nas', ip: '10.20.10.12', status: 'online' },
    ],
  },

  // ── pc-hr-09 ───────────────────────────────────────────────
  {
    id: 'b-hr-floor', rootId: 'pc-hr-09', kind: 'wired', side: 'right', position: 0,
    hub: { id: 'sw-floor-2f', name: 'SW-FLOOR-2F', type: 'switch', ip: '10.0.2.1', status: 'online' },
    children: [
      { id: 'pc-hr-10',   name: 'WORKSTATION-HR-10', type: 'workstation', ip: '10.10.30.43',  status: 'online' },
      { id: 'pc-hr-11',   name: 'WORKSTATION-HR-11', type: 'workstation', ip: '10.10.30.44',  status: 'online' },
      { id: 'printer-2f', name: 'PRINTER-HP-2F',      type: 'printer',     ip: '10.10.30.249', status: 'online' },
    ],
  },
  {
    id: 'b-hr-wifi', rootId: 'pc-hr-09', kind: 'wireless', side: 'right', position: 1,
    hub: { id: 'ap-2f-south', name: 'AP-2F-SOUTH', type: 'ap', ip: '10.0.2.50', status: 'online' },
    children: [
      { id: 'phone-hr-09', name: 'PHONE-HR-09', type: 'phone', ip: '10.10.60.42', status: 'online' },
    ],
  },
  {
    id: 'b-hr-isolated', rootId: 'pc-hr-09', kind: 'wired', side: 'right', position: 2,
    hub: { id: 'sw-isolated-1f', name: 'SW-ISOLATED-1F', type: 'switch', ip: '10.30.0.1', status: 'online' },
    children: [
      { id: 'srv-legacy-01', name: 'SRV-LEGACY-01',  type: 'server',      ip: '10.30.0.11', status: 'warning', isChild: true, unreachable: true },
      { id: 'srv-legacy-02', name: 'SRV-LEGACY-02',  type: 'server',      ip: '10.30.0.12', status: 'warning', isChild: true, unreachable: true },
      { id: 'ws-isolated-01',name: 'WS-ISOLATED-01', type: 'workstation', ip: '10.30.0.21', status: 'warning', isChild: true, unreachable: true },
    ],
  },

  // ── pad-mgr-02 ─────────────────────────────────────────────
  {
    id: 'b-pad-wifi', rootId: 'pad-mgr-02', kind: 'wireless', side: 'right', position: 0,
    hub: { id: 'ap-3f-north', name: 'AP-3F-NORTH', type: 'ap', ip: '10.0.3.50', status: 'online' },
    children: [
      { id: 'pc-fin-01',     name: 'DESKTOP-FIN-01', type: 'workstation', ip: '10.10.20.101', status: 'online' },
      { id: 'laptop-mgr-08', name: 'LAPTOP-MGR-08',  type: 'laptop',      ip: '10.10.60.12',  status: 'online' },
      { id: 'phone-fin-01',  name: 'PHONE-FIN-01',   type: 'phone',       ip: '10.10.60.31',  status: 'online' },
    ],
  },
];
