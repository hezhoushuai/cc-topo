import type { DeviceType } from '../types/topology';

export interface DeviceCapacity {
  cpuCores: number;
  memMB: number;
  diskGB: number;
}

export const CAPACITY: Record<DeviceType, DeviceCapacity> = {
  workstation: { cpuCores: 4, memMB: 8 * 1024, diskGB: 500 },
  laptop:      { cpuCores: 8, memMB: 16 * 1024, diskGB: 512 },
  server:      { cpuCores: 16, memMB: 32 * 1024, diskGB: 2 * 1024 },
  switch:      { cpuCores: 2, memMB: 1024, diskGB: 16 },
  router:      { cpuCores: 2, memMB: 2 * 1024, diskGB: 32 },
  ap:          { cpuCores: 1, memMB: 512, diskGB: 4 },
  phone:       { cpuCores: 8, memMB: 6 * 1024, diskGB: 128 },
  tablet:      { cpuCores: 8, memMB: 8 * 1024, diskGB: 256 },
  printer:     { cpuCores: 1, memMB: 256, diskGB: 8 },
  nas:         { cpuCores: 4, memMB: 16 * 1024, diskGB: 16 * 1024 },
  firewall:    { cpuCores: 4, memMB: 8 * 1024, diskGB: 256 },
};

function fmtNum(v: number, digits: number): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtCpuUsage(pct: number, cores: number): string {
  const used = (pct * cores) / 100;
  const usedStr = cores >= 8 ? fmtNum(used, 1) : fmtNum(used, 2);
  return `${usedStr} / ${cores} vCPU`;
}

export function fmtMemUsage(pct: number, totalMB: number): string {
  const usedMB = (pct * totalMB) / 100;
  if (totalMB >= 1024) {
    return `${fmtNum(usedMB / 1024, 1)} / ${fmtNum(totalMB / 1024, 0)} GB`;
  }
  return `${fmtNum(usedMB, 0)} / ${totalMB} MB`;
}

export function fmtDiskUsage(pct: number, totalGB: number): string {
  const usedGB = (pct * totalGB) / 100;
  if (totalGB >= 1024) {
    return `${fmtNum(usedGB / 1024, 2)} / ${fmtNum(totalGB / 1024, 1)} TB`;
  }
  return `${fmtNum(usedGB, 0)} / ${totalGB} GB`;
}
