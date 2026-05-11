<script setup lang="ts">
import { computed, markRaw, nextTick, provide, reactive, ref, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { getTopology } from '../data/devices';
import { buildLayout } from '../composables/useTopologyLayout';
import { useMetrics } from '../composables/useMetrics';
import { useTrafficTicker } from '../store/traffic';
import { closePortMenu } from '../store/ui';
import { enablePing, getPingSummary, isPingOn, togglePing, usePingTicker, initPingStates } from '../store/ping';
import { getAdditions, removeDevice, initAdditions } from '../store/additions';
import { removeStaticDevice, initRemovals } from '../store/removals';
import { PingServiceKey, RemoveDeviceKey, TogglePortKey } from '../composables/topologyKey';
import DeviceNode from './DeviceNode.vue';
import TopologyEdge from './TopologyEdge.vue';
import { fetchState, fetchPingStates } from '../api/index';

const props = defineProps<{ selectedId: string }>();

useMetrics();
useTrafficTicker();
usePingTicker();

async function initFromApi(rootId: string): Promise<void> {
  try {
    const [state, pingStates] = await Promise.all([
      fetchState(rootId),
      fetchPingStates(rootId),
    ]);
    initAdditions(rootId, state.additions);
    initRemovals(rootId, state.removals);
    initPingStates(rootId, pingStates);
  } catch (err) {
    // Backend may not be running — silently degrade to in-memory only
    console.warn('[TopologyView] Could not load state from API:', err);
  }
}

watch(() => props.selectedId, initFromApi, { immediate: true });

const vfId = `topo-${props.selectedId}`;
const { fitView, findNode, setViewport, viewport } = useVueFlow(vfId);

const collapsedByDevice = reactive<Record<string, Set<string>>>({});

function getCollapsedSet(deviceId: string): Set<string> {
  if (!collapsedByDevice[deviceId]) {
    collapsedByDevice[deviceId] = new Set();
  }
  return collapsedByDevice[deviceId];
}

provide(TogglePortKey, async (deviceId: string, portId: string) => {
  const before = findNode(deviceId);
  const prevX = before?.position?.x ?? null;
  const prevY = before?.position?.y ?? null;

  const set = getCollapsedSet(props.selectedId);
  const next = new Set(set);
  const key = `${deviceId}::${portId}`;
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsedByDevice[props.selectedId] = next;

  await nextTick();

  if (prevX !== null && prevY !== null) {
    const after = findNode(deviceId);
    if (after?.position) {
      const dx = after.position.x - prevX;
      const dy = after.position.y - prevY;
      if (dx !== 0 || dy !== 0) {
        const vp = viewport.value;
        setViewport({
          x: vp.x - dx * vp.zoom,
          y: vp.y - dy * vp.zoom,
          zoom: vp.zoom,
        });
      }
    }
  }
});

provide(RemoveDeviceKey, (deviceId: string) => {
  if (deviceId.startsWith('add-')) {
    removeDevice(props.selectedId, deviceId);
  } else {
    removeStaticDevice(props.selectedId, deviceId);
  }
});

provide(PingServiceKey, {
  toggle: (targetId: string) => togglePing(props.selectedId, targetId),
  isOn: (targetId: string) => isPingOn(props.selectedId, targetId),
  summary: (targetId: string) => getPingSummary(props.selectedId, targetId),
});

function ensureChildPings(): void {
  const t = getTopology(props.selectedId);
  if (t) {
    for (const branch of t.branches) {
      for (const child of branch.children) {
        if (child.isChild) enablePing(props.selectedId, child.id);
      }
    }
  }
  for (const add of getAdditions(props.selectedId)) {
    if (add.device.isChild) enablePing(props.selectedId, add.device.id);
  }
}

const layout = computed(() => {
  const t = getTopology(props.selectedId);
  if (!t) return { nodes: [], edges: [] };
  ensureChildPings();
  return buildLayout(t, getCollapsedSet(props.selectedId), props.selectedId);
});

// 记录用户手动拖动后的坐标，切换拓扑时清空
const draggedPositions = reactive<Record<string, { x: number; y: number }>>({});

watch(() => props.selectedId, () => {
  Object.keys(draggedPositions).forEach((k) => delete draggedPositions[k]);
});

function onNodeDragStop({ node }: { node: { id: string; position: { x: number; y: number } } }): void {
  draggedPositions[node.id] = { x: node.position.x, y: node.position.y };
}

const nodes = computed(() =>
  layout.value.nodes.map((n) =>
    draggedPositions[n.id] ? { ...n, position: draggedPositions[n.id] } : n,
  ),
);
const edges = computed(() => layout.value.edges);

const nodeTypes = { device: markRaw(DeviceNode) };
const edgeTypes = { topology: markRaw(TopologyEdge) };

const flowKey = ref(0);

watch(
  () => props.selectedId,
  async () => {
    flowKey.value += 1;
    await nextTick();
    setTimeout(() => fitView({ padding: 0.18, duration: 400 }), 50);
  },
);

function onPaneReady(): void {
  setTimeout(() => fitView({ padding: 0.18, duration: 400 }), 50);
}

function onPaneClick(): void {
  closePortMenu();
}

defineExpose({
  fit: () => fitView({ padding: 0.18, duration: 300 }),
});
</script>

<template>
  <div class="relative h-full w-full">
    <VueFlow
      :id="vfId"
      :key="flowKey"
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :nodes-draggable="true"
      :nodes-connectable="false"
      :elements-selectable="false"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :min-zoom="0.1"
      :max-zoom="1.6"
      @pane-ready="onPaneReady"
      @pane-click="onPaneClick"
      @move-start="onPaneClick"
      @node-drag-stop="onNodeDragStop"
    >
      <Background pattern-color="#1f2a44" :gap="22" :size="1.4" />
      <Controls
        position="bottom-right"
        :show-interactive="false"
        class="!bg-slate-900/80 !border !border-slate-700 !rounded-lg overflow-hidden"
      />
    </VueFlow>
    <div class="edge-legend">
      <div class="legend-title">连接类型</div>
      <div class="legend-row">
        <svg width="40" height="10" viewBox="0 0 40 10">
          <line x1="0" y1="5" x2="40" y2="5" stroke="#22d3ee" stroke-width="1.8" />
        </svg>
        <span>有线</span>
      </div>
      <div class="legend-row">
        <svg width="40" height="10" viewBox="0 0 40 10">
          <line x1="0" y1="5" x2="40" y2="5" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="8 6" />
        </svg>
        <span>无线</span>
      </div>
      <div class="legend-row">
        <svg width="40" height="10" viewBox="0 0 40 10">
          <line x1="0" y1="5" x2="40" y2="5" stroke="#a855f7" stroke-width="1.8" stroke-dasharray="2 4 10 4" />
        </svg>
        <span>卫星</span>
      </div>
      <div class="legend-row">
        <svg width="40" height="10" viewBox="0 0 40 10">
          <line x1="0" y1="5" x2="40" y2="5" stroke="#f43f5e" stroke-width="2.2" stroke-dasharray="6 4" />
        </svg>
        <span>不通</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edge-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 10;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgb(51, 65, 85);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: rgb(203, 213, 225);
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(4px);
}
.legend-title {
  font-size: 11px;
  color: rgb(148, 163, 184);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 16px;
}
.legend-row svg {
  flex-shrink: 0;
}
</style>
