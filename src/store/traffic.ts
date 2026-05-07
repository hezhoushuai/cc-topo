import { onBeforeUnmount, onMounted, reactive } from 'vue';

export const SAMPLE_COUNT = 20;
const SAMPLE_INTERVAL_MS = 3000;

export interface NicTraffic {
  rx: number[];
  tx: number[];
}

const trafficByKey = reactive<Record<string, NicTraffic>>({});

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function key(deviceId: string, nicId: string): string {
  return `${deviceId}::${nicId}`;
}

function ensure(deviceId: string, nicId: string): NicTraffic {
  const k = key(deviceId, nicId);
  if (!trafficByKey[k]) {
    const baseRx = 80 + Math.random() * 350;
    const baseTx = 40 + Math.random() * 220;
    const rx: number[] = [];
    const tx: number[] = [];
    let r = baseRx;
    let t = baseTx;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      r = clamp(r + (Math.random() - 0.5) * baseRx * 0.5, 0, baseRx * 3);
      t = clamp(t + (Math.random() - 0.5) * baseTx * 0.5, 0, baseTx * 3);
      rx.push(r);
      tx.push(t);
    }
    trafficByKey[k] = { rx, tx };
  }
  return trafficByKey[k];
}

export function getTraffic(deviceId: string, nicId: string): NicTraffic {
  return ensure(deviceId, nicId);
}

let timer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function tick(): void {
  for (const k of Object.keys(trafficByKey)) {
    const t = trafficByKey[k];
    const lastRx = t.rx[t.rx.length - 1];
    const lastTx = t.tx[t.tx.length - 1];
    const newRx = t.rx.slice(1);
    newRx.push(clamp(lastRx + (Math.random() - 0.5) * 90, 0, 1500));
    const newTx = t.tx.slice(1);
    newTx.push(clamp(lastTx + (Math.random() - 0.5) * 70, 0, 1100));
    t.rx = newRx;
    t.tx = newTx;
  }
}

export function useTrafficTicker(): void {
  onMounted(() => {
    refCount += 1;
    if (!timer) timer = setInterval(tick, SAMPLE_INTERVAL_MS);
  });
  onBeforeUnmount(() => {
    refCount -= 1;
    if (refCount <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}
