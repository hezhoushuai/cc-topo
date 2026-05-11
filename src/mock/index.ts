import type { MockMethod } from 'vite-plugin-mock';
import { selectableDevices, devices, branches } from './mockData';
import type { MockDevice } from './mockData';
import { getTypeDef, deriveNicKind } from '../data/deviceTypes';

// ── 内存状态（dev server 重启前持续有效） ────────────────────
const additions: Record<string, any[]> = {};
const removals: Record<string, string[]> = {};
const collapsedPorts: Record<string, string[]> = {};
const pingStates: Record<string, boolean> = {};
const nicOverrides: Record<string, Record<string, Record<string, string>>> = {};

// vite-plugin-mock v3 的 req 对象只有 url/body/query/headers，无 params
// 用下面的工具从 URL 中提取路径段
function seg(url: string, index: number): string {
  return url.split('?')[0].split('/').filter(Boolean)[index + 1] ?? '';
}

function buildTopology(rootId: string) {
  const center: MockDevice | undefined = devices[rootId];
  if (!center) return null;
  const rootBranches = branches
    .filter((b) => b.rootId === rootId)
    .sort((a, b) => a.position - b.position)
    .map((b) => ({ id: b.id, kind: b.kind, side: b.side, hub: b.hub, children: b.children }));
  return { center, branches: rootBranches };
}

// ── NIC 生成（端口数与无线/有线判定来自 device-types.json） ──
function hex2() { return Math.floor(Math.random() * 256).toString(16).padStart(2, '0'); }
function generateMac() { return [hex2(), hex2(), hex2(), hex2(), hex2(), hex2()].join(':').toUpperCase(); }
function ipFromBase(base: string, offset: number) {
  const p = base.split('.').map(Number);
  return `${p[0]}.${p[1]}.${p[2]}.${((p[3] + offset - 1) % 253) + 2}`;
}
function gatewayOf(ip: string) { const p = ip.split('.'); return `${p[0]}.${p[1]}.${p[2]}.1`; }

function buildNics(device: MockDevice) {
  const cfg = getTypeDef(device.type).ports;
  const out = [];
  const leftKind = deriveNicKind(device.type, 'left');
  const rightKind = deriveNicKind(device.type, 'right');
  for (let i = 0; i < cfg.left; i++) {
    out.push({ id: `lp-${i}`, name: leftKind === 'wireless' ? `wlan${i}` : `ext${i}`, side: 'left', index: i,
      mac: generateMac(), ip: i === 0 ? device.ip : ipFromBase(device.ip, 100 + i),
      netmask: '255.255.255.0', gateway: gatewayOf(device.ip), kind: leftKind });
  }
  for (let i = 0; i < cfg.right; i++) {
    out.push({ id: `rp-${i}`, name: rightKind === 'wireless' ? `wlan${i}` : `int${i}`, side: 'right', index: i,
      mac: generateMac(), ip: ipFromBase(device.ip, 50 + i),
      netmask: '255.255.255.0', gateway: gatewayOf(device.ip), kind: rightKind });
  }
  return out;
}

// ── Mock 路由 ────────────────────────────────────────────────
// URL 格式：/api/<resource>/[seg0]/[seg1]/[seg2]
// seg(url, N) 提取 /api 后第 N 个路径段（0-indexed）

const mocks: MockMethod[] = [
  // GET /api/selectable
  {
    url: '/api/selectable',
    method: 'get',
    response: () =>
      selectableDevices.map((s) => ({ ...(devices[s.id] ?? { id: s.id }), description: s.description })),
  },

  // GET /api/topology/:rootId
  {
    url: '/api/topology/:rootId',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      const topo = buildTopology(rootId);
      return topo ?? { error: 'Topology not found' };
    },
  },

  // GET /api/state/:rootId
  {
    url: '/api/state/:rootId',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      return {
        additions:     additions[rootId]     ?? [],
        removals:      removals[rootId]      ?? [],
        collapsedPorts: collapsedPorts[rootId] ?? [],
      };
    },
  },

  // POST /api/state/:rootId/additions
  {
    url: '/api/state/:rootId/additions',
    method: 'post',
    response: ({ url, body }: { url: string; body: any }) => {
      const rootId = seg(url, 1);
      if (!additions[rootId]) additions[rootId] = [];
      additions[rootId].push(body);
      return { id: body.id };
    },
  },

  // DELETE /api/state/:rootId/additions/:additionId
  {
    url: '/api/state/:rootId/additions/:additionId',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      const additionId = seg(url, 3);
      const list = additions[rootId];
      if (list) {
        const idx = list.findIndex((a: any) => a.id === additionId);
        if (idx !== -1) list.splice(idx, 1);
      }
      return null;
    },
  },

  // POST /api/state/:rootId/removals/:deviceId
  {
    url: '/api/state/:rootId/removals/:deviceId',
    method: 'post',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      const deviceId = seg(url, 3);
      if (!removals[rootId]) removals[rootId] = [];
      if (!removals[rootId].includes(deviceId)) removals[rootId].push(deviceId);
      return null;
    },
  },

  // DELETE /api/state/:rootId/removals/:deviceId
  {
    url: '/api/state/:rootId/removals/:deviceId',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      const deviceId = seg(url, 3);
      const list = removals[rootId];
      if (list) { const idx = list.indexOf(deviceId); if (idx !== -1) list.splice(idx, 1); }
      return null;
    },
  },

  // POST /api/state/:rootId/collapsed
  {
    url: '/api/state/:rootId/collapsed',
    method: 'post',
    response: ({ url, body }: { url: string; body: any }) => {
      const rootId = seg(url, 1);
      if (!collapsedPorts[rootId]) collapsedPorts[rootId] = [];
      const key = `${body.deviceId}::${body.portId}`;
      if (!collapsedPorts[rootId].includes(key)) collapsedPorts[rootId].push(key);
      return null;
    },
  },

  // DELETE /api/state/:rootId/collapsed/:deviceId/:portId
  {
    url: '/api/state/:rootId/collapsed/:deviceId/:portId',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const parts = url.split('?')[0].split('/').filter(Boolean);
      // /api/state/:rootId/collapsed/:deviceId/:portId
      // idx: 0=api 1=state 2=rootId 3=collapsed 4=deviceId 5=portId
      const rootId = parts[2];
      const deviceId = parts[4];
      const portId = parts[5];
      const list = collapsedPorts[rootId];
      if (list) {
        const key = `${deviceId}::${portId}`;
        const idx = list.indexOf(key);
        if (idx !== -1) list.splice(idx, 1);
      }
      return null;
    },
  },

  // GET /api/nics/:deviceId
  {
    url: '/api/nics/:deviceId',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const deviceId = seg(url, 1);
      const device = devices[deviceId];
      return device ? buildNics(device) : [];
    },
  },

  // PATCH /api/nics/:deviceId/:nicId
  {
    url: '/api/nics/:deviceId/:nicId',
    method: 'patch',
    response: ({ url, body }: { url: string; body: any }) => {
      const parts = url.split('?')[0].split('/').filter(Boolean);
      const deviceId = parts[2];
      const nicId = parts[3];
      if (!nicOverrides[deviceId]) nicOverrides[deviceId] = {};
      nicOverrides[deviceId][nicId] = { ...(nicOverrides[deviceId][nicId] ?? {}), ...body };
      return { id: nicId, ...body };
    },
  },

  // GET /api/ping/:rootId
  {
    url: '/api/ping/:rootId',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const rootId = seg(url, 1);
      const prefix = `${rootId}::`;
      return Object.entries(pingStates)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, enabled]) => ({ targetId: k.slice(prefix.length), enabled }));
    },
  },

  // PUT /api/ping/:rootId/:targetId
  {
    url: '/api/ping/:rootId/:targetId',
    method: 'put',
    response: ({ url, body }: { url: string; body: any }) => {
      const parts = url.split('?')[0].split('/').filter(Boolean);
      const rootId = parts[2];
      const targetId = parts[3];
      pingStates[`${rootId}::${targetId}`] = body.enabled;
      return { targetId, enabled: body.enabled };
    },
  },

  // GET /api/metrics/:deviceId
  {
    url: '/api/metrics/:deviceId',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const deviceId = seg(url, 1);
      if (!devices[deviceId]) return { error: 'Not found' };
      return {
        cpu:  Math.round(Math.random() * 80 + 5),
        mem:  Math.round(Math.random() * 70 + 10),
        disk: Math.round(Math.random() * 60 + 20),
      };
    },
  },
];

export default mocks;
