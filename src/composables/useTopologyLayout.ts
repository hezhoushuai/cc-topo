import type { Edge, Node } from '@vue-flow/core';
import { MarkerType } from '@vue-flow/core';
import type {
  BaseDevice,
  Branch,
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
import { isPingOn } from '../store/ping';
import { setActiveNics } from '../store/nicConnections';

const NODE_W = 200;
const CENTER_H = 124;
const LEAF_H = 72;
const COL_GAP = 180;
const ROW_GAP = 18;
const BRANCH_GAP = 28;

const COL_X = [0, NODE_W + COL_GAP, (NODE_W + COL_GAP) * 2];
const LEAF_ROW_HEIGHT = LEAF_H + ROW_GAP;

function heightOf(role: NodeRole): number {
  return role === 'center' ? CENTER_H : LEAF_H;
}

const WIRED = '#22d3ee';
const WIRELESS = '#f59e0b';

function edgeStyle(kind: LinkKind) {
  const color = kind === 'wireless' ? WIRELESS : WIRED;
  return {
    stroke: color,
    strokeWidth: 1.8,
    strokeDasharray: kind === 'wireless' ? '8 6' : undefined,
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
  const i = a.rightIdx;
  a.rightIdx++;
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
}

export interface LayoutResult {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

interface BranchInfo {
  branch: Branch;
  centerPort: string;        // unique on center
  hubLeftPort: string;       // always lp-0 for hub
  hubRightPort: string;      // always rp-0 for hub
  branchCollapsed: boolean;
  hubChildrenCollapsed: boolean;
}

const HUB_LEFT_PORT = portIdLeft(0);
const HUB_RIGHT_PORT = portIdRight(0);
const LEAF_LEFT_PORT = portIdLeft(0);

export function buildLayout(
  topology: Topology,
  collapsedPorts: Set<string>,
  selectedRootId: string,
): LayoutResult {
  const nodeRecords = new Map<string, NodeRecord>();
  const edgeSpecs: EdgeSpec[] = [];
  const ports = new Map<string, PortAlloc>();
  const activePorts = new Map<string, Set<string>>();
  const togglePorts = new Map<string, TogglePortInfo[]>();

  function markActive(nodeId: string, portId: string): void {
    let s = activePorts.get(nodeId);
    if (!s) {
      s = new Set();
      activePorts.set(nodeId, s);
    }
    s.add(portId);
  }

  function addToggle(nodeId: string, portId: string, collapsed: boolean): void {
    let arr = togglePorts.get(nodeId);
    if (!arr) {
      arr = [];
      togglePorts.set(nodeId, arr);
    }
    if (arr.some((t) => t.portId === portId)) return;
    arr.push({ portId, collapsed });
  }

  function isCollapsed(nodeId: string, portId: string): boolean {
    return collapsedPorts.has(`${nodeId}::${portId}`);
  }

  ensureNicsFor(topology.center);
  const centerOffline = topology.center.status === 'offline';

  function applyOffline<T extends BaseDevice>(d: T): T {
    if (!centerOffline) return d;
    if (d.id === topology.center.id) return d;
    if (d.status === 'offline') return d;
    return { ...d, status: 'offline' } as T;
  }

  const branchInfos: BranchInfo[] = [];
  for (const branch of topology.branches) {
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

    branchInfos.push({
      branch,
      centerPort,
      hubLeftPort: HUB_LEFT_PORT,
      hubRightPort: HUB_RIGHT_PORT,
      branchCollapsed,
      hubChildrenCollapsed,
    });
  }

  interface VisibleBranchPos {
    hubY: number;
    leafYs: Map<string, number>;
  }
  const branchPosByIdx: (VisibleBranchPos | null)[] = [];
  let cursor = 0;
  for (const info of branchInfos) {
    if (info.branchCollapsed) {
      branchPosByIdx.push(null);
      continue;
    }
    const childCount = info.hubChildrenCollapsed ? 0 : info.branch.children.length;
    const stackH = childCount > 0 ? childCount * LEAF_ROW_HEIGHT - ROW_GAP : 0;
    const blockH = Math.max(LEAF_H, stackH);
    const blockTop = cursor;
    const hubY = blockTop + blockH / 2;
    const leafYs = new Map<string, number>();
    if (childCount > 0) {
      const stackTop = blockTop + (blockH - stackH) / 2 + LEAF_H / 2;
      info.branch.children.forEach((child, i) => {
        const leafId = `${info.branch.id}__${child.id}`;
        leafYs.set(leafId, stackTop + i * LEAF_ROW_HEIGHT);
      });
    }
    branchPosByIdx.push({ hubY, leafYs });
    cursor += blockH + BRANCH_GAP;
  }
  const branchesH = cursor > 0 ? cursor - BRANCH_GAP : 0;
  const totalH = Math.max(branchesH, CENTER_H);
  const centerY = totalH / 2;
  const branchOffset = Math.max(0, (totalH - branchesH) / 2);

  nodeRecords.set(topology.center.id, {
    id: topology.center.id,
    device: topology.center,
    role: 'center',
    x: COL_X[0],
    y: centerY - CENTER_H / 2,
  });

  branchInfos.forEach((info, i) => {
    if (info.branchCollapsed) return;
    const pos = branchPosByIdx[i]!;
    const branch = info.branch;

    nodeRecords.set(branch.hub.id, {
      id: branch.hub.id,
      device: applyOffline(branch.hub),
      role: 'hub',
      x: COL_X[1],
      y: branchOffset + pos.hubY - LEAF_H / 2,
    });

    edgeSpecs.push({
      id: branch.id,
      source: topology.center.id,
      target: branch.hub.id,
      sourcePort: info.centerPort,
      targetPort: HUB_LEFT_PORT,
      kind: branch.kind,
      hasMarker: true,
    });

    if (info.hubChildrenCollapsed) return;

    branch.children.forEach((child) => {
      const leafId = `${branch.id}__${child.id}`;
      const leafY = pos.leafYs.get(leafId)!;
      nodeRecords.set(leafId, {
        id: leafId,
        device: applyOffline(child),
        role: 'leaf',
        x: COL_X[2],
        y: branchOffset + leafY - LEAF_H / 2,
      });
      edgeSpecs.push({
        id: `${branch.id}__edge__${child.id}`,
        source: branch.hub.id,
        target: leafId,
        sourcePort: HUB_RIGHT_PORT,
        targetPort: LEAF_LEFT_PORT,
        kind: branch.kind,
        hasMarker: false,
      });
    });
  });

  const recordByDeviceId = new Map<string, NodeRecord>();
  for (const rec of nodeRecords.values()) {
    recordByDeviceId.set(rec.device.id, rec);
  }

  let maxRightX = 0;
  for (const rec of nodeRecords.values()) {
    maxRightX = Math.max(maxRightX, rec.x + NODE_W);
  }

  const additions = getAdditions(selectedRootId);
  const groupedByParent = new Map<string, typeof additions>();
  for (const add of additions) {
    let arr = groupedByParent.get(add.parentDeviceId);
    if (!arr) {
      arr = [];
      groupedByParent.set(add.parentDeviceId, arr);
    }
    arr.push(add);
  }

  for (const [parentDeviceId, group] of groupedByParent) {
    const parent = recordByDeviceId.get(parentDeviceId);
    if (!parent) continue;

    const colX = maxRightX + 60;
    const N = group.length;
    const stackH = N * LEAF_H + (N - 1) * ROW_GAP;
    const stackTop = parent.y + heightOf(parent.role) / 2 - stackH / 2;

    group.forEach((add, i) => {
      const ax = colX;
      const ay = stackTop + i * (LEAF_H + ROW_GAP);

      const newRec: NodeRecord = {
        id: add.id,
        device: applyOffline(add.device),
        role: 'leaf',
        x: ax,
        y: ay,
      };
      nodeRecords.set(add.id, newRec);
      recordByDeviceId.set(add.device.id, newRec);
      ensureNicsFor(add.device);

      // Parent's port: keep whatever the user clicked from
      markActive(parent.id, add.parentNicId);
      // New device is non-center → forced lp-0
      markActive(add.id, LEAF_LEFT_PORT);

      edgeSpecs.push({
        id: `addition-edge-${add.id}`,
        source: parent.id,
        target: add.id,
        sourcePort: add.parentNicId,
        targetPort: LEAF_LEFT_PORT,
        kind: add.kind,
        hasMarker: false,
      });
    });

    maxRightX = colX + NODE_W;
  }

  const childrenOf = new Map<string, string[]>();
  const portConnByNode = new Map<string, Map<string, number>>();
  function bumpPortConn(nodeId: string, portId: string): void {
    let m = portConnByNode.get(nodeId);
    if (!m) {
      m = new Map();
      portConnByNode.set(nodeId, m);
    }
    m.set(portId, (m.get(portId) ?? 0) + 1);
  }
  for (const e of edgeSpecs) {
    let arr = childrenOf.get(e.source);
    if (!arr) {
      arr = [];
      childrenOf.set(e.source, arr);
    }
    arr.push(e.target);
    bumpPortConn(e.source, e.sourcePort);
    bumpPortConn(e.target, e.targetPort);
  }

  const subtreePingCache = new Map<string, boolean>();
  function isSubtreePinged(nodeId: string): boolean {
    if (centerOffline) return false;
    const cached = subtreePingCache.get(nodeId);
    if (cached !== undefined) return cached;
    const rec = nodeRecords.get(nodeId);
    if (!rec) {
      subtreePingCache.set(nodeId, false);
      return false;
    }
    let on =
      rec.role !== 'center' &&
      (rec.device.isChild === true ||
        rec.device.unreachable === true ||
        isPingOn(selectedRootId, rec.device.id));
    if (!on) {
      const kids = childrenOf.get(nodeId) ?? [];
      on = kids.some((k) => isSubtreePinged(k));
    }
    subtreePingCache.set(nodeId, on);
    return on;
  }

  const activeNicKeys: string[] = [];
  for (const [nodeId, portSet] of activePorts) {
    const rec = nodeRecords.get(nodeId);
    if (!rec) continue;
    for (const portId of portSet) {
      activeNicKeys.push(`${rec.device.id}::${portId}`);
    }
  }
  setActiveNics(activeNicKeys);

  const nodes: Node<NodeData>[] = [];
  for (const rec of nodeRecords.values()) {
    let portCount: { left: number; right: number };
    if (rec.role === 'center') {
      const alloc = ports.get(rec.id);
      const base = PORT_COUNT[rec.device.type];
      portCount = {
        left: base.left,
        right: Math.max(base.right, alloc?.rightIdx ?? 0),
      };
    } else {
      portCount = { left: 1, right: 1 };
    }
    const connMap = portConnByNode.get(rec.id);
    const portConnections: Record<string, number> = {};
    if (connMap) {
      for (const [portId, count] of connMap) portConnections[portId] = count;
    }
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

  const edges: Edge<EdgeData>[] = edgeSpecs.map((s) => {
    const pinging = isSubtreePinged(s.target);
    const targetRec = nodeRecords.get(s.target);
    const targetUnreachable = targetRec?.device.unreachable === true;
    const classes: string[] = [];
    if (pinging) classes.push('pinging');
    if (targetUnreachable) classes.push('edge-unreachable');
    return {
      id: s.id,
      source: s.source,
      target: s.target,
      sourceHandle: s.sourcePort,
      targetHandle: s.targetPort,
      type: 'topology',
      data: { kind: s.kind, unreachable: targetUnreachable },
      style: edgeStyle(s.kind),
      class: classes.length > 0 ? classes.join(' ') : undefined,
      markerEnd: s.hasMarker
        ? {
            type: MarkerType.ArrowClosed,
            color: s.kind === 'wireless' ? WIRELESS : WIRED,
            width: 14,
            height: 14,
          }
        : undefined,
    };
  });

  return { nodes, edges };
}
