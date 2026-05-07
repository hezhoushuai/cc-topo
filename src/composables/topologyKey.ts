import type { InjectionKey } from 'vue';
import type { PingSummary } from '../store/ping';

export const TogglePortKey: InjectionKey<(deviceId: string, portId: string) => void> =
  Symbol('togglePort');

export interface PingService {
  toggle: (targetDeviceId: string) => void;
  isOn: (targetDeviceId: string) => boolean;
  summary: (targetDeviceId: string) => PingSummary;
}

export const PingServiceKey: InjectionKey<PingService> = Symbol('pingService');
