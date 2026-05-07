import type { DeviceType } from '../types/topology';

export interface PortConfig {
  left: number;
  right: number;
}

export const PORT_COUNT: Record<DeviceType, PortConfig> = {
  workstation: { left: 1, right: 1 },
  laptop:      { left: 1, right: 1 },
  server:      { left: 2, right: 2 },
  switch:      { left: 2, right: 6 },
  router:      { left: 2, right: 4 },
  ap:          { left: 1, right: 4 },
  phone:       { left: 1, right: 1 },
  tablet:      { left: 1, right: 1 },
  printer:     { left: 1, right: 1 },
  nas:         { left: 2, right: 2 },
  firewall:    { left: 2, right: 3 },
};

export function portPositions(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < n; i++) r.push(((i + 1) / (n + 1)) * 100);
  return r;
}

export const portIdLeft = (i: number): string => `lp-${i}`;
export const portIdRight = (i: number): string => `rp-${i}`;
