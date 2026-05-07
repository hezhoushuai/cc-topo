import { onBeforeUnmount, onMounted, reactive } from 'vue';

const HISTORY_SIZE = 20;
const TICK_MS = 1500;

interface PingState {
  enabled: boolean;
  history: number[];
}

const stateByPair = reactive<Record<string, PingState>>({});

function pingKey(rootId: string, targetId: string): string {
  return `${rootId}::${targetId}`;
}

export interface PingSummary {
  latency: number | null;
  loss: number;
  samples: number;
}

export function isPingOn(rootId: string, targetId: string): boolean {
  return stateByPair[pingKey(rootId, targetId)]?.enabled ?? false;
}

export function togglePing(rootId: string, targetId: string): void {
  const k = pingKey(rootId, targetId);
  const cur = stateByPair[k];
  if (!cur) {
    stateByPair[k] = { enabled: true, history: [] };
  } else {
    cur.enabled = !cur.enabled;
    if (cur.enabled) cur.history = [];
  }
}

export function getPingSummary(rootId: string, targetId: string): PingSummary {
  const s = stateByPair[pingKey(rootId, targetId)];
  if (!s || !s.enabled || s.history.length === 0) {
    return { latency: null, loss: 0, samples: 0 };
  }
  const valid = s.history.filter((v) => !Number.isNaN(v));
  const lost = s.history.length - valid.length;
  const latency =
    valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  return {
    latency,
    loss: lost / s.history.length,
    samples: s.history.length,
  };
}

let timer: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function tick(): void {
  for (const k of Object.keys(stateByPair)) {
    const s = stateByPair[k];
    if (!s.enabled) continue;
    const roll = Math.random();
    let sample: number;
    if (roll < 0.04) {
      sample = NaN;
    } else if (roll < 0.1) {
      sample = 180 + Math.random() * 240;
    } else {
      sample = 4 + Math.random() * 38;
    }
    s.history.push(sample);
    if (s.history.length > HISTORY_SIZE) s.history.shift();
  }
}

export function usePingTicker(): void {
  onMounted(() => {
    refCount += 1;
    if (!timer) timer = setInterval(tick, TICK_MS);
  });
  onBeforeUnmount(() => {
    refCount -= 1;
    if (refCount <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}
