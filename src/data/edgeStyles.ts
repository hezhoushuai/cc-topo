import type { EdgeStyle } from '../types/topology';

interface EdgeStylesJson {
  styles: EdgeStyle[];
}

const DEFAULT_STYLE: EdgeStyle = {
  kind: 'wired',
  label: '有线',
  lineType: 'solid',
  color: '#22d3ee',
  strokeWidth: 1.8,
  dashArray: null,
};

export const edgeStyleList: EdgeStyle[] = [];
export const edgeStyleByKind: Record<string, EdgeStyle> = {};

export function getEdgeStyle(kind: string): EdgeStyle {
  return edgeStyleByKind[kind] ?? DEFAULT_STYLE;
}

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadEdgeStyles(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const res = await fetch('/data/edge-styles.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load edge-styles.json: HTTP ${res.status}`);
    const data = (await res.json()) as EdgeStylesJson;

    edgeStyleList.length = 0;
    edgeStyleList.push(...(data.styles ?? []));

    for (const k of Object.keys(edgeStyleByKind)) delete edgeStyleByKind[k];
    for (const s of edgeStyleList) edgeStyleByKind[s.kind] = s;

    loaded = true;
  })();
  return loadingPromise;
}
