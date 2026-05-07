<script setup lang="ts">
import { computed } from 'vue';
import TopologyView from './TopologyView.vue';
import { selectableDevices } from '../data/devices';
import { TYPE_THEME } from '../utils/theme';

const props = defineProps<{ ids: string[] }>();
const emit = defineEmits<{ (e: 'close', id: string): void }>();

const gridClass = computed(() => {
  const n = props.ids.length;
  if (n <= 1) return 'grid-cols-1 grid-rows-1';
  if (n === 2) return 'grid-cols-2 grid-rows-1';
  if (n === 3) return 'grid-cols-3 grid-rows-1';
  if (n === 4) return 'grid-cols-2 grid-rows-2';
  return 'grid-cols-3 grid-rows-2';
});

const deviceMap = computed(() => {
  const m = new Map<string, (typeof selectableDevices)[number]>();
  for (const d of selectableDevices) m.set(d.id, d);
  return m;
});

function deviceFor(id: string) {
  return deviceMap.value.get(id);
}
</script>

<template>
  <div :class="['grid h-full w-full gap-1.5 p-1.5', gridClass]">
    <div
      v-for="(id, idx) in ids"
      :key="id"
      class="panel relative min-h-0 min-w-0 rounded-lg overflow-hidden border border-slate-800/70 bg-slate-950/40"
    >
      <div
        class="absolute top-2.5 right-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/85 border border-slate-700/70 backdrop-blur-sm shadow"
      >
        <span
          v-if="ids.length > 1"
          class="size-4 rounded-full bg-cyan-400 text-[9px] font-bold text-slate-950 grid place-items-center"
        >{{ idx + 1 }}</span>
        <span
          v-if="deviceFor(id)"
          class="text-[11px] font-semibold"
          :style="{ color: TYPE_THEME[deviceFor(id)!.type].badgeText }"
        >
          {{ deviceFor(id)?.name }}
        </span>
        <button
          v-if="ids.length > 1"
          type="button"
          class="size-5 grid place-items-center rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition"
          title="关闭此面板"
          @click="emit('close', id)"
        >
          ×
        </button>
      </div>
      <TopologyView :selected-id="id" />
    </div>
  </div>
</template>
