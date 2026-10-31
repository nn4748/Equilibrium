import type { MemberState } from "@/domain/structure";

/**
 * Parallel-chord Pratt truss, two planes joined by transverse beams.
 * Interior verticals and diagonals are the habit-carrying members; chords,
 * end posts and bracing form the fixed frame.
 */

export type MemberKind = "chord" | "end" | "web" | "brace";

export interface TrussMember {
  /** Node indices. */
  a: number;
  b: number;
  kind: MemberKind;
  /** Index into the ordered habit list, or -1 for frame members. */
  slot: number;
  /** Assembly order (0–1) used by the build-up animation. */
  order: number;
}

export interface Truss {
  panels: number;
  span: number;
  height: number;
  depth: number;
  /** Base (undeformed) node positions, xyz flattened. */
  nodes: Float32Array;
  /** Column index (0..panels) of each node, for deformation. */
  column: Int16Array;
  members: TrussMember[];
  /** Number of habit slots. */
  slots: number;
}

export const MAX_SLOTS = 23;
const PANEL = 1;
const HEIGHT = 1.15;
const DEPTH = 0.9;

export function panelsFor(memberCount: number): number {
  return Math.min(12, Math.max(4, Math.ceil((memberCount + 1) / 2)));
}

export function buildTruss(memberCount: number): Truss {
  const P = panelsFor(memberCount);
  const span = P * PANEL;
  const nodes: number[] = [];
  const column: number[] = [];
  // node(plane, level, i): plane 0 = front, 1 = back; level 0 = bottom, 1 = top.
  const id = (plane: number, level: number, i: number) => plane * 2 * (P + 1) + level * (P + 1) + i;
  for (let plane = 0; plane < 2; plane++)
    for (let level = 0; level < 2; level++)
      for (let i = 0; i <= P; i++) {
        nodes.push(i * PANEL - span / 2, level * HEIGHT, plane === 0 ? DEPTH / 2 : -DEPTH / 2);
        column.push(i);
      }

  // Web slots, ordered from the centre outward so few habits still read as a balanced structure.
  type Web = { a: [number, number]; b: [number, number]; x: number };
  const webs: Web[] = [];
  for (let j = 0; j < P; j++) {
    const leftHalf = j < P / 2;
    webs.push(leftHalf ? { a: [1, j], b: [0, j + 1], x: j + 0.5 } : { a: [0, j], b: [1, j + 1], x: j + 0.5 });
    if (j > 0) webs.push({ a: [0, j], b: [1, j], x: j });
  }
  const centre = P / 2;
  const slotted = [...webs].sort((p, q) => Math.abs(p.x - centre) - Math.abs(q.x - centre) || p.x - q.x);
  const slotOf = new Map(slotted.map((w, i) => [w, i]));

  const members: TrussMember[] = [];
  for (let plane = 0; plane < 2; plane++) {
    for (let i = 0; i < P; i++) {
      members.push({ a: id(plane, 0, i), b: id(plane, 0, i + 1), kind: "chord", slot: -1, order: 0.05 + (i / P) * 0.25 });
      members.push({ a: id(plane, 1, i), b: id(plane, 1, i + 1), kind: "chord", slot: -1, order: 0.62 + (i / P) * 0.2 });
    }
    members.push({ a: id(plane, 0, 0), b: id(plane, 1, 0), kind: "end", slot: -1, order: 0.33 });
    members.push({ a: id(plane, 0, P), b: id(plane, 1, P), kind: "end", slot: -1, order: 0.33 });
    for (const w of webs) {
      const slot = slotOf.get(w)!;
      members.push({
        a: id(plane, w.a[0], w.a[1]),
        b: id(plane, w.b[0], w.b[1]),
        kind: "web",
        slot,
        order: 0.36 + (w.x / P) * 0.24,
      });
    }
  }
  for (let i = 0; i <= P; i++) {
    members.push({ a: id(0, 0, i), b: id(1, 0, i), kind: "brace", slot: -1, order: 0.12 + (i / P) * 0.2 });
    members.push({ a: id(0, 1, i), b: id(1, 1, i), kind: "brace", slot: -1, order: 0.84 + (i / P) * 0.14 });
  }

  return { panels: P, span, height: HEIGHT, depth: DEPTH, nodes: Float32Array.from(nodes), column: Int16Array.from(column), members, slots: webs.length };
}

export interface MemberSpec {
  weight: number;
  state: MemberState;
}

/**
 * Vertical displacement per column (0..panels) and the overall lean, from
 * accumulated stress and the members currently missed.
 */
export function deformation(truss: Truss, specs: readonly MemberSpec[], stress: number): { sag: Float32Array; tilt: number } {
  const P = truss.panels;
  const sag = new Float32Array(P + 1);
  for (let i = 0; i <= P; i++) sag[i] = -stress * 0.32 * Math.sin((Math.PI * i) / P);
  let moment = 0;
  let missedTotal = 0;
  for (const m of truss.members) {
    if (m.kind !== "web" || m.slot < 0) continue;
    const spec = specs[m.slot];
    if (!spec || spec.state !== "missed") continue;
    // Each plane contributes half; both columns of the member drop.
    const drop = (0.05 * spec.weight) / 5 / 2;
    for (const n of [m.a, m.b]) {
      const c = truss.column[n]!;
      sag[c]! -= drop;
      if (c > 0) sag[c - 1]! -= drop * 0.4;
      if (c < P) sag[c + 1]! -= drop * 0.4;
      moment += (c - P / 2) * spec.weight;
    }
    missedTotal += spec.weight;
  }
  // Supports stay put.
  sag[0] = 0;
  sag[P] = 0;
  const lean = missedTotal > 0 ? Math.sign(moment || 1) : 1;
  return { sag, tilt: -lean * Math.min(1, stress * 1.4) * 0.045 };
}
