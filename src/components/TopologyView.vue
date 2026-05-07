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
import { getPingSummary, isPingOn, togglePing, usePingTicker } from '../store/ping';
import { PingServiceKey, TogglePortKey } from '../composables/topologyKey';
import DeviceNode from './DeviceNode.vue';
import TopologyEdge from './TopologyEdge.vue';

const props = defineProps<{ selectedId: string }>();

useMetrics();
useTrafficTicker();
usePingTicker();

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

provide(PingServiceKey, {
  toggle: (targetId: string) => togglePing(props.selectedId, targetId),
  isOn: (targetId: string) => isPingOn(props.selectedId, targetId),
  summary: (targetId: string) => getPingSummary(props.selectedId, targetId),
});

const layout = computed(() => {
  const t = getTopology(props.selectedId);
  if (!t) return { nodes: [], edges: [] };
  return buildLayout(t, getCollapsedSet(props.selectedId), props.selectedId);
});

const nodes = computed(() => layout.value.nodes);
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
      :min-zoom="0.3"
      :max-zoom="1.6"
      @pane-ready="onPaneReady"
      @pane-click="onPaneClick"
      @move-start="onPaneClick"
    >
      <Background pattern-color="#1f2a44" :gap="22" :size="1.4" />
      <Controls
        position="bottom-right"
        :show-interactive="false"
        class="!bg-slate-900/80 !border !border-slate-700 !rounded-lg overflow-hidden"
      />
    </VueFlow>
  </div>
</template>
