<script setup lang="ts">
import { computed, ref } from 'vue';
import DeviceList from './components/DeviceList.vue';
import MultiTopologyGrid from './components/MultiTopologyGrid.vue';
import PortContextMenu from './components/PortContextMenu.vue';
import NicDetailPanel from './components/NicDetailPanel.vue';
import NicConfigDialog from './components/NicConfigDialog.vue';
import AddDeviceDialog from './components/AddDeviceDialog.vue';
import { selectableDevices } from './data/devices';

const selectedIds = ref<string[]>([selectableDevices[0].id]);
const sidebarCollapsed = ref(false);
const editMode = ref(false);

const canEdit = computed(() => selectedIds.value.length >= 2);

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function toggleEditMode(): void {
  if (!canEdit.value) {
    editMode.value = false;
    return;
  }
  editMode.value = !editMode.value;
}

function onSelect(id: string, mode: 'replace' | 'toggle'): void {
  if (mode === 'toggle') {
    if (selectedIds.value.includes(id)) {
      if (selectedIds.value.length > 1) {
        selectedIds.value = selectedIds.value.filter((i) => i !== id);
      }
    } else {
      selectedIds.value = [...selectedIds.value, id];
    }
  } else {
    selectedIds.value = [id];
  }
  if (selectedIds.value.length < 2) editMode.value = false;
}

function onClosePanel(id: string): void {
  if (selectedIds.value.length > 1) {
    selectedIds.value = selectedIds.value.filter((i) => i !== id);
  }
  if (selectedIds.value.length < 2) editMode.value = false;
}

function onReorder(from: number, to: number): void {
  if (from === to) return;
  if (from < 0 || to < 0) return;
  if (from >= selectedIds.value.length || to >= selectedIds.value.length) return;
  const next = [...selectedIds.value];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  selectedIds.value = next;
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
    <DeviceList
      :selected-ids="selectedIds"
      :collapsed="sidebarCollapsed"
      @select="onSelect"
      @toggle="toggleSidebar"
    />
    <main class="flex-1 flex flex-col min-w-0">
      <header
        class="h-14 shrink-0 flex items-center px-5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="size-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 grid place-items-center text-slate-950 font-black text-sm"
          >
            T
          </div>
          <h1 class="text-sm font-semibold text-slate-100 tracking-wide">网络拓扑可视化</h1>
          <span
            v-if="selectedIds.length > 1"
            class="ml-3 px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-200"
          >
            {{ selectedIds.length }} 个设备 · 分屏对比
          </span>
        </div>
        <button
          v-if="canEdit"
          type="button"
          :class="[
            'ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition border',
            editMode
              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
              : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300',
          ]"
          :title="editMode ? '完成调整' : '进入分屏配置模式'"
          @click="toggleEditMode"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
            <circle cx="8" cy="9" r="1.6" fill="currentColor"></circle>
            <circle cx="16" cy="15" r="1.6" fill="currentColor"></circle>
          </svg>
          {{ editMode ? '完成调整' : '分屏配置' }}
        </button>
        <div class="ml-auto text-[11px] text-slate-500 hidden sm:block">
          Vue 3 · TypeScript · Vite · Tailwind · VueFlow · ECharts
        </div>
      </header>
      <div class="flex-1 min-h-0">
        <MultiTopologyGrid
          :ids="selectedIds"
          :edit-mode="editMode"
          @close="onClosePanel"
          @reorder="onReorder"
        />
      </div>
    </main>

    <PortContextMenu />
    <NicDetailPanel />
    <NicConfigDialog />
    <AddDeviceDialog :root-id="selectedIds[0]" />
  </div>
</template>
