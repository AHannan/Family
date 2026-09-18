/** Works out the shape of a descendant chart.
 *
 *  Two steps, deliberately separate:
 *    buildTree()    decides who hangs under whom, and at what depth
 *    positionTree() turns that into coordinates once cards have been measured
 *
 *  Card width is fixed, which is what keeps positioning simple: a parent
 *  centred over its children can never be wider than the span it sits above,
 *  so sibling subtrees cannot collide.
 */
import { childrenOf } from './family';
import type { Person } from './types';

export const CARD_W = 220;
export const H_GAP = 28;
export const V_GAP = 64;
/** Used where a generation is a single unbranching link, so long ancestral
 *  chains do not waste the whole canvas on empty space. */
export const V_GAP_TIGHT = 28;

export interface BuiltTree {
  children: Record<string, string[]>;
  depth: Record<string, number>;
  parentOf: Record<string, string>;
  otherParent: Record<string, string | null>;
  order: string[];
}

export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PositionedTree {
  pos: Record<string, Placed>;
  width: number;
  height: number;
}

/**
 * Decide the chart structure below `rootId`.
 *
 * Each person appears exactly once, under their father where the father is
 * part of this chart and under their mother otherwise. That fallback is what
 * keeps a grandchild attached through their mother when the father married in
 * from outside the family.
 */
export function buildTree(
  people: Person[],
  rootId: string | null,
  collapsed: Record<string, boolean> = {},
): BuiltTree {
  const empty: BuiltTree = { children: {}, depth: {}, parentOf: {}, otherParent: {}, order: [] };
  if (!rootId || !people.some((p) => p.id === rootId)) return empty;

  const byId = new Map(people.map((p) => [p.id, p]));

  // Pass 1: who is reachable from the root through either parent link?
  const reachable = new Set<string>([rootId]);
  let frontier = [rootId];
  let guard = 0;
  while (frontier.length && guard++ < 10000) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const c of childrenOf(people, id)) {
        if (!reachable.has(c.id)) {
          reachable.add(c.id);
          next.push(c.id);
        }
      }
    }
    frontier = next;
  }

  // Pass 2: pick each person's single chart parent, father first.
  const children: Record<string, string[]> = {};
  const parentOf: Record<string, string> = {};
  const otherParent: Record<string, string | null> = {};
  for (const id of reachable) children[id] = [];
  for (const id of reachable) {
    if (id === rootId) continue;
    const p = byId.get(id)!;
    const primary =
      p.fatherId && reachable.has(p.fatherId)
        ? p.fatherId
        : p.motherId && reachable.has(p.motherId)
          ? p.motherId
          : null;
    if (!primary) continue;
    parentOf[id] = primary;
    children[primary].push(id);
    const other = primary === p.fatherId ? p.motherId : p.fatherId;
    otherParent[id] = other && reachable.has(other) ? other : null;
  }

  // Keep siblings in a stable, sensible order: oldest-looking first is not
  // knowable from free-text dates, so fall back to insertion order.
  const rank = new Map(people.map((p, i) => [p.id, i]));
  for (const id of Object.keys(children)) {
    children[id].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  }

  // Pass 3: walk it depth-first for depths and paint order.
  const depth: Record<string, number> = {};
  const order: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string, d: number) => {
    if (seen.has(id)) return; // defensive: never loop
    seen.add(id);
    depth[id] = d;
    order.push(id);
    if (collapsed[id]) return;
    for (const c of children[id] ?? []) walk(c, d + 1);
  };
  walk(rootId, 0);

  for (const id of Object.keys(children)) if (!seen.has(id)) delete children[id];

  return { children, depth, parentOf, otherParent, order };
}

/** Turn a built chart into coordinates, given each card's measured height. */
export function positionTree(
  tree: BuiltTree,
  heights: Record<string, number>,
  collapsed: Record<string, boolean> = {},
): PositionedTree {
  const pos: Record<string, Placed> = {};
  if (!tree.order.length) return { pos, width: 0, height: 0 };

  const rowH: number[] = [];
  const perRow: number[] = [];
  for (const id of tree.order) {
    const d = tree.depth[id];
    rowH[d] = Math.max(rowH[d] ?? 0, heights[id] ?? 110);
    perRow[d] = (perRow[d] ?? 0) + 1;
  }

  const rowY: number[] = [];
  let y = 0;
  for (let d = 0; d < rowH.length; d++) {
    rowY[d] = y;
    const sparse = (perRow[d] ?? 0) <= 1 && (perRow[d + 1] ?? 0) <= 1;
    y += (rowH[d] ?? 110) + (sparse ? V_GAP_TIGHT : V_GAP);
  }

  let cursor = 0;
  const place = (id: string) => {
    const kids = collapsed[id] ? [] : (tree.children[id] ?? []);
    const h = heights[id] ?? 110;
    if (!kids.length) {
      pos[id] = { x: cursor + CARD_W / 2, y: rowY[tree.depth[id]], w: CARD_W, h };
      cursor += CARD_W + H_GAP;
      return;
    }
    for (const k of kids) place(k);
    const first = pos[kids[0]].x;
    const last = pos[kids[kids.length - 1]].x;
    pos[id] = { x: (first + last) / 2, y: rowY[tree.depth[id]], w: CARD_W, h };
    cursor = Math.max(cursor, pos[id].x + CARD_W / 2 + H_GAP);
  };
  place(tree.order[0]);

  let width = 0;
  let height = 0;
  for (const id of Object.keys(pos)) {
    width = Math.max(width, pos[id].x + CARD_W / 2);
    height = Math.max(height, pos[id].y + pos[id].h);
  }
  return { pos, width, height };
}

/** Elbow from the bottom of a parent card to the top of a child card. */
export function elbowPath(px: number, py: number, cx: number, cy: number): string {
  const mid = py + (cy - py) / 2;
  if (Math.abs(px - cx) < 0.5) return `M${px},${py} V${cy}`;
  return `M${px},${py} V${mid} H${cx} V${cy}`;
}

/** Gentle curve for the dashed mother links, which can run a long way. */
export function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const dy = Math.max(30, Math.abs(y2 - y1) * 0.5);
  return `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}
