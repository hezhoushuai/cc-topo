<script setup lang="ts">
import { ref, watch } from 'vue';
import { closeConfigDialog, configDialog } from '../store/ui';
import { getNic, updateNic } from '../store/nics';

const ip = ref('');
const netmask = ref('');
const gateway = ref('');
const mac = ref('');
const error = ref('');

watch(
  () => [configDialog.visible, configDialog.deviceId, configDialog.nicId] as const,
  () => {
    if (!configDialog.visible) return;
    const nic = getNic(configDialog.deviceId, configDialog.nicId);
    if (!nic) return;
    ip.value = nic.ip;
    netmask.value = nic.netmask;
    gateway.value = nic.gateway;
    mac.value = nic.mac;
    error.value = '';
  },
);

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
const macPattern = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

function validate(): boolean {
  if (!ipPattern.test(ip.value)) {
    error.value = 'IP 格式不正确';
    return false;
  }
  if (!ipPattern.test(netmask.value)) {
    error.value = '子网掩码格式不正确';
    return false;
  }
  if (!ipPattern.test(gateway.value)) {
    error.value = '网关格式不正确';
    return false;
  }
  if (!macPattern.test(mac.value)) {
    error.value = 'MAC 格式不正确，例: AA:BB:CC:DD:EE:FF';
    return false;
  }
  error.value = '';
  return true;
}

function onSave(): void {
  if (!validate()) return;
  updateNic(configDialog.deviceId, configDialog.nicId, {
    ip: ip.value,
    netmask: netmask.value,
    gateway: gateway.value,
    mac: mac.value.toUpperCase(),
  });
  closeConfigDialog();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="configDialog.visible"
        class="fixed inset-0 z-[950] grid place-items-center bg-black/55 backdrop-blur-sm p-4"
        @click.self="closeConfigDialog"
      >
        <div
          class="w-full max-w-[420px] rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl ring-1 ring-cyan-500/15 overflow-hidden"
        >
          <header class="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-slate-500">网卡配置</div>
              <div class="text-sm font-semibold text-slate-100 mt-0.5 font-mono">
                {{ getNic(configDialog.deviceId, configDialog.nicId)?.name }}
              </div>
            </div>
            <button
              type="button"
              class="size-7 grid place-items-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              @click="closeConfigDialog"
            >
              ✕
            </button>
          </header>

          <form class="p-5 space-y-3" @submit.prevent="onSave">
            <label class="form-row">
              <span class="form-key">IP 地址</span>
              <input v-model="ip" class="form-input" placeholder="例: 10.10.20.101" />
            </label>
            <label class="form-row">
              <span class="form-key">子网掩码</span>
              <input v-model="netmask" class="form-input" placeholder="例: 255.255.255.0" />
            </label>
            <label class="form-row">
              <span class="form-key">网关</span>
              <input v-model="gateway" class="form-input" placeholder="例: 10.10.20.1" />
            </label>
            <label class="form-row">
              <span class="form-key">MAC 地址</span>
              <input v-model="mac" class="form-input" placeholder="例: AA:BB:CC:DD:EE:FF" />
            </label>
            <div v-if="error" class="text-[12px] text-rose-400">{{ error }}</div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="btn btn-ghost"
                @click="closeConfigDialog"
              >
                取消
              </button>
              <button type="submit" class="btn btn-primary">保存</button>
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
