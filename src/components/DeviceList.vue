<script setup lang="ts">
import { computed, ref } from 'vue';
import { selectableDevices } from '../data/devices';
import { getTypeTheme } from '../utils/theme';
import { getTypeIcon, isTypeIconColored } from '../data/deviceTypes';
import type { SelectableDevice } from '../types/topology';

const props = defineProps<{ selectedIds: string[]; collapsed: boolean }>();
const emit = defineEmits<{
  (e: 'select', id: string, mode: 'replace' | 'toggle'): void;
  (e: 'toggle'): void;
}>();

const keyword = ref('');

const filtered = computed<SelectableDevice[]>(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return selectableDevices;
  return selectableDevices.filter(
    (d) =>
      d.name.toLowerCase().includes(k) ||
      d.ip.toLowerCase().includes(k) ||
      d.description.toLowerCase().includes(k),
  );
});

function typeIcon(type: string): string { return getTypeIcon(type); }

const statusColor: Record<NonNullable<SelectableDevice['status']>, string> = {
  online: 'bg-emerald-400',
  warning: 'bg-amber-400',
  offline: 'bg-rose-400',
};

const selectedSet = computed(() => new Set(props.selectedIds));
const orderIndex = computed(() => {
  const m = new Map<string, number>();
  props.selectedIds.forEach((id, i) => m.set(id, i + 1));
  return m;
});

function onClick(e: MouseEvent, id: string): void {
  const mode = e.ctrlKey || e.metaKey ? 'toggle' : 'replace';
  emit('select', id, mode);
}

</script>

<template>
  <aside
    :class="[
      'relative h-full shrink-0 border-r border-slate-800/80 bg-slate-950/60 overflow-hidden transition-[width] duration-200 ease-out',
      collapsed ? 'w-12' : 'w-[300px]',
    ]"
  >
    <!-- Compact pane: always 48px wide, fades in/out -->
    <div
      class="absolute inset-y-0 left-0 w-12 flex flex-col transition-opacity duration-150"
      :class="collapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      :inert="!collapsed || undefined"
    >
      <div class="h-12 flex items-center justify-center border-b border-slate-800/80">
        <button
          type="button"
          class="size-8 grid place-items-center rounded-md text-cyan-300 hover:bg-slate-800/70 transition"
          title="展开列表"
          @click="emit('toggle')"
        >
          »
        </button>
      </div>
      <div class="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-2 hide-scrollbar">
        <button
          v-for="d in selectableDevices"
          :key="`c-${d.id}`"
          type="button"
          :title="`${d.name} · ${d.ip}`"
          :class="[
            'relative size-8 grid place-items-center rounded-md border text-[15px] transition shrink-0',
            selectedSet.has(d.id) ? '' : 'opacity-70 hover:opacity-100',
          ]"
          :style="{
            background: getTypeTheme(d.type).iconBg,
            borderColor: selectedSet.has(d.id)
              ? getTypeTheme(d.type).primary
              : getTypeTheme(d.type).iconBorder,
            boxShadow: selectedSet.has(d.id)
              ? `0 0 8px ${getTypeTheme(d.type).glow}`
              : 'none',
          }"
          @click="(e) => onClick(e, d.id)"
        >
          <img
            v-if="isTypeIconColored(d.type)"
            :src="typeIcon(d.type)"
            :alt="d.type"
            class="size-5 select-none"
            draggable="false"
          />
          <span
            v-else
            class="device-type-icon size-5 select-none"
            :style="{
              backgroundColor: getTypeTheme(d.type).primaryLight,
              WebkitMaskImage: `url(${typeIcon(d.type)})`,
              maskImage: `url(${typeIcon(d.type)})`,
            }"
            :title="d.type"
          ></span>
          <span
            v-if="selectedSet.has(d.id)"
            class="absolute -top-1 -right-1 size-3.5 rounded-full bg-cyan-400 text-[8px] font-bold text-slate-950 grid place-items-center shadow"
          >
            {{ orderIndex.get(d.id) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Expanded pane: always 300px wide, fades in/out -->
    <div
      class="absolute inset-y-0 left-0 w-[300px] flex flex-col transition-opacity duration-150"
      :class="collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'"
      :inert="collapsed || undefined"
    >
      <div class="p-4 border-b border-slate-800/80 shrink-0">
        <div class="flex items-center gap-2 mb-3">
          <div
            class="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)] shrink-0"
          ></div>
          <h1 class="text-sm font-semibold tracking-wide text-slate-200">设备清单</h1>
          <span class="ml-auto text-xs text-slate-500">
            {{ selectedIds.length }} / {{ filtered.length }}
          </span>
          <button
            type="button"
            class="size-7 grid place-items-center rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 transition"
            title="收起列表"
            @click="emit('toggle')"
          >
            «
          </button>
        </div>
        <div class="relative">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索名称 / IP / 描述"
            class="w-full bg-slate-900/80 border border-slate-800 focus:border-cyan-500/70 focus:outline-none rounded-md px-3 py-2 pl-8 text-xs text-slate-200 placeholder:text-slate-500 transition-colors"
          />
          <svg
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m20 20-3.5-3.5"></path>
          </svg>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-2 stable-gutter">
        <button
          v-for="d in filtered"
          :key="`e-${d.id}`"
          type="button"
          :class="[
            'group block w-full text-left px-4 py-3 transition-colors border-l-2',
            selectedSet.has(d.id)
              ? 'bg-cyan-500/10 border-l-cyan-400'
              : 'border-l-transparent hover:bg-slate-800/40 hover:border-l-slate-600',
          ]"
          @click="(e) => onClick(e, d.id)"
        >
          <div class="flex items-start gap-3">
            <span
              class="size-7 mt-0.5 grid place-items-center rounded-md border select-none shrink-0 relative"
              :style="{
                background: getTypeTheme(d.type).iconBg,
                borderColor: getTypeTheme(d.type).iconBorder,
              }"
            >
              <img
                v-if="isTypeIconColored(d.type)"
                :src="typeIcon(d.type)"
                :alt="d.type"
                class="size-[18px]"
                draggable="false"
              />
              <span
                v-else
                class="device-type-icon size-[18px]"
                :style="{
                  backgroundColor: getTypeTheme(d.type).primaryLight,
                  WebkitMaskImage: `url(${typeIcon(d.type)})`,
                  maskImage: `url(${typeIcon(d.type)})`,
                }"
              ></span>
              <span
                v-if="selectedSet.has(d.id)"
                class="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-cyan-400 text-[9px] font-bold text-slate-950 grid place-items-center shadow"
              >
                {{ orderIndex.get(d.id) }}
              </span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'truncate text-sm font-medium',
                    selectedSet.has(d.id) ? 'text-cyan-200' : 'text-slate-200',
                  ]"
                >
                  {{ d.name }}
                </span>
                <span
                  v-if="d.status"
                  :class="['size-1.5 rounded-full shrink-0', statusColor[d.status]]"
                ></span>
              </div>
              <div
                class="text-[10px] mt-0.5 truncate font-medium"
                :style="{ color: getTypeTheme(d.type).badgeText }"
              >
                {{ getTypeTheme(d.type).label }}
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5 truncate font-mono">{{ d.ip }}</div>
              <div class="text-[10.5px] text-slate-600 mt-0.5 truncate">{{ d.description }}</div>
            </div>
          </div>
        </button>
        <div v-if="filtered.length === 0" class="text-center text-xs text-slate-600 py-6">
          没有匹配的设备
        </div>
      </div>

      <div
        class="border-t border-slate-800/80 p-3 text-[11px] text-slate-500 leading-relaxed shrink-0"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <span class="inline-block w-5 h-0.5 bg-cyan-400 rounded"></span>
          <span>有线连接</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-block w-5 h-0.5 rounded"
            style="background: repeating-linear-gradient(90deg, #f59e0b 0 4px, transparent 4px 7px)"
          ></span>
          <span>无线连接</span>
        </div>
        <p class="mt-2 text-slate-600">
          点击切换设备 ·
          <kbd
            class="px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px]"
          >Ctrl</kbd>
          + 点击 多选并分屏
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.stable-gutter {
  scrollbar-gutter: stable;
}
.hide-scrollbar {
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
