"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type RefObject } from "react";
import type { StructuralMember } from "@/domain/structure";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/hooks";
import { useReducedMotionPref } from "@/state/motion-pref";
import { useData } from "@/state/store";
import { useTheme } from "@/state/theme";
import { detectTier, type Tier } from "./quality";
import type { SceneMode } from "./scene";
import { StructureDiagram } from "./structure-diagram";

const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => null });

class SceneBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.warn("3D view unavailable, showing the drawing instead.", error);
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Props {
  members: readonly StructuralMember[];
  stress?: number;
  equilibrium?: boolean;
  mode?: SceneMode;
  progress?: RefObject<number>;
  /** CSS colour token for the scene background, e.g. "--bg". */
  backgroundToken?: string;
  shift?: number;
  className?: string;
  /** Accessible description of what the structure currently shows. */
  label: string;
}

const FALLBACK_BG = { dark: { "--bg": "#000000", "--bg-raised": "#080808" }, light: { "--bg": "#ffffff", "--bg-raised": "#fafafa" } } as const;

/**
 * The structural model. Loads three.js lazily, picks a quality tier, pauses
 * when off-screen and falls back to the flat drawing without WebGL.
 */
export function StructureView({ members, stress = 0, equilibrium = false, mode = "live", progress, backgroundToken = "--bg", shift, className, label }: Props) {
  const hydrated = useHydrated();
  const resolved = useTheme((s) => s.resolved);
  const quality = useData((s) => s.settings.preferences.quality);
  const reducedMotion = useReducedMotionPref();
  const [lost, setLost] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const tier: Tier = hydrated ? detectTier(quality) : "none";
  const dark = resolved === "dark";
  const background = FALLBACK_BG[resolved][backgroundToken as "--bg"] ?? FALLBACK_BG[resolved]["--bg"];

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { rootMargin: "100px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const diagram = (
    <div className="flex h-full w-full items-center justify-center p-6">
      <StructureDiagram members={members} className="max-h-full max-w-3xl" />
    </div>
  );

  return (
    <div ref={ref} role="img" aria-label={label} className={cn("relative overflow-hidden", className)} style={{ background: `var(${backgroundToken})` }}>
      {tier === "none" || lost ? (
        diagram
      ) : (
        <SceneBoundary fallback={diagram}>
          <Scene
            members={members}
            stress={stress}
            equilibrium={equilibrium}
            mode={mode}
            progress={progress}
            dark={dark}
            background={background}
            tier={tier}
            reducedMotion={reducedMotion}
            shift={shift}
            paused={!visible}
            onContextLost={() => setLost(true)}
          />
        </SceneBoundary>
      )}
    </div>
  );
}
