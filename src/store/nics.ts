import { reactive } from 'vue';
import type { BaseDevice, DeviceType, NicInfo } from '../types/topology';
import { getPortCount, portIdLeft, portIdRight } from '../utils/ports';
import { deriveNicKind } from '../data/deviceTypes';
import { patchNic as apiPatchNic } from '../api/index';

const nicsByDevice = reactive<Record<string, NicInfo[]>>({});
const deviceById: Record<string, BaseDevice> = {};

function hex2(): string {
  return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
}

function generateMac(): string {
  return [hex2(), hex2(), hex2(), hex2(), hex2(), hex2()].join(':').toUpperCase();
}

function deriveName(
  type: DeviceType,
  side: 'left' | 'right',
  index: number,
  leftCount: number,
): string {
  const isWifi = deriveNicKind(type, side) === 'wireless';
  if (isWifi) return `wlan${index}`;
  if (type === 'switch') return side === 'left' ? `Gi0/${index + 1}` : `Gi0/${leftCount + index + 1}`;
  return side === 'left' ? `ext${index}` : `int${index}`;
}

function ipFromBase(baseIp: string, offset: number): string {
  const parts = baseIp.split('.').map((s) => parseInt(s, 10));
  const last = ((parts[3] + offset - 1) % 253) + 2;
  return `${parts[0]}.${parts[1]}.${parts[2]}.${last}`;
}

function gatewayOf(baseIp: string): string {
  const parts = baseIp.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
}

export function ensureNicsFor(device: BaseDevice): NicInfo[] {
  if (nicsByDevice[device.id]) return nicsByDevice[device.id];
  const cfg = getPortCount(device.type);
  const out: NicInfo[] = [];

  for (let i = 0; i < cfg.left; i++) {
    out.push({
      id: portIdLeft(i),
      name: deriveName(device.type, 'left', i, cfg.left),
      side: 'left',
      index: i,
      mac: generateMac(),
      ip: i === 0 ? device.ip : ipFromBase(device.ip, 100 + i),
      netmask: '255.255.255.0',
      gateway: gatewayOf(device.ip),
      kind: deriveNicKind(device.type, 'left'),
    });
  }
  for (let i = 0; i < cfg.right; i++) {
    out.push({
      id: portIdRight(i),
      name: deriveName(device.type, 'right', i, cfg.left),
      side: 'right',
      index: i,
      mac: generateMac(),
      ip: ipFromBase(device.ip, 50 + i),
      netmask: '255.255.255.0',
      gateway: gatewayOf(device.ip),
      kind: deriveNicKind(device.type, 'right'),
    });
  }
  nicsByDevice[device.id] = out;
  deviceById[device.id] = device;
  return out;
}

export function getNic(deviceId: string, nicId: string): NicInfo | undefined {
  return nicsByDevice[deviceId]?.find((n) => n.id === nicId);
}

export function listNics(deviceId: string): NicInfo[] {
  return nicsByDevice[deviceId] ?? [];
}

export function getDeviceById(deviceId: string): BaseDevice | undefined {
  return deviceById[deviceId];
}

export function updateNic(
  deviceId: string,
  nicId: string,
  patch: Partial<Pick<NicInfo, 'ip' | 'netmask' | 'gateway' | 'mac'>>,
): void {
  const list = nicsByDevice[deviceId];
  if (!list) return;
  const idx = list.findIndex((n) => n.id === nicId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  // Persist to backend
  apiPatchNic(deviceId, nicId, patch).catch((err) => {
    console.warn('[nics] Failed to persist NIC update:', err);
  });
}
