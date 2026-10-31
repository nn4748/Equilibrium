import { useMemo } from "react";
import type { StructuralMember } from "@/domain/structure";
import { cn } from "@/lib/cn";
import { buildTruss } from "./truss";

/**
 * Flat elevation of the same truss. Shown while the 3D view loads, when WebGL
 * is unavailable, and as the low-power fallback. Reads the same member data.
 */
export function StructureDiagram({ members, className }: { members: readonly StructuralMember[]; className?: string }) {
  const truss = useMemo(() => buildTruss(members.length), [members.length]);
  const pad = 0.6;
  const w = truss.span + pad * 2;
  const h = truss.height + 1.1;
  const x = (n: number) => truss.nodes[n * 3]! + truss.span / 2 + pad;
  const y = (n: number) => h - 0.55 - truss.nodes[n * 3 + 1]!;
  const front = truss.members.filter((m) => m.kind !== "brace" && truss.nodes[m.a * 3 + 2]! > 0);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full", className)} role="img" aria-label={`Structure with ${members.length} members`}>
      <line x1={0} x2={w} y1={h - 0.55} y2={h - 0.55} stroke="var(--line)" strokeWidth={0.012} />
      {[0, truss.panels].map((i) => (
        <rect key={i} x={i * 1 + pad - 0.12} y={h - 0.55} width={0.24} height={0.3} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={0.01} />
      ))}
      {front.map((m, i) => {
        const spec = m.slot >= 0 ? members[m.slot] : undefined;
        const state = spec?.state;
        const stroke =
          state === "completed" ? "var(--fg-strong)" : state === "pending" ? "var(--muted-strong)" : state === "missed" ? "var(--muted)" : m.kind === "web" ? "var(--line)" : "var(--muted)";
        const width = spec ? 0.03 + spec.weight * 0.008 : m.kind === "web" ? 0.015 : 0.035;
        return (
          <line
            key={i}
            x1={x(m.a)}
            y1={y(m.a)}
            x2={x(m.b)}
            y2={y(m.b)}
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={state === "missed" ? "0.06 0.05" : undefined}
            strokeLinecap="square"
          />
        );
      })}
    </svg>
  );
}
