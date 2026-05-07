import type { Edge, Node } from '@vue-flow/core';
import { MarkerType } from '@vue-flow/core';
import type {
  BaseDevice,
  Branch,
  BranchDevice,
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

const NODE_W = 240;
const NODE_H = 168;
const COL_GAP = 220;
const ROW_GAP = 28;
const BRANCH_GAP = 56;

const COL_X = [0, NODE_W + COL_GAP, (NODE_W + COL_GAP) * 2];

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
  leftIdx: number;
  rightIdx: number;
  leftCount: number;
  rightCount: number;
}

function getAlloc(map: Map<string, PortAlloc>, id: string, type: DeviceType): PortAlloc {
  let a = map.get(id);
  if (!a) {
    const c = PORT_COUNT[type];
    a = { leftIdx: 0, rightIdx: 0, leftCount: c.left, rightCount: c.right };
    map.set(id, a);
  }
  return a;
}

function nextLeft(map: Map<string, PortAlloc>, id: string, type: DeviceType): string {
  const a = getAlloc(map, id, type);
  const i = a.leftIdx;
  a.leftIdx++;
  return portIdLeft(i);
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

const ROW_HEIGHT = NODE_H + ROW_GAP;

interface LeafInfo {
  child: BranchDevice;
  leafId: string;
  hubSourcePort: string;
  leafTargetPort: string;
  collapsed: boolean;
}

interface BranchInfo {
  branch: Branch;
  centerPort: string;
  hubPort: string;
  collapsed: boolean;
  leaves: LeafInfo[];
}

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
    arr.push({ portId, collapsed });
  }

  function isCollapsed(nodeId: string, portId: string): boolean {
    return collapsedPorts.has(`${nodeId}::${portId}`);
  }

  ensureNicsFor(topology.center);

  const branchInfos: BranchInfo[] = [];
  for (const branch of topology.branches) {
    const centerPort = nextRight(ports, topology.center.id, topology.center.type);
    const hubPort = nextLeft(ports, branch.hub.id, branch.hub.type);
    const branchCollapsed = isCollapsed(topology.center.id, centerPort);

    markActive(topology.center.id, centerPort);
    addToggle(topology.center.id, centerPort, branchCollapsed);

    const leaves: LeafInfo[] = [];
    if (!branchCollapsed) {
      markActive(branch.hub.id, hubPort);
      ensureNicsFor(branch.hub);
      for (const child of branch.children) {
        const leafId = `${branch.id}__${child.id}`;
        const hubSourcePort = nextRight(ports, branch.hub.id, branch.hub.type);
        const leafTargetPort = nextLeft(ports, leafId, child.type);
        const leafCollapsed = isCollapsed(branch.hub.id, hubSourcePort);
        markActive(branch.hub.id, hubSourcePort);
        addToggle(branch.hub.id, hubSourcePort, leafCollapsed);
        if (!leafCollapsed) {
          markActive(leafId, leafTargetPort);
          ensureNicsFor(child);
        }
        leaves.push({ child, leafId, hubSourcePort, leafTargetPort, collapsed: leafCollapsed });
      }
    }

    branchInfos.push({ branch, centerPort, hubPort, collapsed: branchCollapsed, leaves });
  }

  interface VisibleBranchPos {
    hubY: number;
    leafYs: Map<string, number>;
  }
  const branchPosByIdx: (VisibleBranchPos | null)[] = [];
  let cursor = 0;
  for (const info of branchInfos) {
    if (info.collapsed) {
      branchPosByIdx.push(null);
      continue;
    }
    const visibleLeaves = info.leaves.filter((l) => !l.collapsed);
    const leafN = visibleLeaves.length;
    const stackH = leafN > 0 ? leafN * ROW_HEIGHT - ROW_GAP : 0;
    const blockH = Math.max(NODE_H, stackH);
    const blockTop = cursor;
    const hubY = blockTop + blockH / 2;
    const leafYs = new Map<string, number>();
    if (leafN > 0) {
      const stackTop = blockTop + (blockH - stackH) / 2 + NODE_H / 2;
      visibleLeaves.forEach((l, i) => {
        leafYs.set(l.leafId, stackTop + i * ROW_HEIGHT);
      });
    }
    branchPosByIdx.push({ hubY, leafYs });
    cursor += blockH + BRANCH_GAP;
  }
  const totalH = Math.max(NODE_H, cursor > 0 ? cursor - BRANCH_GAP : NODE_H);
  const centerY = totalH / 2;

  nodeRecords.set(topology.center.id, {
    id: topology.center.id,
    device: topology.center,
    role: 'center',
    x: COL_X[0],
    y: centerY - NODE_H / 2,
  });

  branchInfos.forEach((info, i) => {
    if (info.collapsed) return;
    const pos = branchPosByIdx[i]!;
    const branch = info.branch;

    nodeRecords.set(branch.hub.id, {
      id: branch.hub.id,
      device: branch.hub,
      role: 'hub',
      x: COL_X[1],
      y: pos.hubY - NODE_H / 2,
    });

    edgeSpecs.push({
      id: branch.id,
      source: topology.center.id,
      target: branch.hub.id,
      sourcePort: info.centerPort,
      targetPort: info.hubPort,
      kind: branch.kind,
      hasMarker: true,
    });

    info.leaves.forEach((leaf) => {
      if (leaf.collapsed) return;
      const leafY = pos.leafYs.get(leaf.leafId)!;
      nodeRecords.set(leaf.leafId, {
        id: leaf.leafId,
        device: leaf.child,
        role: 'leaf',
        x: COL_X[2],
        y: leafY - NODE_H / 2,
      });
      edgeSpecs.push({
        id: `${branch.id}__edge__${leaf.child.id}`,
        source: branch.hub.id,
        target: leaf.leafId,
        sourcePort: leaf.hubSourcePort,
        targetPort: leaf.leafTargetPort,
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

    const colX = maxRightX + 80;
    const N = group.length;
    const stackH = N * NODE_H + (N - 1) * ROW_GAP;
    const stackTop = parent.y + NODE_H / 2 - stackH / 2;

    group.forEach((add, i) => {
      const ax = colX;
      const ay = stackTop + i * (NODE_H + ROW_GAP);

      const newRec: NodeRecord = {
        id: add.id,
        device: add.device,
        role: 'leaf',
        x: ax,
        y: ay,
      };
      nodeRecords.set(add.id, newRec);
      recordByDeviceId.set(add.device.id, newRec);
      ensureNicsFor(add.device);

      markActive(parent.id, add.parentNicId);
      const tp = nextLeft(ports, add.id, add.device.type);
      markActive(add.id, tp);

      edgeSpecs.push({
        id: `addition-edge-${add.id}`,
        source: parent.id,
        target: add.id,
        sourcePort: add.parentNicId,
        targetPort: tp,
        kind: add.kind,
        hasMarker: false,
      });
    });

    maxRightX = colX + NODE_W;
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
    const alloc = ports.get(rec.id);
    const base = PORT_COUNT[rec.device.type];
    const portCount = {
      left: Math.max(base.left, alloc?.leftIdx ?? 0),
      right: Math.max(base.right, alloc?.rightIdx ?? 0),
    };
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
      },
      draggable: true,
      selectable: false,
    });
  }

  const childrenOf = new Map<string, string[]>();
  for (const e of edgeSpecs) {
    let arr = childrenOf.get(e.source);
    if (!arr) {
      arr = [];
      childrenOf.set(e.source, arr);
    }
    arr.push(e.target);
  }

  const subtreePingCache = new Map<string, boolean>();
  function isSubtreePinged(nodeId: string): boolean {
    const cached = subtreePingCache.get(nodeId);
    if (cached !== undefined) return cached;
    const rec = nodeRecords.get(nodeId);
    if (!rec) {
      subtreePingCache.set(nodeId, false);
      return false;
    }
    let on = rec.role !== 'center' && isPingOn(selectedRootId, rec.device.id);
    if (!on) {
      const kids = childrenOf.get(nodeId) ?? [];
      on = kids.some((k) => isSubtreePinged(k));
    }
    subtreePingCache.set(nodeId, on);
    return on;
  }

  const edges: Edge<EdgeData>[] = edgeSpecs.map((s) => {
    const pinging = isSubtreePinged(s.target);
    return {
      id: s.id,
      source: s.source,
      target: s.target,
      sourceHandle: s.sourcePort,
      targetHandle: s.targetPort,
      type: 'topology',
      data: { kind: s.kind },
      style: edgeStyle(s.kind),
      class: pinging ? 'pinging' : undefined,
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
