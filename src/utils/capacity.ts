import { getTypeDef } from '../data/deviceTypes';

export interface DeviceCapacity {
  cpuCores: number;
  memMB: number;
  diskGB: number;
}

export function getCapacity(type: string): DeviceCapacity {
  return getTypeDef(type).capacity;
}

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
