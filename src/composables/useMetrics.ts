import { onBeforeUnmount, onMounted, reactive } from 'vue';
import { collectAllDeviceIds } from '../data/devices';
import type { DeviceMetrics } from '../types/topology';

const state = reactive<Record<string, DeviceMetrics>>({});

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function seedAll(): void {
  for (const id of collectAllDeviceIds()) {
    if (!state[id]) {
      state[id] = {
        cpu: rand(15, 70),
        mem: rand(35, 80),
        disk: rand(40, 78),
      };
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function tick(): void {
  for (const id of Object.keys(state)) {
    const m = state[id];
    m.cpu = clamp(m.cpu + (Math.random() - 0.5) * 18, 4, 96);
    m.mem = clamp(m.mem + (Math.random() - 0.5) * 4, 22, 94);
    m.disk = clamp(m.disk + (Math.random() - 0.5) * 0.6, 30, 92);
  }
}

export function useMetrics() {
  onMounted(() => {
    seedAll();
    refCount += 1;
    if (!timer) {
      timer = setInterval(tick, 1500);
    }
  });

  onBeforeUnmount(() => {
    refCount -= 1;
    if (refCount <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  });

  return { metrics: state };
}

export function metricsOf(id: string): DeviceMetrics {
  return state[id] ?? { cpu: 0, mem: 0, disk: 0 };
}
