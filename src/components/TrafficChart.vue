<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SAMPLE_COUNT, getTraffic } from '../store/traffic';
import { isNicActive } from '../store/nicConnections';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const props = defineProps<{ deviceId: string; nicId: string }>();

const connected = computed(() => isNicActive(props.deviceId, props.nicId));

const ZEROS = Array.from({ length: SAMPLE_COUNT }, () => 0);

const traffic = computed(() => {
  if (!connected.value) return { rx: ZEROS, tx: ZEROS };
  return getTraffic(props.deviceId, props.nicId);
});

const lastRx = computed(() => traffic.value.rx[SAMPLE_COUNT - 1] ?? 0);
const lastTx = computed(() => traffic.value.tx[SAMPLE_COUNT - 1] ?? 0);

function fmt(v: number): string {
  if (v >= 1024) return `${(v / 1024).toFixed(2)} MB/s`;
  return `${v.toFixed(0)} KB/s`;
}

function fmtAxis(v: number): string {
  if (v >= 1024) return `${(v / 1024).toFixed(1)}M`;
  return `${v.toFixed(0)}K`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function timeForIndex(idx: number): string {
  const minutesAgo = SAMPLE_COUNT - 1 - idx;
  const t = new Date(Date.now() - minutesAgo * 60 * 1000);
  return `${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
}

const xLabels = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
  const ago = SAMPLE_COUNT - 1 - i;
  if (ago === 0) return '现在';
  if (ago % 5 === 0) return `-${ago}m`;
  return '';
});

interface AxisParam {
  seriesName?: string;
  value?: number;
  color?: string;
  dataIndex: number;
}

const baseOption = shallowRef({
  animation: false,
  grid: { left: 44, right: 10, top: 14, bottom: 22, containLabel: false },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderColor: '#334155',
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'ui-monospace, monospace' },
    axisPointer: {
      type: 'line',
      lineStyle: { color: '#475569', type: 'dashed', width: 1 },
    },
    formatter: (raw: AxisParam | AxisParam[]) => {
      const params = Array.isArray(raw) ? raw : [raw];
      if (params.length === 0) return '';
      const time = timeForIndex(params[0].dataIndex);
      let html = `<div style="font-size:10px;color:#94a3b8;margin-bottom:4px;font-family:ui-monospace,monospace">${time}</div>`;
      for (const p of params) {
        const v = Number(p.value ?? 0);
        html += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;line-height:1.4">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
          <span style="color:#94a3b8">${p.seriesName ?? ''}</span>
          <span style="color:#e2e8f0;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;margin-left:auto;padding-left:14px">${fmt(v)}</span>
        </div>`;
      }
      return html;
    },
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: xLabels,
    axisLine: { lineStyle: { color: '#1e293b' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', fontSize: 10, interval: 0, fontFamily: 'ui-monospace, monospace' },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: 'rgba(30,41,59,0.7)', type: 'dashed' } },
    axisLabel: {
      color: '#64748b',
      fontSize: 10,
      formatter: fmtAxis,
      fontFamily: 'ui-monospace, monospace',
    },
  },
});

const option = computed(() => ({
  ...baseOption.value,
  series: [
    {
      name: '下行',
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: traffic.value.rx,
      lineStyle: { color: '#22d3ee', width: 1.8 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(34,211,238,0.45)' },
            { offset: 1, color: 'rgba(34,211,238,0)' },
          ],
        },
      },
    },
    {
      name: '上行',
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: traffic.value.tx,
      lineStyle: { color: '#f59e0b', width: 1.8 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245,158,11,0.32)' },
            { offset: 1, color: 'rgba(245,158,11,0)' },
          ],
        },
      },
    },
  ],
}));
</script>

<template>
  <div class="rounded-md border border-slate-800/80 bg-slate-950/60 p-3 relative">
    <div class="flex items-center justify-between mb-2">
      <div class="text-[11px] text-slate-400 flex items-center gap-2">
        近 20 分钟流量
        <span
          v-if="!connected"
          class="text-[10px] px-1.5 py-px rounded bg-slate-800/80 border border-slate-700 text-slate-500"
        >
          未接入网络
        </span>
      </div>
      <div class="flex items-center gap-3 text-[11px] font-mono">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-cyan-400"></span>
          <span class="text-slate-400">下行</span>
          <span class="text-cyan-300 tabular-nums">{{ fmt(lastRx) }}</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-amber-400"></span>
          <span class="text-slate-400">上行</span>
          <span class="text-amber-300 tabular-nums">{{ fmt(lastTx) }}</span>
        </span>
      </div>
    </div>
    <div class="relative">
      <v-chart class="chart" :option="option" autoresize />
      <div
        v-if="!connected"
        class="absolute inset-0 grid place-items-center pointer-events-none text-[11px] text-slate-500"
      >
        网卡未接入网络 · 暂无流量
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart {
  width: 100%;
  height: 160px;
}
</style>
