<script setup lang="ts">
import { ref } from 'vue';
import DeviceList from './components/DeviceList.vue';
import MultiTopologyGrid from './components/MultiTopologyGrid.vue';
import PortContextMenu from './components/PortContextMenu.vue';
import NicDetailPanel from './components/NicDetailPanel.vue';
import NicConfigDialog from './components/NicConfigDialog.vue';
import AddDeviceDialog from './components/AddDeviceDialog.vue';
import { selectableDevices } from './data/devices';

const selectedIds = ref<string[]>([selectableDevices[0].id]);
const sidebarCollapsed = ref(false);

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value;
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
}

function onClosePanel(id: string): void {
  if (selectedIds.value.length > 1) {
    selectedIds.value = selectedIds.value.filter((i) => i !== id);
  }
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
        <div class="ml-auto text-[11px] text-slate-500 hidden sm:block">
          Vue 3 · TypeScript · Vite · Tailwind · VueFlow · ECharts
        </div>
      </header>
      <div class="flex-1 min-h-0">
        <MultiTopologyGrid :ids="selectedIds" @close="onClosePanel" />
      </div>
    </main>

    <PortContextMenu />
    <NicDetailPanel />
    <NicConfigDialog />
    <AddDeviceDialog :root-id="selectedIds[0]" />
  </div>
</template>
