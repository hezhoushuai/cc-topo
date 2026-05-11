import { getTypeDef } from '../data/deviceTypes';

export interface PortConfig {
  left: number;
  right: number;
}

export function getPortCount(type: string): PortConfig {
  const def = getTypeDef(type);
  return def.ports;
}

export function portPositions(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < n; i++) r.push(((i + 1) / (n + 1)) * 100);
  return r;
}

export const portIdLeft = (i: number): string => `lp-${i}`;
export const portIdRight = (i: number): string => `rp-${i}`;
