<script setup lang="ts">
import { computed, inject } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { NodeProps } from '@vue-flow/core';
import { metricsOf } from '../composables/useMetrics';
import { ensureNicsFor } from '../store/nics';
import { openPortMenu } from '../store/ui';
import { PROTOCOLS } from '../store/ping';
import type { Protocol } from '../store/ping';
import { PingServiceKey, TogglePortKey } from '../composables/topologyKey';
import { PORT_COUNT, portIdLeft, portIdRight, portPositions } from '../utils/ports';
import { CAPACITY, fmtCpuUsage, fmtDiskUsage, fmtMemUsage } from '../utils/capacity';
import { TYPE_THEME } from '../utils/theme';
import type { DeviceType, NicInfo, NodeData, TogglePortInfo } from '../types/topology';

const props = defineProps<NodeProps<NodeData>>();

const device = computed(() => props.data.device);
const role = computed(() => props.data.role);
const isCenter = computed(() => role.value === 'center');
const m = computed(() => metricsOf(device.value.id));
const cap = computed(() => CAPACITY[device.value.type]);
const theme = computed(() => TYPE_THEME[device.value.type]);

const isOffline = computed(() => device.value.status === 'offline');

const portCfg = computed(() => props.data.portCount ?? PORT_COUNT[device.value.type]);
const leftPositions = computed(() => portPositions(portCfg.value.left));
const rightPositions = computed(() => portPositions(portCfg.value.right));

const nics = computed(() => ensureNicsFor(device.value));

function nicByPort(portId: string): NicInfo | undefined {
  return nics.value.find((n) => n.id === portId);
}

const activeSet = computed(() => new Set(props.data.activePorts ?? []));

function isActive(portId: string): boolean {
  return activeSet.value.has(portId);
}

function portKindClass(portId: string): string {
  const nic = nicByPort(portId);
  if (!nic) return '';
  if (!isActive(portId)) return 'idle';
  if (isOffline.value) return 'idle';
  return nic.kind === 'wireless' ? 'active-wireless' : 'active-wired';
}

function onPortContext(e: MouseEvent, portId: string): void {
  e.preventDefault();
  e.stopPropagation();
  openPortMenu(e.clientX, e.clientY, {
    deviceId: device.value.id,
    nicId: portId,
    isCenter: isCenter.value,
  });
}

function portConnCount(portId: string): number {
  return props.data.portConnections?.[portId] ?? 0;
}

function portConnLabel(portId: string): string {
  const n = portConnCount(portId);
  return n > 0 ? String(n) : '';
}

const togglePort = inject(TogglePortKey);

const togglePortsArr = computed<TogglePortInfo[]>(() => props.data.togglePorts ?? []);
const rightToggles = computed(() =>
  togglePortsArr.value.filter((tp) => tp.portId.startsWith('rp-')),
);
const leftToggles = computed(() =>
  togglePortsArr.value.filter((tp) => tp.portId.startsWith('lp-')),
);

function portTopPercent(portId: string): number {
  const idx = parseInt(portId.replace(/^[lr]p-/, ''), 10);
  if (Number.isNaN(idx)) return 50;
  if (portId.startsWith('rp-')) return rightPositions.value[idx] ?? 50;
  return leftPositions.value[idx] ?? 50;
}

function onToggle(portId: string): void {
  togglePort?.(device.value.id, portId);
}

const pingService = inject(PingServiceKey);

const showPing = computed(() => !isCenter.value);
const isUnreachable = computed(() => device.value.unreachable === true);
const isAutoMonitored = computed(() => device.value.isChild === true);

const pingOn = computed(() => {
  if (isOffline.value) return false;
  if (isUnreachable.value) return true;
  if (isAutoMonitored.value) return true;
  return pingService?.isOn(device.value.id) ?? false;
});

const pingSummary = computed(() => {
  if (isUnreachable.value) {
    return {
      latency: null,
      loss: 1,
      samples: 1,
      protocols: { TCP: false, UDP: false, ICMP: false },
    };
  }
  return (
    pingService?.summary(device.value.id) ?? {
      latency: null,
      loss: 0,
      samples: 0,
      protocols: { TCP: true, UDP: true, ICMP: true },
    }
  );
});

const pingHealth = computed<'idle' | 'ok' | 'warn' | 'bad'>(() => {
  if (!pingOn.value) return 'idle';
  if (isUnreachable.value) return 'bad';
  const s = pingSummary.value;
  if (s.samples === 0) return 'ok';
  const lat = s.latency ?? 9999;
  if (s.loss > 0.05 || lat > 150) return 'bad';
  if (s.loss > 0.01 || lat > 60) return 'warn';
  return 'ok';
});

const pingLatencyText = computed(() => {
  if (isUnreachable.value) return '不通';
  const s = pingSummary.value;
  if (!pingOn.value || s.samples === 0) return '—';
  if (s.latency === null) return '丢';
  return `${s.latency.toFixed(0)}ms`;
});

const pingLossText = computed(() => {
  const s = pingSummary.value;
  if (!pingOn.value || s.samples === 0) return '0%';
  return `${(s.loss * 100).toFixed(0)}%`;
});

const protoStatus = computed(() => pingSummary.value.protocols);

function protoTitle(p: Protocol): string {
  const ok = protoStatus.value[p];
  return `${p}: ${ok ? '可达' : '不可达'}`;
}

function onTogglePing(): void {
  if (isOffline.value) return;
  // Auto-monitored child / unreachable child cannot be toggled off
  if (isAutoMonitored.value || isUnreachable.value) return;
  pingService?.toggle(device.value.id);
}

const typeLabel: Record<DeviceType, string> = {
  workstation: '工作站',
  laptop: '笔记本',
  server: '服务器',
  switch: '交换机',
  router: '路由器',
  ap: '无线AP',
  phone: '手机',
  tablet: '平板',
  printer: '打印机',
  nas: 'NAS',
  firewall: '防火墙',
};

const typeIcon: Record<DeviceType, string> = {
  workstation: '🖥',
  laptop: '💻',
  server: '🗄',
  switch: '🔀',
  router: '🛰',
  ap: '📡',
  phone: '📱',
  tablet: '📲',
  printer: '🖨',
  nas: '💾',
  firewall: '🛡',
};

function metricColor(v: number): string {
  if (isOffline.value) return '#475569';
  if (v >= 85) return '#f43f5e';
  if (v >= 65) return '#f59e0b';
  return theme.value.primaryLight;
}

const cardSize = computed(() => ({
  width: '200px',
  height: isCenter.value ? '124px' : '72px',
}));

const cardStyle = computed(() => {
  const base = { ...cardSize.value, padding: isCenter.value ? '8px 10px' : '6px 8px' };
  if (isOffline.value) {
    return {
      ...base,
      borderColor: 'rgba(71, 85, 105, 0.7)',
      background:
        'repeating-linear-gradient(45deg, rgba(15,23,42,0.92) 0 8px, rgba(30,41,59,0.85) 8px 14px)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    };
  }
  const t = theme.value;
  let shadow: string;
  if (isCenter.value) {
    shadow = `0 0 18px ${t.glow}, 0 0 0 1.5px ${t.border} inset`;
  } else if (role.value === 'hub') {
    shadow = `0 0 8px ${t.glow}`;
  } else {
    shadow = '0 1px 3px rgba(0,0,0,0.4)';
  }
  return {
    ...base,
    borderColor: t.border,
    background: t.background,
    boxShadow: shadow,
  };
});

const iconStyle = computed(() => {
  if (isOffline.value) {
    return {
      background: 'rgba(30, 41, 59, 0.6)',
      borderColor: 'rgba(71, 85, 105, 0.7)',
      filter: 'grayscale(0.85) brightness(0.7)',
    };
  }
  return {
    background: theme.value.iconBg,
    borderColor: theme.value.iconBorder,
  };
});

const typeBadgeStyle = computed(() => ({
  color: isOffline.value ? '#64748b' : theme.value.badgeText,
}));

const centerBadgeStyle = computed(() => {
  if (isOffline.value) {
    return { background: '#475569', color: '#cbd5e1' };
  }
  return { background: theme.value.primary, color: '#0a0f1c' };
});

const showChildBadge = computed(() => !isCenter.value && device.value.isChild === true);

const childBadgeStyle = computed(() => {
  if (isUnreachable.value) {
    return {
      background: 'rgba(244, 63, 94, 0.2)',
      borderColor: 'rgba(244, 63, 94, 0.65)',
      color: 'rgb(254, 205, 211)',
      boxShadow: '0 0 6px rgba(244, 63, 94, 0.35)',
    };
  }
  return {
    background: 'rgba(34, 211, 238, 0.18)',
    borderColor: 'rgba(34, 211, 238, 0.6)',
    color: 'rgb(165, 243, 252)',
    boxShadow: '0 0 6px rgba(34, 211, 238, 0.3)',
  };
});

function fmtPct(v: number): string {
  return `${v.toFixed(0)}%`;
}
</script>

<template>
  <div
    class="topo-card relative rounded-md border backdrop-blur-sm"
    :class="['topo-card', isOffline ? 'topo-card-offline text-slate-500' : 'text-slate-100']"
    :style="cardStyle"
  >
    <Handle
      v-for="(_, i) in leftPositions"
      :key="`HL${i}`"
      :id="portIdLeft(i)"
      type="target"
      :position="Position.Left"
      :style="{ top: leftPositions[i] + '%' }"
      class="topo-handle"
    />
    <Handle
      v-for="(_, i) in rightPositions"
      :key="`HR${i}`"
      :id="portIdRight(i)"
      type="source"
      :position="Position.Right"
      :style="{ top: rightPositions[i] + '%' }"
      class="topo-handle"
    />

    <div
      v-for="(top, i) in leftPositions"
      :key="`PL${i}`"
      :class="['topo-port topo-port-left', portKindClass(portIdLeft(i))]"
      :style="{ top: top + '%' }"
      :title="`${nicByPort(portIdLeft(i))?.name} · 右键管理`"
      @contextmenu="(e) => onPortContext(e, portIdLeft(i))"
    >
      <span class="topo-port-label">{{ portConnLabel(portIdLeft(i)) }}</span>
    </div>
    <div
      v-for="(top, i) in rightPositions"
      :key="`PR${i}`"
      :class="['topo-port topo-port-right', portKindClass(portIdRight(i))]"
      :style="{ top: top + '%' }"
      :title="`${nicByPort(portIdRight(i))?.name} · 右键管理`"
      @contextmenu="(e) => onPortContext(e, portIdRight(i))"
    >
      <span class="topo-port-label">{{ portConnLabel(portIdRight(i)) }}</span>
    </div>

    <button
      v-for="tp in rightToggles"
      :key="`TR-${tp.portId}`"
      type="button"
      :class="['topo-toggle topo-toggle-right', tp.collapsed ? 'topo-toggle-collapsed' : '']"
      :style="{ top: portTopPercent(tp.portId) + '%' }"
      :title="tp.collapsed ? '展开下挂设备' : '收起下挂设备'"
      @click.stop="onToggle(tp.portId)"
      @mousedown.stop
    >
      <span class="topo-toggle-icon">{{ tp.collapsed ? '+' : '−' }}</span>
    </button>
    <button
      v-for="tp in leftToggles"
      :key="`TL-${tp.portId}`"
      type="button"
      :class="['topo-toggle topo-toggle-left', tp.collapsed ? 'topo-toggle-collapsed' : '']"
      :style="{ top: portTopPercent(tp.portId) + '%' }"
      :title="tp.collapsed ? '展开下挂设备' : '收起下挂设备'"
      @click.stop="onToggle(tp.portId)"
      @mousedown.stop
    >
      <span class="topo-toggle-icon">{{ tp.collapsed ? '+' : '−' }}</span>
    </button>

    <!-- Center card: full layout with metrics -->
    <template v-if="isCenter">
      <div class="flex items-center gap-2 mb-1.5">
        <div
          class="shrink-0 size-8 grid place-items-center rounded border"
          :style="iconStyle"
        >
          <span class="text-[17px] leading-none">{{ typeIcon[device.type] }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-[12.5px] font-semibold truncate leading-tight">
              {{ device.name }}
            </span>
            <span
              v-if="device.status"
              :class="[
                'size-1.5 rounded-full shrink-0',
                device.status === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]'
                  : device.status === 'warning'
                    ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.7)]'
                    : 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]',
              ]"
            ></span>
          </div>
          <div class="text-[10px] truncate leading-tight">
            <span class="font-medium" :style="typeBadgeStyle">{{ typeLabel[device.type] }}</span>
            <span class="text-slate-600 mx-1">·</span>
            <span :class="['font-mono', isOffline ? 'text-slate-600' : 'text-slate-300']">{{ device.ip }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-0.5">
        <div class="metric-line">
          <span class="metric-label">CPU</span>
          <span class="metric-pct" :style="{ color: metricColor(m.cpu) }">{{ isOffline ? '—' : fmtPct(m.cpu) }}</span>
          <span class="metric-abs">{{ isOffline ? '—' : fmtCpuUsage(m.cpu, cap.cpuCores) }}</span>
        </div>
        <div class="metric-line">
          <span class="metric-label">内存</span>
          <span class="metric-pct" :style="{ color: metricColor(m.mem) }">{{ isOffline ? '—' : fmtPct(m.mem) }}</span>
          <span class="metric-abs">{{ isOffline ? '—' : fmtMemUsage(m.mem, cap.memMB) }}</span>
        </div>
        <div class="metric-line">
          <span class="metric-label">磁盘</span>
          <span class="metric-pct" :style="{ color: metricColor(m.disk) }">{{ isOffline ? '—' : fmtPct(m.disk) }}</span>
          <span class="metric-abs">{{ isOffline ? '—' : fmtDiskUsage(m.disk, cap.diskGB) }}</span>
        </div>
      </div>

      <div
        class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg"
        :style="centerBadgeStyle"
      >
        {{ isOffline ? '离线 · 当前设备' : '当前设备' }}
      </div>
    </template>

    <!-- Hub / leaf card: compact, no metrics -->
    <template v-else>
      <div
        v-if="showChildBadge"
        class="child-badge"
        :style="childBadgeStyle"
        :title="isUnreachable ? '子节点 · 网络不通' : '子节点 · 自动监测中'"
      >
        <span class="child-badge-dot"></span>
        子节点
      </div>
      <div class="flex items-center gap-2 h-full">
        <div
          class="shrink-0 size-8 grid place-items-center rounded border"
          :style="iconStyle"
        >
          <span class="text-[17px] leading-none">{{ typeIcon[device.type] }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] font-semibold truncate leading-tight">
              {{ device.name }}
            </span>
            <span
              v-if="device.status"
              :class="[
                'size-1.5 rounded-full shrink-0',
                device.status === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]'
                  : device.status === 'warning'
                    ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.7)]'
                    : 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]',
              ]"
            ></span>
          </div>
          <div class="text-[10px] truncate leading-tight">
            <span class="font-medium" :style="typeBadgeStyle">{{ typeLabel[device.type] }}</span>
            <span class="text-slate-600 mx-1">·</span>
            <span :class="['font-mono', isOffline ? 'text-slate-600' : 'text-slate-300']">{{ device.ip }}</span>
          </div>
        </div>
      </div>

      <div v-if="showPing" class="ping-stack">
        <div v-if="pingOn && !isOffline" class="proto-row">
          <span
            v-for="p in PROTOCOLS"
            :key="p"
            :class="['proto-chip', protoStatus[p] ? 'proto-ok' : 'proto-bad']"
            :title="protoTitle(p)"
          >
            {{ p }}
          </span>
        </div>
        <button
          type="button"
          :class="[
            'ping-toggle',
            isOffline ? 'ping-disabled' : `ping-${pingHealth} ${pingOn ? 'ping-on' : 'ping-off'}`,
            (isAutoMonitored || isUnreachable) && !isOffline ? 'ping-locked' : '',
          ]"
          :disabled="isOffline || isAutoMonitored || isUnreachable"
          :title="
            isOffline
              ? '设备离线，无法 PING'
              : isUnreachable
                ? '子节点 · 网络不通'
                : isAutoMonitored
                  ? '子节点 · 自动监测中'
                  : pingOn
                    ? '关闭 PING'
                    : '开启 PING'
          "
          @click.stop="onTogglePing"
          @mousedown.stop
        >
          <span class="ping-dot" :class="pingOn && !isOffline ? 'ping-dot-active' : ''"></span>
          <template v-if="isOffline">
            <span class="ping-tag">离线</span>
          </template>
          <template v-else-if="!pingOn">
            <span class="ping-tag">PING</span>
          </template>
          <template v-else-if="isUnreachable">
            <span class="ping-tag">不通</span>
          </template>
          <template v-else>
            <span class="ping-stat">{{ pingLatencyText }}</span>
            <span class="ping-sep">·</span>
            <span class="ping-stat">{{ pingLossText }}</span>
          </template>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.topo-card-offline {
  filter: grayscale(0.7);
}
.child-badge {
  position: absolute;
  top: -7px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px 1px 5px;
  border-radius: 999px;
  border: 1px solid;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
  z-index: 8;
  backdrop-filter: blur(2px);
}
.child-badge-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 4px currentColor;
  flex-shrink: 0;
}
.metric-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 10px;
  line-height: 12px;
}
.metric-label {
  color: rgb(148 163 184);
  width: 26px;
  flex-shrink: 0;
}
.topo-card-offline .metric-label {
  color: rgb(71 85 105);
}
.metric-pct {
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-variant-numeric: tabular-nums;
  width: 30px;
  flex-shrink: 0;
  text-align: right;
}
.metric-abs {
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-variant-numeric: tabular-nums;
  color: rgb(100 116 139);
  margin-left: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topo-card-offline .metric-abs {
  color: rgb(71 85 105);
}

.ping-stack {
  position: absolute;
  bottom: 4px;
  right: 6px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  z-index: 7;
}
.ping-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1.5px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgb(51 65 85);
  color: rgb(100 116 139);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.2s;
}
.proto-row {
  display: flex;
  align-items: center;
  gap: 3px;
}
.proto-chip {
  font-size: 8px;
  font-weight: 700;
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid;
  letter-spacing: 0.04em;
  cursor: help;
  line-height: 1;
}
.proto-ok {
  color: rgb(165 243 252);
  border-color: rgba(34, 211, 238, 0.6);
  background: rgba(8, 51, 68, 0.7);
}
.proto-bad {
  color: rgb(254 205 211);
  border-color: rgba(244, 63, 94, 0.6);
  background: rgba(76, 5, 25, 0.7);
}
.ping-toggle:hover:not(:disabled) {
  border-color: rgb(34 211 238);
  color: rgb(207 250 254);
}
.ping-disabled {
  cursor: not-allowed;
  opacity: 0.55;
  border-color: rgb(51 65 85);
  color: rgb(100 116 139);
  background: rgba(15, 23, 42, 0.6);
}
.ping-locked {
  cursor: default;
}
.ping-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(100 116 139);
  flex-shrink: 0;
}
.ping-disabled .ping-dot {
  background: rgb(71 85 105);
}
.ping-dot-active {
  animation: ping-dot-pulse 1.1s ease-in-out infinite;
}
@keyframes ping-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}
.ping-tag {
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  letter-spacing: 0.08em;
}
.ping-stat {
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.ping-sep {
  color: rgba(148, 163, 184, 0.6);
}

.ping-on.ping-ok {
  background: rgba(8, 51, 68, 0.9);
  border-color: rgb(34 211 238);
  color: rgb(165 243 252);
  box-shadow: 0 0 6px rgba(34, 211, 238, 0.35);
}
.ping-on.ping-ok .ping-dot { background: rgb(34 211 238); box-shadow: 0 0 4px rgba(34,211,238,0.7); }

.ping-on.ping-warn {
  background: rgba(69, 26, 3, 0.9);
  border-color: rgb(245 158 11);
  color: rgb(254 215 170);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
}
.ping-on.ping-warn .ping-dot { background: rgb(245 158 11); box-shadow: 0 0 4px rgba(245,158,11,0.7); }

.ping-on.ping-bad {
  background: rgba(76, 5, 25, 0.9);
  border-color: rgb(244 63 94);
  color: rgb(254 205 211);
  box-shadow: 0 0 6px rgba(244, 63, 94, 0.4);
}
.ping-on.ping-bad .ping-dot { background: rgb(244 63 94); box-shadow: 0 0 4px rgba(244,63,94,0.8); }
</style>
