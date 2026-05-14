<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { addDeviceDialog, closeAddDeviceDialog } from '../store/ui';
import { addDevice, nextAdditionId } from '../store/additions';
import { getDeviceById, getNic } from '../store/nics';
import { deviceTypeList, getNamePrefix } from '../data/deviceTypes';
import { edgeStyleList, loadEdgeStyles } from '../data/edgeStyles';
import type { BaseDevice, DeviceType, LinkKind } from '../types/topology';

const props = defineProps<{ rootId: string }>();

interface Option {
  value: DeviceType;
  label: string;
}

interface KindOption {
  value: LinkKind;
  label: string;
  color: string;
}

const allOptions = computed<Option[]>(() =>
  deviceTypeList.map((t) => ({ value: t.id, label: t.label })),
);

const kindOptions = ref<KindOption[]>([]);

onMounted(async () => {
  await loadEdgeStyles();
  kindOptions.value = edgeStyleList
    .filter(s => s.kind !== 'unreachable')
    .map(s => ({ value: s.kind as LinkKind, label: s.label, color: s.color }));
});

const selectedType = ref<DeviceType>('workstation');
const selectedKind = ref<LinkKind>('wired');
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
    selectedKind.value = parentNic.value?.kind ?? 'wired';
    customName.value = '';
    customIp.value = '';
    isChild.value = true;
    error.value = '';
  },
);

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

function defaultName(): string {
  const stamp = Math.floor(Math.random() * 900 + 100);
  return `${getNamePrefix(selectedType.value)}-${stamp}`;
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
    kind: selectedKind.value,
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
                端口 ·
                <span :class="parentNic?.kind === 'wireless' ? 'text-amber-300' : 'text-cyan-300'">
                  {{ parentNic?.name ?? addDeviceDialog.nicId }}
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
            <div v-if="kindOptions.length > 0">
              <div class="form-key">连接线类型</div>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="opt in kindOptions"
                  :key="opt.value"
                  type="button"
                  :class="[
                    'kind-chip',
                    selectedKind === opt.value ? 'kind-chip-active' : '',
                  ]"
                  @click="selectedKind = opt.value"
                >
                  <div class="kind-line" :style="{ borderColor: opt.color }" />
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
.kind-chip {
  font-size: 11px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgb(30 41 59);
  background: rgb(2 6 23 / 0.5);
  color: rgb(148 163 184);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.kind-chip:hover {
  border-color: rgb(71 85 105);
  color: rgb(203 213 225);
}
.kind-chip-active {
  border-color: rgb(34 211 238);
  background: rgb(8 51 68 / 0.6);
  color: rgb(165 243 252);
}
.kind-line {
  width: 30px;
  height: 3px;
  border-top: 2px solid transparent;
  border-radius: 2px;
}
.kind-chip-active .kind-line {
  border-top-style: solid;
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
