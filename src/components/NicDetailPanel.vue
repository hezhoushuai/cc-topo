<script setup lang="ts">
import { computed } from 'vue';
import { closeDetailPanel, detailPanel } from '../store/ui';
import { getDeviceById, getNic } from '../store/nics';
import TrafficChart from './TrafficChart.vue';

const nic = computed(() =>
  detailPanel.deviceId && detailPanel.nicId
    ? getNic(detailPanel.deviceId, detailPanel.nicId)
    : undefined,
);

const device = computed(() =>
  detailPanel.deviceId ? getDeviceById(detailPanel.deviceId) : undefined,
);
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <aside
        v-if="detailPanel.visible"
        class="fixed top-0 right-0 z-[900] h-full w-[420px] bg-slate-950/95 border-l border-slate-800 backdrop-blur-md shadow-2xl flex flex-col"
      >
        <header class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-slate-500">网卡详情</div>
            <div class="text-base font-semibold text-slate-100 mt-0.5 font-mono">
              {{ nic?.name ?? '—' }}
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">
              所属设备 ·
              <span class="text-slate-300">{{ device?.name ?? '—' }}</span>
            </div>
          </div>
          <button
            type="button"
            class="size-8 grid place-items-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition"
            @click="closeDetailPanel"
            title="关闭"
          >
            ✕
          </button>
        </header>

        <div v-if="nic" class="flex-1 overflow-y-auto p-5 space-y-5">
          <section class="grid grid-cols-2 gap-3">
            <div class="info-cell">
              <div class="info-key">类型</div>
              <div class="info-val">
                <span
                  :class="
                    nic.kind === 'wireless'
                      ? 'text-amber-300'
                      : 'text-cyan-300'
                  "
                >
                  {{ nic.kind === 'wireless' ? '无线' : '有线' }}
                </span>
              </div>
            </div>
            <div class="info-cell">
              <div class="info-key">侧位</div>
              <div class="info-val">
                {{ nic.side === 'left' ? '上联 ←' : '下联 →' }} #{{ nic.index + 1 }}
              </div>
            </div>
            <div class="info-cell col-span-2">
              <div class="info-key">IP 地址</div>
              <div class="info-val font-mono">{{ nic.ip }}</div>
            </div>
            <div class="info-cell">
              <div class="info-key">子网掩码</div>
              <div class="info-val font-mono">{{ nic.netmask }}</div>
            </div>
            <div class="info-cell">
              <div class="info-key">网关</div>
              <div class="info-val font-mono">{{ nic.gateway }}</div>
            </div>
            <div class="info-cell col-span-2">
              <div class="info-key">MAC 地址</div>
              <div class="info-val font-mono">{{ nic.mac }}</div>
            </div>
          </section>

          <TrafficChart :device-id="detailPanel.deviceId" :nic-id="detailPanel.nicId" />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-cell {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgb(30 41 59 / 0.8);
  border-radius: 8px;
  padding: 10px 12px;
}
.info-key {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(100 116 139);
}
.info-val {
  font-size: 13px;
  color: rgb(226 232 240);
  margin-top: 4px;
  word-break: break-all;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
