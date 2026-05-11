import { api } from './client';
import type { DeviceAddition } from '../store/additions';

export interface SelectableDeviceDto {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: string;
  description: string;
}

export interface BaseDeviceDto {
  id: string;
  name: string;
  type: string;
  ip: string;
  status?: string;
  isChild?: boolean;
  unreachable?: boolean;
}

export interface BranchDto {
  id: string;
  kind: string;
  side: string;
  hub: BaseDeviceDto;
  children: BaseDeviceDto[];
}

export interface TopologyDto {
  center: BaseDeviceDto;
  branches: BranchDto[];
}

export interface StateDto {
  additions: DeviceAddition[];
  removals: string[];
  collapsedPorts: string[];
}

export interface NicInfoDto {
  id: string;
  name: string;
  side: string;
  index: number;
  mac: string;
  ip: string;
  netmask: string;
  gateway: string;
  kind: string;
}

export interface PingStateDto {
  targetId: string;
  enabled: boolean;
}

export interface MetricsDto {
  cpu: number;
  mem: number;
  disk: number;
}

export async function fetchSelectable(): Promise<SelectableDeviceDto[]> {
  const res = await api.get<SelectableDeviceDto[]>('/selectable');
  return res.data;
}

export async function fetchTopology(rootId: string): Promise<TopologyDto> {
  const res = await api.get<TopologyDto>(`/topology/${rootId}`);
  return res.data;
}

export async function fetchState(rootId: string): Promise<StateDto> {
  const res = await api.get<StateDto>(`/state/${rootId}`);
  return res.data;
}

export async function postAddition(
  rootId: string,
  addition: DeviceAddition,
): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>(`/state/${rootId}/additions`, {
    id: addition.id,
    parentDeviceId: addition.parentDeviceId,
    parentNicId: addition.parentNicId,
    kind: addition.kind,
    device: addition.device,
  });
  return res.data;
}

export async function deleteAddition(rootId: string, additionId: string): Promise<void> {
  await api.delete(`/state/${rootId}/additions/${additionId}`);
}

export async function postRemoval(rootId: string, deviceId: string): Promise<void> {
  await api.post(`/state/${rootId}/removals/${deviceId}`);
}

export async function deleteRemoval(rootId: string, deviceId: string): Promise<void> {
  await api.delete(`/state/${rootId}/removals/${deviceId}`);
}

export async function postCollapsed(rootId: string, deviceId: string, portId: string): Promise<void> {
  await api.post(`/state/${rootId}/collapsed`, { deviceId, portId });
}

export async function deleteCollapsed(rootId: string, deviceId: string, portId: string): Promise<void> {
  await api.delete(`/state/${rootId}/collapsed/${deviceId}/${portId}`);
}

export async function fetchNics(deviceId: string): Promise<NicInfoDto[]> {
  const res = await api.get<NicInfoDto[]>(`/nics/${deviceId}`);
  return res.data;
}

export async function patchNic(
  deviceId: string,
  nicId: string,
  patch: Partial<{ ip: string; netmask: string; gateway: string; mac: string }>,
): Promise<NicInfoDto> {
  const res = await api.patch<NicInfoDto>(`/nics/${deviceId}/${nicId}`, patch);
  return res.data;
}

export async function fetchPingStates(rootId: string): Promise<PingStateDto[]> {
  const res = await api.get<PingStateDto[]>(`/ping/${rootId}`);
  return res.data;
}

export async function putPingState(rootId: string, targetId: string, enabled: boolean): Promise<PingStateDto> {
  const res = await api.put<PingStateDto>(`/ping/${rootId}/${targetId}`, { enabled });
  return res.data;
}

export async function fetchMetrics(deviceId: string): Promise<MetricsDto> {
  const res = await api.get<MetricsDto>(`/metrics/${deviceId}`);
  return res.data;
}
