import type { Edge, Node } from '@vue-flow/core';
import { MarkerType } from '@vue-flow/core';
import type {
  BaseDevice,
  DeviceType,
  EdgeData,
  LinkKind,
  NodeData,
  NodeRole,
  TogglePortInfo,
  Topology,
} from '../types/topology';
import { PORT_COUNT, portIdLeft, portIdRight } from '../utils/ports';
import { ensureNicsFor } from '../store/nics';
import { getAdditions } from '../store/additions';
import { isRemovedDevice } from '../store/removals';
import { isPingOn } from '../store/ping';
import { setActiveNics } from '../store/nicConnections';

const NODE_W = 200;
const CENTER_H = 124;
const LEAF_H = 72;
const COL_GAP = 180;
const ROW_GAP = 18;
const BRANCH_GAP = 28;

const COL_RIGHT = [0, NODE_W + COL_GAP, (NODE_W + COL_GAP) * 2];
const COL_LEFT  = [0, -(COL_GAP + NODE_W), -(COL_GAP + NODE_W) * 2];
const LEAF_ROW_HEIGHT = LEAF_H + ROW_GAP;

function heightOf(role: NodeRole): number {
  return role === 'center' ? CENTER_H : LEAF_H;
}

const WIRED = '#22d3ee';
const WIRELESS = '#f59e0b';
const SATELLITE = '#a855f7';
const UNREACHABLE = '#f43f5e';

function colorOf(kind: LinkKind): string {
  if (kind === 'wireless') return WIRELESS;
  if (kind === 'satellite') return SATELLITE;
  return WIRED;
}

function dashOf(kind: LinkKind): string | undefined {
  if (kind === 'wireless') return '8 6';
  if (kind === 'satellite') return '2 4 10 4';
  return undefined;
}

function edgeStyle(kind: LinkKind, unreachable: boolean) {
  const color = unreachable ? UNREACHABLE : colorOf(kind);
  return {
    stroke: color,
    strokeWidth: unreachable ? 2.2 : 1.8,
    strokeDasharray: unreachable ? '6 4' : dashOf(kind),
    filter: unreachable ? 'drop-shadow(0 0 3px rgba(244,63,94,0.5))' : undefined,
  } as Record<string, string | number | undefined>;
}

interface PortAlloc {
  rightIdx: number;
  rightCount: number;
}

function getAlloc(map: Map<string, PortAlloc>, id: string, type: DeviceType): PortAlloc {
  let a = map.get(id);
  if (!a) {
    const c = PORT_COUNT[type];
    a = { rightIdx: 0, rightCount: c.right };
    map.set(id, a);
  }
  return a;
}

function nextRight(map: Map<string, PortAlloc>, id: string, type: DeviceType): string {
  const a = getAlloc(map, id, type);
  const i = a.rightIdx++;
  return portIdRight(i);
}

interface NodeRecord {
  id: string;
  device: BaseDevice;
  role: NodeRole;
  x: number;
  y: number;
}

interface EdgeSpec {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  kind: LinkKind;
  hasMarker: boolean;
  // 树形结构中靠近叶子节点的那一端（与 edge 物理 source/target 方向无关）
  deepEnd: string;
}

export interface LayoutResult {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

interface BranchInfo {
  branch: ReturnType<typeof Object.values<Topology['branches'][number]>>[number];
  centerPort: string;
  branchCollapsed: boolean;
  hubChildrenCollapsed: boolean;
}

interface BranchPos {
  hubY: number;
  leafYs: Map<string, number>;
}

const HUB_LEFT_PORT  = portIdLeft(0);
const HUB_RIGHT_PORT = portIdRight(0);
const LEAF_LEFT_PORT = portIdLeft(0);

function computeBranchPositions(
  infos: BranchInfo[],
): { positions: (BranchPos | null)[]; totalHeight: number } {
  const positions: (BranchPos | null)[] = [];
  let cursor = 0;
  for (const info of infos) {
    if (info.branchCollapsed) { positions.push(null); continue; }
    const childCount = info.hubChildrenCollapsed ? 0 : info.branch.children.length;
    const stackH = childCount > 0 ? childCount * LEAF_ROW_HEIGHT - ROW_GAP : 0;
    const blockH = Math.max(LEAF_H, stackH);
    const hubY = cursor + blockH / 2;
    const leafYs = new Map<string, number>();
    if (childCount > 0) {
      const stackTop = cursor + (blockH - stackH) / 2 + LEAF_H / 2;
      info.branch.children.forEach((child, i) => {
        leafYs.set(`${info.branch.id}__${child.id}`, stackTop + i * LEAF_ROW_HEIGHT);
      });
    }
    positions.push({ hubY, leafYs });
    cursor += blockH + BRANCH_GAP;
  }
  return { positions, totalHeight: cursor > 0 ? cursor - BRANCH_GAP : 0 };
}

export function buildLayout(
  topology: Topology,
  collapsedPorts: Set<string>,
  selectedRootId: string,
): LayoutResult {
  const nodeRecords = new Map<string, NodeRecord>();
  const edgeSpecs: EdgeSpec[] = [];
  const ports = new Map<string, PortAlloc>();
  const leftPortIdx = new Map<string, number>();
  const activePorts = new Map<string, Set<string>>();
  const togglePorts = new Map<string, TogglePortInfo[]>();

  function markActive(nodeId: string, portId: string): void {
    let s = activePorts.get(nodeId);
    if (!s) { s = new Set(); activePorts.set(nodeId, s); }
    s.add(portId);
  }

  function addToggle(nodeId: string, portId: string, collapsed: boolean): void {
    let arr = togglePorts.get(nodeId);
    if (!arr) { arr = []; togglePorts.set(nodeId, arr); }
    if (!arr.some((t) => t.portId === portId)) arr.push({ portId, collapsed });
  }

  function isCollapsed(nodeId: string, portId: string): boolean {
    return collapsedPorts.has(`${nodeId}::${portId}`);
  }

  function nextLeft(id: string): string {
    const i = leftPortIdx.get(id) ?? 0;
    leftPortIdx.set(id, i + 1);
    return portIdLeft(i);
  }

  ensureNicsFor(topology.center);
  const centerOffline = topology.center.status === 'offline';

  function applyOffline<T extends BaseDevice>(d: T): T {
    if (!centerOffline || d.id === topology.center.id || d.status === 'offline') return d;
    return { ...d, status: 'offline' } as T;
  }

  const rightBranches = topology.branches
    .filter((b) => (b.side ?? 'right') === 'right')
    .filter((b) => !isRemovedDevice(selectedRootId, b.hub.id))
    .map((b) => ({ ...b, children: b.children.filter((c) => !isRemovedDevice(selectedRootId, c.id)) }));
  const leftBranches = topology.branches
    .filter((b) => b.side === 'left')
    .filter((b) => !isRemovedDevice(selectedRootId, b.hub.id))
    .map((b) => ({ ...b, children: b.children.filter((c) => !isRemovedDevice(selectedRootId, c.id)) }));

  // --- Build BranchInfos & track active ports/toggles ---
  const rightInfos: BranchInfo[] = [];
  for (const branch of rightBranches) {
    const centerPort = nextRight(ports, topology.center.id, topology.center.type);
    const branchCollapsed = isCollapsed(topology.center.id, centerPort);
    const hubChildrenCollapsed = isCollapsed(branch.hub.id, HUB_RIGHT_PORT);
    markActive(topology.center.id, centerPort);
    addToggle(topology.center.id, centerPort, branchCollapsed);
    if (!branchCollapsed) {
      markActive(branch.hub.id, HUB_LEFT_PORT);
      ensureNicsFor(branch.hub);
      if (branch.children.length > 0) {
        markActive(branch.hub.id, HUB_RIGHT_PORT);
        addToggle(branch.hub.id, HUB_RIGHT_PORT, hubChildrenCollapsed);
        if (!hubChildrenCollapsed) {
          for (const child of branch.children) {
            ensureNicsFor(child);
            markActive(`${branch.id}__${child.id}`, LEAF_LEFT_PORT);
          }
        }
      }
    }
    rightInfos.push({ branch, centerPort, branchCollapsed, hubChildrenCollapsed });
  }

  const leftInfos: BranchInfo[] = [];
  for (const branch of leftBranches) {
    const centerPort = nextLeft(topology.center.id);
    const branchCollapsed = isCollapsed(topology.center.id, centerPort);
    const hubChildrenCollapsed = isCollapsed(branch.hub.id, HUB_LEFT_PORT);
    markActive(topology.center.id, centerPort);
    addToggle(topology.center.id, centerPort, branchCollapsed);
    if (!branchCollapsed) {
      markActive(branch.hub.id, HUB_RIGHT_PORT);
      ensureNicsFor(branch.hub);
      if (branch.children.length > 0) {
        markActive(branch.hub.id, HUB_LEFT_PORT);
        addToggle(branch.hub.id, HUB_LEFT_PORT, hubChildrenCollapsed);
        if (!hubChildrenCollapsed) {
          for (const child of branch.children) {
            ensureNicsFor(child);
            markActive(`${branch.id}__${child.id}`, HUB_RIGHT_PORT);
          }
        }
      }
    }
    leftInfos.push({ branch, centerPort, branchCollapsed, hubChildrenCollapsed });
  }

  // --- Compute Y positions ---
  const { positions: rightPos, totalHeight: rightH } = computeBranchPositions(rightInfos);
  const { positions: leftPos,  totalHeight: leftH  } = computeBranchPositions(leftInfos);

  const totalH    = Math.max(rightH, leftH, CENTER_H);
  const centerY   = totalH / 2;
  const rightOff  = Math.max(0, (totalH - rightH) / 2);
  const leftOff   = Math.max(0, (totalH - leftH)  / 2);

  // --- Place nodes ---
  nodeRecords.set(topology.center.id, {
    id: topology.center.id, device: topology.center,
    role: 'center', x: COL_RIGHT[0], y: centerY - CENTER_H / 2,
  });

  rightInfos.forEach((info, i) => {
    if (info.branchCollapsed) return;
    const pos = rightPos[i]!;
    const { branch } = info;
    nodeRecords.set(branch.hub.id, {
      id: branch.hub.id, device: applyOffline(branch.hub), role: 'hub',
      x: COL_RIGHT[1], y: rightOff + pos.hubY - LEAF_H / 2,
    });
    edgeSpecs.push({
      id: branch.id,
      source: topology.center.id, target: branch.hub.id,
      sourcePort: info.centerPort, targetPort: HUB_LEFT_PORT,
      kind: branch.kind, hasMarker: true, deepEnd: branch.hub.id,
    });
    if (info.hubChildrenCollapsed) return;
    branch.children.forEach((child) => {
      const leafId = `${branch.id}__${child.id}`;
      nodeRecords.set(leafId, {
        id: leafId, device: applyOffline(child), role: 'leaf',
        x: COL_RIGHT[2], y: rightOff + pos.leafYs.get(leafId)! - LEAF_H / 2,
      });
      edgeSpecs.push({
        id: `${branch.id}__edge__${child.id}`,
        source: branch.hub.id, target: leafId,
        sourcePort: HUB_RIGHT_PORT, targetPort: LEAF_LEFT_PORT,
        kind: branch.kind, hasMarker: false, deepEnd: leafId,
      });
    });
  });

  leftInfos.forEach((info, i) => {
    if (info.branchCollapsed) return;
    const pos = leftPos[i]!;
    const { branch } = info;
    nodeRecords.set(branch.hub.id, {
      id: branch.hub.id, device: applyOffline(branch.hub), role: 'hub',
      x: COL_LEFT[1], y: leftOff + pos.hubY - LEAF_H / 2,
    });
    // Edge reversed: left hub → center
    edgeSpecs.push({
      id: branch.id,
      source: branch.hub.id, target: topology.center.id,
      sourcePort: HUB_RIGHT_PORT, targetPort: info.centerPort,
      kind: branch.kind, hasMarker: true, deepEnd: branch.hub.id,
    });
    if (info.hubChildrenCollapsed) return;
    branch.children.forEach((child) => {
      const leafId = `${branch.id}__${child.id}`;
      nodeRecords.set(leafId, {
        id: leafId, device: applyOffline(child), role: 'leaf',
        x: COL_LEFT[2], y: leftOff + pos.leafYs.get(leafId)! - LEAF_H / 2,
      });
      edgeSpecs.push({
        id: `${branch.id}__edge__${child.id}`,
        source: leafId, target: branch.hub.id,
        sourcePort: HUB_RIGHT_PORT, targetPort: HUB_LEFT_PORT,
        kind: branch.kind, hasMarker: false, deepEnd: leafId,
      });
    });
  });

  // --- Additions ---
  const recordByDeviceId = new Map<string, NodeRecord>();
  for (const rec of nodeRecords.values()) recordByDeviceId.set(rec.device.id, rec);

  let maxRightX = 0;
  let minLeftX = 0;
  for (const rec of nodeRecords.values()) {
    maxRightX = Math.max(maxRightX, rec.x + NODE_W);
    minLeftX  = Math.min(minLeftX,  rec.x);
  }

  const additions = getAdditions(selectedRootId);
  // 按 (parent, side) 分组：center 的左/右端口可同时接收新增设备，分别放在两侧
  type AdditionSide = 'left' | 'right';
  function sideOf(parent: NodeRecord, parentNicId: string): AdditionSide {
    if (parent.x < 0) return 'left';
    if (parent.x > 0) return 'right';
    return parentNicId.startsWith('lp-') ? 'left' : 'right';
  }
  interface AdditionGroup { parent: NodeRecord; side: AdditionSide; list: typeof additions }
  const groupedByParentSide = new Map<string, AdditionGroup>();
  for (const add of additions) {
    const parent = recordByDeviceId.get(add.parentDeviceId);
    if (!parent) continue;
    const side = sideOf(parent, add.parentNicId);
    const key = `${parent.id}::${side}`;
    let g = groupedByParentSide.get(key);
    if (!g) { g = { parent, side, list: [] }; groupedByParentSide.set(key, g); }
    g.list.push(add);
  }

  // 用于避免卡片重叠：维护已占用的矩形列表
  interface Box { x1: number; x2: number; y1: number; y2: number }
  const occupiedBoxes: Box[] = Array.from(nodeRecords.values()).map((r) => ({
    x1: r.x, x2: r.x + NODE_W, y1: r.y, y2: r.y + heightOf(r.role),
  }));
  function rangeOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
    return a1 < b2 && b1 < a2;
  }
  function findClearStackTop(colX: number, idealTop: number, stackLen: number): number {
    const x1 = colX, x2 = colX + NODE_W;
    let top = idealTop;
    let safety = 200;
    while (safety-- > 0) {
      let conflict: Box | null = null;
      for (let i = 0; i < stackLen; i++) {
        const y1 = top + i * (LEAF_H + ROW_GAP);
        const y2 = y1 + LEAF_H;
        for (const b of occupiedBoxes) {
          if (rangeOverlap(x1, x2, b.x1, b.x2) && rangeOverlap(y1, y2, b.y1, b.y2)) {
            conflict = b; break;
          }
        }
        if (conflict) break;
      }
      if (!conflict) return top;
      top = conflict.y2 + ROW_GAP;
    }
    return top;
  }

  for (const { parent, side, list } of groupedByParentSide.values()) {
    const isLeftSide = side === 'left';
    const colX = isLeftSide ? minLeftX - 60 - NODE_W : maxRightX + 60;
    const stackH = list.length * LEAF_H + (list.length - 1) * ROW_GAP;
    const idealTop = parent.y + heightOf(parent.role) / 2 - stackH / 2;
    const stackTop = findClearStackTop(colX, idealTop, list.length);
    list.forEach((add, i) => {
      const newRec: NodeRecord = {
        id: add.id, device: applyOffline(add.device), role: 'leaf',
        x: colX, y: stackTop + i * (LEAF_H + ROW_GAP),
      };
      nodeRecords.set(add.id, newRec);
      recordByDeviceId.set(add.device.id, newRec);
      occupiedBoxes.push({ x1: newRec.x, x2: newRec.x + NODE_W, y1: newRec.y, y2: newRec.y + LEAF_H });
      ensureNicsFor(add.device);
      if (isLeftSide) {
        // 新设备位于父节点左侧；新设备的 rp-0 连接到父节点的左侧端口
        markActive(parent.id, add.parentNicId);
        markActive(add.id, HUB_RIGHT_PORT);
        edgeSpecs.push({
          id: `addition-edge-${add.id}`,
          source: add.id, target: parent.id,
          sourcePort: HUB_RIGHT_PORT, targetPort: add.parentNicId,
          kind: add.kind, hasMarker: false, deepEnd: add.id,
        });
      } else {
        markActive(parent.id, add.parentNicId);
        markActive(add.id, LEAF_LEFT_PORT);
        edgeSpecs.push({
          id: `addition-edge-${add.id}`,
          source: parent.id, target: add.id,
          sourcePort: add.parentNicId, targetPort: LEAF_LEFT_PORT,
          kind: add.kind, hasMarker: false, deepEnd: add.id,
        });
      }
    });
    if (isLeftSide) {
      minLeftX = colX;
    } else {
      maxRightX = colX + NODE_W;
    }
  }

  // --- Port connections & tree-aware children (parent → deeper-tree child) ---
  // 注意：subtreeChildren 与 edge 物理方向无关，永远沿"远离 center"方向遍历，
  // 因此左侧分支也能正确识别 hub 下挂的叶子节点
  const subtreeChildren = new Map<string, string[]>();
  const portConnByNode = new Map<string, Map<string, number>>();
  function bumpPortConn(nodeId: string, portId: string): void {
    let m = portConnByNode.get(nodeId);
    if (!m) { m = new Map(); portConnByNode.set(nodeId, m); }
    m.set(portId, (m.get(portId) ?? 0) + 1);
  }
  function addSubtreeChild(parent: string, child: string): void {
    let arr = subtreeChildren.get(parent);
    if (!arr) { arr = []; subtreeChildren.set(parent, arr); }
    arr.push(child);
  }
  for (const e of edgeSpecs) {
    const shallowEnd = e.deepEnd === e.source ? e.target : e.source;
    addSubtreeChild(shallowEnd, e.deepEnd);
    bumpPortConn(e.source, e.sourcePort);
    bumpPortConn(e.target, e.targetPort);
  }

  // --- Ping subtree tracking ---
  const subtreePingCache = new Map<string, boolean>();
  function isSubtreePinged(nodeId: string): boolean {
    if (centerOffline) return false;
    const cached = subtreePingCache.get(nodeId);
    if (cached !== undefined) return cached;
    const rec = nodeRecords.get(nodeId);
    if (!rec) { subtreePingCache.set(nodeId, false); return false; }
    // 只有可达设备才能产生流动动画：不可达节点边线变红已由 edge-unreachable 处理，
    // 但不应向父节点传播"连通确认"状态。center 自身也不参与传播。
    if (rec.role === 'center') { subtreePingCache.set(nodeId, false); return false; }
    let on = !rec.device.unreachable && (
      rec.device.isChild === true ||
      isPingOn(selectedRootId, rec.device.id)
    );
    if (!on) on = (subtreeChildren.get(nodeId) ?? []).some((k) => isSubtreePinged(k));
    subtreePingCache.set(nodeId, on);
    return on;
  }

  // --- Active NICs ---
  const activeNicKeys: string[] = [];
  for (const [nodeId, portSet] of activePorts) {
    const rec = nodeRecords.get(nodeId);
    if (!rec) continue;
    for (const portId of portSet) activeNicKeys.push(`${rec.device.id}::${portId}`);
  }
  setActiveNics(activeNicKeys);

  // --- Build VueFlow nodes ---
  const nodes: Node<NodeData>[] = [];
  for (const rec of nodeRecords.values()) {
    let portCount: { left: number; right: number };
    if (rec.role === 'center') {
      const alloc = ports.get(rec.id);
      const base  = PORT_COUNT[rec.device.type];
      portCount = {
        left:  Math.max(base.left,  leftPortIdx.get(rec.id) ?? 0),
        right: Math.max(base.right, alloc?.rightIdx ?? 0),
      };
    } else {
      portCount = { left: 1, right: 1 };
    }
    const connMap = portConnByNode.get(rec.id);
    const portConnections: Record<string, number> = {};
    if (connMap) for (const [portId, count] of connMap) portConnections[portId] = count;

    nodes.push({
      id: rec.id,
      type: 'device',
      position: { x: rec.x, y: rec.y },
      data: {
        device: rec.device,
        role: rec.role,
        activePorts: Array.from(activePorts.get(rec.id) ?? new Set()),
        togglePorts: togglePorts.get(rec.id) ?? [],
        portCount,
        portConnections,
      },
      draggable: true,
      selectable: false,
    });
  }

  // --- Build VueFlow edges ---
  const edges: Edge<EdgeData>[] = edgeSpecs.map((s) => {
    const pinging = isSubtreePinged(s.deepEnd);
    const deepRec = nodeRecords.get(s.deepEnd);
    const targetUnreachable = deepRec?.device.unreachable === true;
    // SVG 路径方向 = source → target；当 deepEnd 是 source 时，
    // 期望数据流向（从 center 朝外指向 deepEnd）与路径方向相反，需要反转蚂蚁动画
    const reverseFlow = s.deepEnd === s.source;
    const classes: string[] = [];
    if (pinging) classes.push('pinging');
    if (targetUnreachable) classes.push('edge-unreachable');
    if (reverseFlow && (pinging || targetUnreachable)) classes.push('flow-reverse');
    return {
      id: s.id,
      source: s.source, target: s.target,
      sourceHandle: s.sourcePort, targetHandle: s.targetPort,
      type: 'topology',
      data: { kind: s.kind, unreachable: targetUnreachable },
      style: edgeStyle(s.kind, targetUnreachable),
      class: classes.length > 0 ? classes.join(' ') : undefined,
      markerEnd: s.hasMarker ? {
        type: MarkerType.ArrowClosed,
        color: targetUnreachable ? UNREACHABLE : colorOf(s.kind),
        width: 14, height: 14,
      } : undefined,
    };
  });

  return { nodes, edges };
}
