<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';
import type { EdgeData } from '../types/topology';

const props = defineProps<EdgeProps<EdgeData>>();

const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    curvature: 0.3,
  }),
);

const labelX = computed(() => path.value[1]);
const labelY = computed(() => path.value[2]);
const isUnreachable = computed(() => props.data?.unreachable === true);
</script>

<template>
  <BaseEdge :id="id" :path="path[0]" :style="style" :marker-end="markerEnd" />
  <EdgeLabelRenderer v-if="isUnreachable">
    <div
      class="unreachable-mark"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'none',
      }"
    >
      <span class="unreachable-x">✕</span>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.unreachable-mark {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.95);
  border: 1.5px solid #f43f5e;
  box-shadow: 0 0 6px rgba(244, 63, 94, 0.6);
}
.unreachable-x {
  font-size: 10px;
  font-weight: 800;
  color: #f43f5e;
  line-height: 1;
}
</style>
