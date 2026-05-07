<script setup lang="ts">
import { computed, inject } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { NodeProps } from '@vue-flow/core';
import { metricsOf } from '../composables/useMetrics';
import { ensureNicsFor } from '../store/nics';
import { openPortMenu } from '../store/ui';
import { PingServiceKey, TogglePortKey } from '../composables/topologyKey';
import { PORT_COUNT, portIdLeft, portIdRight, portPositions } from '../utils/ports';
import { CAPACITY, fmtCpuUsage, fmtDiskUsage, fmtMemUsage } from '../utils/capacity';
import { TYPE_THEME } from '../utils/theme';
import type { DeviceType, NicInfo, NodeData, TogglePortInfo } from '../types/topology';

const props = defineProps<NodeProps<NodeData>>();

const device = computed(() => props.data.device);
const role = computed(() => props.data.role);
const m = computed(() => metricsOf(device.value.id));
const cap = computed(() => CAPACITY[device.value.type]);
const theme = computed(() => TYPE_THEME[device.value.type]);

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
  return nic.kind === 'wireless' ? 'active-wireless' : 'active-wired';
}

function onPortContext(e: MouseEvent, portId: string): void {
  e.preventDefault();
  e.stopPropagation();
  openPortMenu(e.clientX, e.clientY, { deviceId: device.value.id, nicId: portId });
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

const showPing = computed(() => role.value !== 'center');
const pingOn = computed(() => pingService?.isOn(device.value.id) ?? false);
const pingSummary = computed(() =>
  pingService?.summary(device.value.id) ?? { latency: null, loss: 0, samples: 0 },
);

const pingHealth = computed<'idle' | 'ok' | 'warn' | 'bad'>(() => {
  if (!pingOn.value) return 'idle';
  const s = pingSummary.value;
  if (s.samples === 0) return 'ok';
  const lat = s.latency ?? 9999;
  if (s.loss > 0.05 || lat > 150) return 'bad';
  if (s.loss > 0.01 || lat > 60) return 'warn';
  return 'ok';
});

const pingLatencyText = computed(() => {
  const s = pingSummary.value;
  if (!pingOn.value || s.samples === 0) return '—';
  if (s.latency === null) return '丢失';
  return `${s.latency.toFixed(0)}ms`;
});

const pingLossText = computed(() => {
  const s = pingSummary.value;
  if (!pingOn.value || s.samples === 0) return '0%';
  return `${(s.loss * 100).toFixed(0)}%`;
});

function onTogglePing(): void {
  pingService?.toggle(device.value.id);
}

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
  if (v >= 85) return '#f43f5e';
  if (v >= 65) return '#f59e0b';
  return theme.value.primaryLight;
}

const cardStyle = computed(() => {
  const t = theme.value;
  let shadow: string;
  if (role.value === 'center') {
    shadow = `0 0 26px ${t.glow}, 0 0 0 1.5px ${t.border} inset`;
  } else if (role.value === 'hub') {
    shadow = `0 0 14px ${t.glow}`;
  } else {
    shadow = '0 1px 3px rgba(0,0,0,0.4)';
  }
  return {
    width: '240px',
    height: '168px',
    padding: '10px 12px',
    borderColor: t.border,
    background: t.background,
    boxShadow: shadow,
  };
});

const iconStyle = computed(() => ({
  background: theme.value.iconBg,
  borderColor: theme.value.iconBorder,
}));

const typeBadgeStyle = computed(() => ({
  color: theme.value.badgeText,
}));

const centerBadgeStyle = computed(() => ({
  background: theme.value.primary,
  color: '#0a0f1c',
}));

function fmtPct(v: number): string {
  return `${v.toFixed(0)}%`;
}
</script>

<template>
  <div
    class="topo-card relative rounded-xl border backdrop-blur-sm text-slate-100"
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
      <span class="topo-port-label">{{ nicByPort(portIdLeft(i))?.name?.replace(/^(eth|wlan|Gi0\/)/, '') }}</span>
    </div>
    <div
      v-for="(top, i) in rightPositions"
      :key="`PR${i}`"
      :class="['topo-port topo-port-right', portKindClass(portIdRight(i))]"
      :style="{ top: top + '%' }"
      :title="`${nicByPort(portIdRight(i))?.name} · 右键管理`"
      @contextmenu="(e) => onPortContext(e, portIdRight(i))"
    >
      <span class="topo-port-label">{{ nicByPort(portIdRight(i))?.name?.replace(/^(eth|wlan|Gi0\/)/, '') }}</span>
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

    <div class="flex items-start gap-2.5 mb-2">
      <div
        class="shrink-0 size-9 grid place-items-center rounded-lg border"
        :style="iconStyle"
      >
        <span class="text-[22px] leading-none">{{ typeIcon[device.type] }}</span>
      </div>
      <div class="min-w-0 flex-1 pt-0.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[13px] font-semibold truncate leading-tight">
            {{ device.name }}
          </span>
          <span
            v-if="device.status"
            :class="[
              'size-2 rounded-full shrink-0',
              device.status === 'online'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]'
                : device.status === 'warning'
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                  : 'bg-rose-500',
            ]"
          ></span>
        </div>
        <div
          class="text-[10px] leading-tight mt-0.5 truncate font-medium"
          :style="typeBadgeStyle"
        >
          {{ theme.label }} · {{ portCfg.left + portCfg.right }} 端口
        </div>
        <div class="text-[10.5px] font-mono text-slate-300 leading-tight mt-0.5 truncate">
          {{ device.ip }}
        </div>
      </div>
    </div>

    <div class="space-y-1">
      <div class="metric-row">
        <div class="metric-line">
          <span class="metric-label">CPU</span>
          <span class="metric-pct" :style="{ color: metricColor(m.cpu) }">{{ fmtPct(m.cpu) }}</span>
          <span class="metric-abs">{{ fmtCpuUsage(m.cpu, cap.cpuCores) }}</span>
        </div>
        <div class="metric-bar"><span :style="{ width: m.cpu + '%', background: metricColor(m.cpu) }"></span></div>
      </div>
      <div class="metric-row">
        <div class="metric-line">
          <span class="metric-label">内存</span>
          <span class="metric-pct" :style="{ color: metricColor(m.mem) }">{{ fmtPct(m.mem) }}</span>
          <span class="metric-abs">{{ fmtMemUsage(m.mem, cap.memMB) }}</span>
        </div>
        <div class="metric-bar"><span :style="{ width: m.mem + '%', background: metricColor(m.mem) }"></span></div>
      </div>
      <div class="metric-row">
        <div class="metric-line">
          <span class="metric-label">磁盘</span>
          <span class="metric-pct" :style="{ color: metricColor(m.disk) }">{{ fmtPct(m.disk) }}</span>
          <span class="metric-abs">{{ fmtDiskUsage(m.disk, cap.diskGB) }}</span>
        </div>
        <div class="metric-bar"><span :style="{ width: m.disk + '%', background: metricColor(m.disk) }"></span></div>
      </div>
    </div>

    <div
      v-if="role === 'center'"
      class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-lg"
      :style="centerBadgeStyle"
    >
      当前设备
    </div>

    <button
      v-if="showPing"
      type="button"
      :class="['ping-toggle', `ping-${pingHealth}`, pingOn ? 'ping-on' : 'ping-off']"
      :title="pingOn ? '关闭 PING' : '开启 PING'"
      @click.stop="onTogglePing"
      @mousedown.stop
    >
      <span class="ping-dot" :class="pingOn ? 'ping-dot-active' : ''"></span>
      <template v-if="!pingOn">
        <span class="ping-tag">PING</span>
      </template>
      <template v-else>
        <span class="ping-stat">{{ pingLatencyText }}</span>
        <span class="ping-sep">·</span>
        <span class="ping-stat">{{ pingLossText }}</span>
      </template>
    </button>
  </div>
</template>

<style scoped>
.metric-row {
  display: block;
}
.metric-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10px;
  line-height: 12px;
}
.metric-label {
  color: rgb(148 163 184);
  width: 26px;
  flex-shrink: 0;
}
.metric-pct {
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-variant-numeric: tabular-nums;
  width: 32px;
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

.ping-toggle {
  position: absolute;
  bottom: 6px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgb(51 65 85);
  color: rgb(100 116 139);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.2s;
  z-index: 7;
}

.ping-toggle:hover {
  border-color: rgb(34 211 238);
  color: rgb(207 250 254);
}

.ping-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(100 116 139);
  flex-shrink: 0;
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
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.35);
}
.ping-on.ping-ok .ping-dot { background: rgb(34 211 238); box-shadow: 0 0 6px rgba(34,211,238,0.7); }

.ping-on.ping-warn {
  background: rgba(69, 26, 3, 0.9);
  border-color: rgb(245 158 11);
  color: rgb(254 215 170);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.35);
}
.ping-on.ping-warn .ping-dot { background: rgb(245 158 11); box-shadow: 0 0 6px rgba(245,158,11,0.7); }

.ping-on.ping-bad {
  background: rgba(76, 5, 25, 0.9);
  border-color: rgb(244 63 94);
  color: rgb(254 205 211);
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.4);
}
.ping-on.ping-bad .ping-dot { background: rgb(244 63 94); box-shadow: 0 0 6px rgba(244,63,94,0.8); }
</style>
