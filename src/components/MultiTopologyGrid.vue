<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import TopologyView from './TopologyView.vue';
import { selectableDevices } from '../data/devices';
import { TYPE_THEME } from '../utils/theme';

const props = defineProps<{ ids: string[]; editMode: boolean }>();
const emit = defineEmits<{
  (e: 'close', id: string): void;
  (e: 'reorder', from: number, to: number): void;
}>();

interface TopoExposed {
  fit: () => void;
}

const containerEl = ref<HTMLElement | null>(null);
const topoRefs = ref<Array<TopoExposed | null>>([]);
const ratios = ref<number[]>([]);

const dragSrc = ref<number | null>(null);
const dragOver = ref<number | null>(null);

const deviceMap = computed(() => {
  const m = new Map<string, (typeof selectableDevices)[number]>();
  for (const d of selectableDevices) m.set(d.id, d);
  return m;
});

function deviceFor(id: string) {
  return deviceMap.value.get(id);
}

function syncRatios(n: number): void {
  if (ratios.value.length !== n) {
    ratios.value = Array(n).fill(1);
  }
}

async function fitAll(): Promise<void> {
  await nextTick();
  setTimeout(() => {
    topoRefs.value.forEach((t) => t?.fit?.());
  }, 100);
}

watch(
  () => props.ids.length,
  (n) => {
    syncRatios(n);
    topoRefs.value = topoRefs.value.slice(0, n);
    fitAll();
  },
  { immediate: true },
);

watch(
  () => props.editMode,
  (on) => {
    if (!on) {
      dragSrc.value = null;
      dragOver.value = null;
    }
  },
);

let activeListeners: { move: (e: MouseEvent) => void; up: () => void } | null = null;

function startResize(idx: number, e: MouseEvent): void {
  if (!props.editMode) return;
  e.preventDefault();
  const startY = e.clientY;
  const a = ratios.value[idx];
  const b = ratios.value[idx + 1];
  const sumAB = a + b;
  const containerH = containerEl.value?.clientHeight ?? 1;
  const totalRatio = ratios.value.reduce((s, r) => s + r, 0);
  const minRatio = 0.12;

  function onMove(ev: MouseEvent): void {
    const dy = ev.clientY - startY;
    const dyRatio = (dy / containerH) * totalRatio;
    let newA = a + dyRatio;
    let newB = b - dyRatio;
    if (newA < minRatio) {
      newA = minRatio;
      newB = sumAB - minRatio;
    }
    if (newB < minRatio) {
      newB = minRatio;
      newA = sumAB - minRatio;
    }
    ratios.value[idx] = newA;
    ratios.value[idx + 1] = newB;
  }
  function onUp(): void {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    activeListeners = null;
    fitAll();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  activeListeners = { move: onMove, up: onUp };
}

onBeforeUnmount(() => {
  if (activeListeners) {
    document.removeEventListener('mousemove', activeListeners.move);
    document.removeEventListener('mouseup', activeListeners.up);
  }
});

function setTopoRef(idx: number, el: unknown): void {
  topoRefs.value[idx] = el as TopoExposed | null;
}

function onDragStart(idx: number, e: DragEvent): void {
  if (!props.editMode || props.ids.length < 2) return;
  dragSrc.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function onDragOver(idx: number, e: DragEvent): void {
  if (dragSrc.value === null || dragSrc.value === idx) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  dragOver.value = idx;
}

function onDragLeave(idx: number): void {
  if (dragOver.value === idx) dragOver.value = null;
}

function onDrop(idx: number, e: DragEvent): void {
  e.preventDefault();
  const src = dragSrc.value;
  dragSrc.value = null;
  dragOver.value = null;
  if (src === null || src === idx) return;

  const newRatios = [...ratios.value];
  const [movedRatio] = newRatios.splice(src, 1);
  newRatios.splice(idx, 0, movedRatio);
  ratios.value = newRatios;

  const newRefs = [...topoRefs.value];
  const [movedRef] = newRefs.splice(src, 1);
  newRefs.splice(idx, 0, movedRef);
  topoRefs.value = newRefs;

  emit('reorder', src, idx);
  fitAll();
}

function onDragEnd(): void {
  dragSrc.value = null;
  dragOver.value = null;
}

function moveBy(idx: number, delta: number): void {
  const target = idx + delta;
  if (target < 0 || target >= props.ids.length) return;

  const newRatios = [...ratios.value];
  const [r] = newRatios.splice(idx, 1);
  newRatios.splice(target, 0, r);
  ratios.value = newRatios;

  const newRefs = [...topoRefs.value];
  const [t] = newRefs.splice(idx, 1);
  newRefs.splice(target, 0, t);
  topoRefs.value = newRefs;

  emit('reorder', idx, target);
  fitAll();
}
</script>

<template>
  <div
    ref="containerEl"
    :class="['flex flex-col h-full w-full overflow-hidden', editMode ? 'select-none' : '']"
  >
    <template v-for="(id, idx) in ids" :key="id">
      <div
        :class="[
          'panel relative min-h-0 min-w-0 overflow-hidden border bg-slate-950/40 transition-[box-shadow,opacity,border-color] duration-150',
          dragSrc === idx ? 'opacity-50' : '',
          dragOver === idx && dragSrc !== null && dragSrc !== idx
            ? 'border-cyan-400 shadow-[inset_0_0_0_2px_rgba(34,211,238,0.7)]'
            : 'border-slate-800/70',
        ]"
        :style="{ flex: ratios[idx] ?? 1 }"
        @dragover="(e) => onDragOver(idx, e)"
        @dragleave="onDragLeave(idx)"
        @drop="(e) => onDrop(idx, e)"
      >
        <div
          :class="[
            'absolute top-2.5 right-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/85 border border-slate-700/70 backdrop-blur-sm shadow',
            editMode && ids.length > 1 ? 'cursor-grab active:cursor-grabbing' : '',
          ]"
          :draggable="editMode && ids.length > 1"
          :title="editMode && ids.length > 1 ? '拖动调整位置' : ''"
          @dragstart="(e) => onDragStart(idx, e)"
          @dragend="onDragEnd"
        >
          <span
            v-if="editMode && ids.length > 1"
            class="text-slate-500 text-[12px] leading-none"
            aria-hidden="true"
          >⋮⋮</span>
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
          <template v-if="editMode && ids.length > 1">
            <button
              type="button"
              :disabled="idx === 0"
              :class="[
                'size-5 grid place-items-center rounded text-[11px] transition',
                idx === 0
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80',
              ]"
              title="上移"
              @click.stop="moveBy(idx, -1)"
              draggable="false"
            >
              ↑
            </button>
            <button
              type="button"
              :disabled="idx === ids.length - 1"
              :class="[
                'size-5 grid place-items-center rounded text-[11px] transition',
                idx === ids.length - 1
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80',
              ]"
              title="下移"
              @click.stop="moveBy(idx, 1)"
              draggable="false"
            >
              ↓
            </button>
          </template>
          <button
            v-if="ids.length > 1"
            type="button"
            class="size-5 grid place-items-center rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition"
            title="关闭此面板"
            draggable="false"
            @click.stop="emit('close', id)"
          >
            ×
          </button>
        </div>
        <TopologyView
          :ref="(el) => setTopoRef(idx, el)"
          :selected-id="id"
        />
      </div>
      <div
        v-if="idx < ids.length - 1"
        :class="['splitter shrink-0', editMode ? 'splitter-active' : '']"
        @mousedown="(e) => startResize(idx, e)"
      >
        <div v-if="editMode" class="splitter-grip"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.splitter {
  height: 1px;
  background: rgba(51, 65, 85, 0.55);
  position: relative;
  transition: height 0.15s ease, background 0.15s ease;
}
.splitter-active {
  height: 8px;
  background: rgba(34, 211, 238, 0.12);
  cursor: row-resize;
}
.splitter-active:hover,
.splitter-active:active {
  background: rgba(34, 211, 238, 0.32);
}
.splitter-grip {
  position: absolute;
  inset: 50% 0 auto 0;
  transform: translateY(-50%);
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    rgba(34, 211, 238, 0.7) 0 8px,
    transparent 8px 14px
  );
  pointer-events: none;
}
</style>
