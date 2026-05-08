<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { addDeviceDialog, closeAddDeviceDialog } from '../store/ui';
import { addDevice, nextAdditionId } from '../store/additions';
import { getDeviceById, getNic } from '../store/nics';
import type { BaseDevice, DeviceType } from '../types/topology';

const props = defineProps<{ rootId: string }>();

interface Option {
  value: DeviceType;
  label: string;
}

const allOptions: Option[] = [
  { value: 'workstation', label: '工作站' },
  { value: 'laptop', label: '笔记本' },
  { value: 'server', label: '服务器' },
  { value: 'switch', label: '交换机' },
  { value: 'router', label: '路由器' },
  { value: 'ap', label: '无线 AP' },
  { value: 'phone', label: '手机' },
  { value: 'tablet', label: '平板' },
  { value: 'printer', label: '打印机' },
  { value: 'nas', label: 'NAS' },
  { value: 'firewall', label: '防火墙' },
];

const selectedType = ref<DeviceType>('workstation');
const customName = ref('');
const customIp = ref('');
const isChild = ref(true);
const error = ref('');

const parentNic = computed(() =>
  addDeviceDialog.deviceId && addDeviceDialog.nicId
    ? getNic(addDeviceDialog.deviceId, addDeviceDialog.nicId)
    : undefined,
);

const parentDevice = computed(() =>
  addDeviceDialog.deviceId ? getDeviceById(addDeviceDialog.deviceId) : undefined,
);

watch(
  () => addDeviceDialog.visible,
  (v) => {
    if (!v) return;
    selectedType.value = parentNic.value?.kind === 'wireless' ? 'laptop' : 'workstation';
    customName.value = '';
    customIp.value = '';
    isChild.value = true;
    error.value = '';
  },
);

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

function defaultName(): string {
  const t = selectedType.value;
  const stamp = Math.floor(Math.random() * 900 + 100);
  const map: Record<DeviceType, string> = {
    workstation: `WS-NEW-${stamp}`,
    laptop: `LAPTOP-NEW-${stamp}`,
    server: `SRV-NEW-${stamp}`,
    switch: `SW-NEW-${stamp}`,
    router: `RT-NEW-${stamp}`,
    ap: `AP-NEW-${stamp}`,
    phone: `PHONE-NEW-${stamp}`,
    tablet: `PAD-NEW-${stamp}`,
    printer: `PRT-NEW-${stamp}`,
    nas: `NAS-NEW-${stamp}`,
    firewall: `FW-NEW-${stamp}`,
  };
  return map[t];
}

function defaultIp(): string {
  if (parentDevice.value) {
    const parts = parentDevice.value.ip.split('.').map(Number);
    return `${parts[0]}.${parts[1]}.${parts[2]}.${Math.floor(Math.random() * 200) + 50}`;
  }
  return `10.10.99.${Math.floor(Math.random() * 200) + 50}`;
}

function onSubmit(): void {
  const name = customName.value.trim() || defaultName();
  const ip = customIp.value.trim() || defaultIp();
  if (!ipPattern.test(ip)) {
    error.value = 'IP 格式不正确';
    return;
  }
  const id = nextAdditionId();
  const device: BaseDevice = {
    id,
    name,
    type: selectedType.value,
    ip,
    status: 'online',
    isChild: isChild.value,
  };
  addDevice(props.rootId, {
    id,
    parentDeviceId: addDeviceDialog.deviceId,
    parentNicId: addDeviceDialog.nicId,
    device,
    kind: parentNic.value?.kind ?? 'wired',
  });
  closeAddDeviceDialog();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="addDeviceDialog.visible"
        class="fixed inset-0 z-[950] grid place-items-center bg-black/55 backdrop-blur-sm p-4"
        @click.self="closeAddDeviceDialog"
      >
        <div
          class="w-full max-w-[440px] rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl ring-1 ring-cyan-500/15 overflow-hidden"
        >
          <header class="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-500">添加连接设备</div>
              <div class="text-sm font-semibold text-slate-100 mt-0.5">
                通过
                <span class="font-mono text-cyan-300">{{ parentNic?.name ?? addDeviceDialog.nicId }}</span>
                接到
                <span class="text-slate-300">{{ parentDevice?.name }}</span>
              </div>
              <div class="text-[10px] mt-0.5 text-slate-500">
                链路类型 ·
                <span :class="parentNic?.kind === 'wireless' ? 'text-amber-300' : 'text-cyan-300'">
                  {{ parentNic?.kind === 'wireless' ? '无线' : '有线' }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="size-7 grid place-items-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              @click="closeAddDeviceDialog"
            >
              ✕
            </button>
          </header>

          <form class="p-5 space-y-3" @submit.prevent="onSubmit">
            <div>
              <div class="form-key">设备类型</div>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="opt in allOptions"
                  :key="opt.value"
                  type="button"
                  :class="[
                    'type-chip',
                    selectedType === opt.value ? 'type-chip-active' : '',
                  ]"
                  @click="selectedType = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <label class="form-row">
              <span class="form-key">设备名称（留空自动生成）</span>
              <input v-model="customName" class="form-input" :placeholder="defaultName()" />
            </label>
            <label class="form-row">
              <span class="form-key">IP 地址（留空自动生成）</span>
              <input v-model="customIp" class="form-input" :placeholder="defaultIp()" />
            </label>
            <label class="child-row" :class="isChild ? 'child-row-on' : ''">
              <input v-model="isChild" type="checkbox" class="child-check" />
              <div class="flex-1">
                <div class="text-[12px] text-slate-200 font-medium">设为子节点</div>
                <div class="text-[10px] text-slate-500 mt-0.5">勾选后会自动启用 PING 监测，实时探测连通性</div>
              </div>
            </label>
            <div v-if="error" class="text-[12px] text-rose-400">{{ error }}</div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn btn-ghost" @click="closeAddDeviceDialog">
                取消
              </button>
              <button type="submit" class="btn btn-primary">添加</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.form-row {
  display: block;
}
.form-key {
  display: block;
  font-size: 11px;
  color: rgb(148 163 184);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.form-input {
  width: 100%;
  background: rgb(2 6 23 / 0.7);
  border: 1px solid rgb(30 41 59);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  color: rgb(226 232 240);
  transition: border-color 0.15s;
}
.form-input:focus {
  outline: none;
  border-color: rgb(34 211 238);
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
}
.type-chip {
  font-size: 11px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgb(30 41 59);
  background: rgb(2 6 23 / 0.5);
  color: rgb(148 163 184);
  cursor: pointer;
  transition: all 0.15s;
}
.type-chip:hover {
  border-color: rgb(71 85 105);
  color: rgb(203 213 225);
}
.type-chip-active {
  border-color: rgb(34 211 238);
  background: rgb(8 51 68 / 0.6);
  color: rgb(165 243 252);
}
.child-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgb(30 41 59);
  background: rgba(2, 6, 23, 0.6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.child-row:hover {
  border-color: rgb(71 85 105);
}
.child-row-on {
  border-color: rgb(34 211 238);
  background: rgba(8, 51, 68, 0.45);
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
}
.child-check {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  accent-color: rgb(34 211 238);
  cursor: pointer;
}
.btn {
  font-size: 12px;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}
.btn-ghost {
  color: rgb(148 163 184);
  background: transparent;
}
.btn-ghost:hover {
  background: rgb(30 41 59 / 0.7);
  color: rgb(226 232 240);
}
.btn-primary {
  color: rgb(8 47 73);
  background: rgb(34 211 238);
}
.btn-primary:hover {
  background: rgb(103 232 249);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
