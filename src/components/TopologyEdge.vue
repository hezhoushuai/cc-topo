<script setup lang="ts">
import { computed } from 'vue';
import { BaseEdge, getBezierPath } from '@vue-flow/core';
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
</script>

<template>
  <BaseEdge :id="id" :path="path[0]" :style="style" :marker-end="markerEnd" />
</template>
