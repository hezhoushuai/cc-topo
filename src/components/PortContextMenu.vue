<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import {
  closePortMenu,
  openAddDeviceDialog,
  openDetailPanel,
  portMenu,
} from '../store/ui';
import { getNic } from '../store/nics';

const nic = computed(() =>
  portMenu.deviceId && portMenu.nicId && portMenu.isCenter
    ? getNic(portMenu.deviceId, portMenu.nicId)
    : undefined,
);

const menuStyle = computed(() => {
  const W = 196;
  const H = portMenu.isCenter ? 148 : 50;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = Math.min(portMenu.x, vw - W - 8);
  const y = Math.min(portMenu.y, vh - H - 8);
  return { left: `${x}px`, top: `${y}px` };
});

function ctx(): { deviceId: string; nicId: string } {
  return { deviceId: portMenu.deviceId, nicId: portMenu.nicId };
}

function onDetail(): void {
  openDetailPanel(ctx());
  closePortMenu();
}
function onAdd(): void {
  openAddDeviceDialog(ctx());
  closePortMenu();
}

function onDocClick(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (target?.closest('.port-menu') || target?.closest('.topo-port')) return;
  closePortMenu();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closePortMenu();
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('contextmenu', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('contextmenu', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="portMenu.visible"
      class="port-menu fixed z-[1000] w-[196px] rounded-lg border border-slate-700/80 bg-slate-900/97 backdrop-blur-md shadow-2xl ring-1 ring-cyan-500/20 overflow-hidden text-slate-200"
      :style="menuStyle"
    >
      <div
        v-if="portMenu.isCenter"
        class="px-3 py-2 border-b border-slate-800 bg-slate-950/80"
      >
        <div class="text-[10px] uppercase tracking-wider text-slate-500">网卡</div>
        <div class="text-[12px] font-mono font-semibold text-cyan-300 truncate">
          {{ nic?.name ?? portMenu.nicId }}
        </div>
        <div class="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
          {{ nic?.ip }}
        </div>
      </div>
      <button
        v-if="portMenu.isCenter"
        type="button"
        class="menu-item"
        @click="onDetail"
      >
        <span class="menu-icon">ⓘ</span>
        <span class="flex-1 text-left">查看详情</span>
      </button>
      <button type="button" class="menu-item" @click="onAdd">
        <span class="menu-icon">＋</span>
        <span class="flex-1 text-left">添加连接设备</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 12px;
  color: rgb(226 232 240);
  transition: background 0.12s;
  cursor: pointer;
}
.menu-item:hover {
  background: rgba(34, 211, 238, 0.1);
  color: rgb(165 243 252);
}
.menu-icon {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  font-size: 13px;
  color: rgb(56 189 248);
}
</style>
