"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { MemberState } from "@/domain/structure";
import { buildTruss, deformation, type MemberSpec, type Truss } from "./truss";

export type SceneMode = "live" | "assemble" | "orbit";

export interface SceneProps {
  members: readonly MemberSpec[];
  stress: number;
  equilibrium: boolean;
  mode: SceneMode;
  /** 0–1 scroll progress, read every frame in "assemble" mode. */
  progress?: RefObject<number>;
  dark: boolean;
  background: string;
  tier: "high" | "low";
  reducedMotion: boolean;
  /** Horizontal shift of the subject, in multiples of the span (positive = right). */
  shift?: number;
  onContextLost?: () => void;
  /** Stops rendering entirely, e.g. while scrolled out of view. */
  paused?: boolean;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Demo members used by the landing sequence (scroll-driven, not user data). */
const DEMO: MemberSpec[] = [5, 3, 4, 2, 5, 3, 4, 2, 3].map((weight) => ({ weight, state: "pending" as MemberState }));

/* ---------------------------------------------------------------- materials */

function useConcreteTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      // Hash noise: deterministic, so the texture is identical on every render.
      const h = Math.sin(i * 12.9898) * 43758.5453;
      const v = 150 + (h - Math.floor(h)) * 90;
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

function useMaterials(dark: boolean) {
  const concreteMap = useConcreteTexture();
  return useMemo(
    () => ({
      steel: new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.88, roughness: 0.48, anisotropy: 0.5, anisotropyRotation: 0 }),
      solid: new THREE.MeshStandardMaterial({
        color: dark ? "#ffffff" : "#0d0d0d",
        metalness: dark ? 0.08 : 0.3,
        roughness: dark ? 0.3 : 0.42,
        emissive: dark ? "#ffffff" : "#000000",
        emissiveIntensity: dark ? 0.16 : 0,
      }),
      wire: new THREE.MeshBasicMaterial({ color: dark ? "#8c8c8c" : "#5a5a5a", wireframe: true, transparent: true, opacity: 0.85 }),
      concrete: new THREE.MeshStandardMaterial({ color: dark ? "#3c3c3c" : "#d4d4d4", roughness: 0.96, metalness: 0, roughnessMap: concreteMap, bumpMap: concreteMap, bumpScale: 0.6 }),
      load: new THREE.MeshBasicMaterial({ color: dark ? "#d9d9d9" : "#1a1a1a", transparent: true, opacity: 0 }),
    }),
    [dark, concreteMap],
  );
}

/* -------------------------------------------------------------------- truss */

const dummy = new THREE.Object3D();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const dir = new THREE.Vector3();

function baseThickness(truss: Truss, index: number, specs: readonly MemberSpec[]) {
  const m = truss.members[index]!;
  if (m.kind === "chord" || m.kind === "end") return 0.075;
  if (m.kind === "brace") return 0.03;
  const spec = specs[m.slot];
  return spec ? 0.03 + spec.weight * 0.011 : 0.022;
}

function steelTone(kind: string, state: MemberState | undefined) {
  if (state === "pending") return 0.55;
  if (state === "idle") return 0.32;
  if (kind === "web") return 0.24;
  return 0.48;
}

interface Anim {
  steel: Float32Array;
  solid: Float32Array;
  solidVel: Float32Array;
  wire: Float32Array;
  grow: Float32Array;
  sag: Float32Array;
  tilt: number;
  clock: number;
  sweep: number;
}

function TrussModel({ members, stress, equilibrium, mode, progress, dark, reducedMotion }: Omit<SceneProps, "background" | "tier" | "onContextLost" | "shift" | "paused">) {
  const specs = mode === "assemble" ? DEMO : members;
  const truss = useMemo(() => buildTruss(specs.length), [specs.length]);
  const M = truss.members.length;
  const mats = useMaterials(dark);
  const invalidate = useThree((s) => s.invalidate);

  const group = useRef<THREE.Group>(null);
  const steel = useRef<THREE.InstancedMesh>(null);
  const solid = useRef<THREE.InstancedMesh>(null);
  const wire = useRef<THREE.InstancedMesh>(null);
  const loads = useRef<THREE.InstancedMesh>(null);
  const piers = useRef<THREE.Group>(null);
  const sweepLight = useRef<THREE.PointLight>(null);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const wireGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1, 6, 1, 1), []);
  const coneGeometry = useMemo(() => new THREE.ConeGeometry(0.06, 0.14, 3).rotateX(Math.PI), []);

  const anim = useRef<Anim>(null!);
  // (Re)initialise animation state whenever the topology changes.
  if (!anim.current || anim.current.steel.length !== M) {
    const startGrown = reducedMotion || mode === "orbit";
    anim.current = {
      steel: new Float32Array(M).fill(1),
      solid: new Float32Array(M),
      solidVel: new Float32Array(M),
      wire: new Float32Array(M),
      grow: new Float32Array(M).fill(startGrown ? 1 : 0),
      sag: new Float32Array(truss.panels + 1),
      tilt: 0,
      clock: startGrown ? 10 : 0,
      sweep: 1,
    };
  }

  // Member tint by state (steel layer only).
  useLayoutEffect(() => {
    const mesh = steel.current;
    if (!mesh) return;
    const c = new THREE.Color();
    truss.members.forEach((m, i) => {
      const tone = steelTone(m.kind, m.slot >= 0 ? specs[m.slot]?.state : undefined);
      mesh.setColorAt(i, c.setScalar(tone));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [specs, truss, invalidate]);

  // Light sweep when equilibrium is reached.
  const wasBalanced = useRef(equilibrium);
  useEffect(() => {
    if (mode !== "assemble" && equilibrium && !wasBalanced.current && !reducedMotion) {
      anim.current.sweep = 0;
      invalidate();
    }
    wasBalanced.current = equilibrium;
  }, [equilibrium, mode, reducedMotion, invalidate]);

  useEffect(() => invalidate(), [members, stress, invalidate]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const a = anim.current;
    const instant = reducedMotion;
    let moving = false;

    // Scroll-driven landing sequence: build (0–0.62), load (0.38–0.75), settle (0.7–1).
    const p = mode === "assemble" ? clamp01(progress?.current ?? 0) : 1;
    let currentStress = stress;
    let stateOf = (slot: number): MemberState | undefined => specs[slot]?.state;
    if (mode === "assemble") {
      currentStress = 0.55 * smooth(0.36, 0.62, p) * (1 - smooth(0.7, 0.92, p));
      const settle = smooth(0.7, 0.98, p);
      stateOf = (slot) => (slot < 0 ? undefined : settle * specs.length > slot + 0.5 ? "completed" : "pending");
      if (p > 0.97 && a.sweep >= 1 && !wasBalanced.current) {
        a.sweep = 0;
        wasBalanced.current = true;
      }
      if (p < 0.9) wasBalanced.current = false;
    }

    // Real elapsed time, so the build-up length is the same on slow GPUs.
    if (mode !== "assemble" && a.clock < 10) a.clock += Math.min(rawDt, 0.25);
    const buildT = mode === "assemble" ? p / 0.62 : a.clock / 1.6;

    const specNow = mode === "assemble" ? specs.map((s, i) => ({ weight: s.weight, state: stateOf(i)! })) : specs;
    const { sag, tilt } = deformation(truss, specNow, currentStress);
    const k = instant ? 1 : 1 - Math.exp(-dt * 5);
    for (let i = 0; i < sag.length; i++) {
      const d = sag[i]! - a.sag[i]!;
      if (Math.abs(d) > 1e-4) moving = true;
      a.sag[i]! += d * k;
    }
    const dTilt = tilt - a.tilt;
    if (Math.abs(dTilt) > 1e-5) moving = true;
    a.tilt += dTilt * k;
    if (group.current) group.current.rotation.z = a.tilt;

    const kFast = instant ? 1 : 1 - Math.exp(-dt * 9);
    for (let i = 0; i < M; i++) {
      const m = truss.members[i]!;
      const state = m.slot >= 0 ? stateOf(m.slot) : undefined;
      const tSteel = state === "missed" ? 0 : 1;
      const tSolid = state === "completed" ? 1 : 0;
      const tWire = state === "missed" ? 1 : 0;
      const tGrow = clamp01((buildT - m.order) / 0.12);

      a.steel[i]! += (tSteel - a.steel[i]!) * kFast;
      a.wire[i]! += (tWire - a.wire[i]!) * kFast;
      a.grow[i]! += (tGrow - a.grow[i]!) * (instant ? 1 : 1 - Math.exp(-Math.min(rawDt, 0.25) * 12));
      if (instant) {
        a.solid[i] = tSolid;
        a.solidVel[i] = 0;
      } else {
        // Under-damped spring: the cladding overshoots and locks into place.
        const acc = 320 * (tSolid - a.solid[i]!) - 17 * a.solidVel[i]!;
        a.solidVel[i]! += acc * dt;
        a.solid[i]! += a.solidVel[i]! * dt;
      }
      if (
        Math.abs(tSteel - a.steel[i]!) > 1e-3 ||
        Math.abs(tWire - a.wire[i]!) > 1e-3 ||
        Math.abs(tGrow - a.grow[i]!) > 1e-3 ||
        Math.abs(tSolid - a.solid[i]!) > 1e-3 ||
        Math.abs(a.solidVel[i]!) > 1e-3
      )
        moving = true;

      // Endpoints, displaced by the sag of their column.
      va.fromArray(truss.nodes, m.a * 3);
      vb.fromArray(truss.nodes, m.b * 3);
      va.y += a.sag[truss.column[m.a]!]!;
      vb.y += a.sag[truss.column[m.b]!]!;
      const g = a.grow[i]!;
      vb.lerp(va, 1 - g);
      dir.subVectors(vb, va);
      const length = dir.length();
      dummy.position.addVectors(va, vb).multiplyScalar(0.5);
      if (length > 1e-5) dummy.quaternion.setFromUnitVectors(X_AXIS, dir.divideScalar(length));
      const th = baseThickness(truss, i, specs);
      const visible = g > 0.001 ? 1 : 0;

      const put = (mesh: THREE.InstancedMesh | null, factor: number, extra: number) => {
        if (!mesh) return;
        const s = factor > 0.002 ? th * extra * factor * visible : 0;
        dummy.scale.set(s > 0 ? length + th * extra * 0.5 : 0, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      };
      put(steel.current, a.steel[i]!, 1);
      put(solid.current, Math.max(0, a.solid[i]!), 1.14);
      put(wire.current, a.wire[i]!, 1.5);
    }
    for (const mesh of [steel.current, solid.current, wire.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;

    // Piers rise first in the landing sequence.
    if (piers.current) {
      const rise = mode === "assemble" ? smooth(0, 0.1, p) : 1;
      piers.current.visible = rise > 0.01;
      piers.current.scale.y = Math.max(0.001, rise);
    }

    // Load markers above the top chord (landing chapter 02).
    if (loads.current) {
      const vis = mode === "assemble" ? smooth(0.36, 0.46, p) * (1 - smooth(0.72, 0.82, p)) : 0;
      mats.load.opacity = vis * 0.9;
      const P = truss.panels;
      for (let c = 0; c < P - 1; c++) {
        const w = specs[c % specs.length]?.weight ?? 3;
        const x = (c + 1) - truss.span / 2;
        const top = truss.height + a.sag[c + 1]!;
        const len = 0.25 + w * 0.09;
        dummy.quaternion.identity();
        dummy.position.set(x, top + 0.16 + len / 2 + (1 - vis) * 0.4, truss.depth / 2);
        dummy.scale.set(0.012, vis > 0.01 ? len : 0, 0.012);
        dummy.updateMatrix();
        loads.current.setMatrixAt(c, dummy.matrix);
      }
      loads.current.count = P - 1;
      loads.current.instanceMatrix.needsUpdate = true;
    }

    // Equilibrium light sweep.
    if (sweepLight.current) {
      if (a.sweep < 1) {
        a.sweep = Math.min(1, a.sweep + dt / 1.8);
        moving = true;
      }
      const t = a.sweep;
      sweepLight.current.position.x = THREE.MathUtils.lerp(-truss.span / 2 - 1.2, truss.span / 2 + 1.2, t * t * (3 - 2 * t));
      sweepLight.current.intensity = t < 1 ? Math.sin(Math.PI * t) * 9 : 0;
    }

    if (moving || mode !== "live") invalidate();
  });

  const pierX = truss.span / 2;
  return (
    <group ref={group} position={[0, 0, 0]}>
      <instancedMesh ref={steel} args={[geometry, mats.steel, M]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={solid} args={[geometry, mats.solid, M]} castShadow frustumCulled={false} />
      <instancedMesh ref={wire} args={[wireGeometry, mats.wire, M]} frustumCulled={false} />
      <instancedMesh ref={loads} args={[geometry, mats.load, 16]} frustumCulled={false} />
      <group ref={piers}>
        {[-pierX, pierX].map((x) => (
          <mesh key={x} position={[x, -0.2, 0]} material={mats.concrete} castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.4, truss.depth + 0.5]} />
          </mesh>
        ))}
      </group>
      <pointLight ref={sweepLight} position={[0, truss.height + 0.4, 1.2]} intensity={0} distance={4} decay={1.4} color="#ffffff" />
      {mode === "assemble" ? <LoadHeads count={truss.panels - 1} truss={truss} geometry={coneGeometry} material={mats.load} sag={anim} progress={progress} /> : null}
    </group>
  );
}

/** Arrow heads for the load markers, following the shafts. */
function LoadHeads({ count, truss, geometry, material, sag, progress }: { count: number; truss: Truss; geometry: THREE.BufferGeometry; material: THREE.Material; sag: RefObject<Anim>; progress?: RefObject<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = clamp01(progress?.current ?? 0);
    const vis = smooth(0.36, 0.46, p) * (1 - smooth(0.72, 0.82, p));
    for (let c = 0; c < count; c++) {
      dummy.quaternion.identity();
      dummy.position.set(c + 1 - truss.span / 2, truss.height + sag.current.sag[c + 1]! + 0.1 + (1 - vis) * 0.4, truss.depth / 2);
      dummy.scale.setScalar(vis > 0.01 ? 1 : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(c, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------- camera */

function Rig({ span, height, mode, progress, reducedMotion, shift = 0 }: { span: number; height: number; mode: SceneMode; progress?: RefObject<number>; reducedMotion: boolean; shift?: number }) {
  const { camera, size, invalidate } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const target = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const orbit = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion, invalidate]);

  useFrame(({ scene }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const portrait = aspect < 0.8;
    const margin = (portrait ? 0.2 : 0.9) + Math.abs(shift) * span;
    const dist = Math.max((span / 2 + margin) / Math.tan(hFov / 2), (height / 2 + 1.2) / Math.tan(vFov / 2));
    // Fog follows the framing so distant (portrait) views never fade out entirely.
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = dist * 0.9;
      scene.fog.far = dist * 2.4;
    }

    let az = 0.38;
    let el = 0.2;
    let zoom = 1;
    if (mode === "assemble") {
      const p = clamp01(progress?.current ?? 0);
      az = -0.55 + p * 0.95;
      el = 0.36 - p * 0.2;
      zoom = 1.18 - p * 0.18;
    } else if (mode === "orbit" && !reducedMotion) {
      orbit.current += dt * 0.07;
      az = orbit.current;
      el = 0.16;
    }
    if (!reducedMotion) {
      az += pointer.current.x * 0.1;
      el += pointer.current.y * 0.05;
    }

    // In portrait, aim below the structure so it sits in the upper half, clear of overlaid text.
    target.set(-shift * span, height / 2 - 0.05 - (portrait ? dist * 0.11 : 0), 0);
    goal.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist * zoom).add(target);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    const before = cam.position.distanceToSquared(goal);
    cam.position.lerp(goal, k);
    cam.lookAt(target);
    if (before > 1e-6 && mode === "live") invalidate();
  });
  return null;
}

/* -------------------------------------------------------------------- scene */

export default function StructureScene(props: SceneProps) {
  const { dark, background, tier: initialTier, mode, reducedMotion, onContextLost } = props;
  const [tier, setTier] = useState(initialTier);
  const span = useMemo(() => buildTruss(mode === "assemble" ? DEMO.length : props.members.length).span, [mode, props.members.length]);
  const continuous = (mode === "orbit" && !reducedMotion) || mode === "assemble";
  const high = tier === "high";

  return (
    <Canvas
      frameloop={props.paused ? "never" : continuous ? "always" : "demand"}
      dpr={high ? [1, 2] : [1, 1.5]}
      shadows={high}
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 2, 14] }}
      gl={{ antialias: !high, powerPreference: "high-performance", alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = dark ? 1.05 : 1.15;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 10, 26]} />
      <PerformanceMonitor onDecline={() => setTier("low")} flipflops={2} />

      <ambientLight intensity={dark ? 0.18 : 0.6} />
      <directionalLight
        position={[4, 7, 6]}
        intensity={dark ? 1.4 : 1.6}
        castShadow={high}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 3, -6]} intensity={dark ? 0.7 : 0.4} />

      <Environment resolution={128} frames={1} environmentIntensity={dark ? 0.85 : 1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-7, 1.5, 2]} rotation-y={Math.PI / 2} scale={[10, 0.4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[7, 2, -1]} rotation-y={-Math.PI / 2} scale={[10, 0.3, 1]} />
        <Lightformer form="ring" intensity={1} position={[0, 2, -8]} scale={4} />
      </Environment>

      <TrussModel {...props} />

      <Grid
        position={[0, -0.401, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        sectionSize={2.5}
        sectionThickness={0.9}
        cellColor={dark ? "#141414" : "#e6e6e6"}
        sectionColor={dark ? "#262626" : "#d0d0d0"}
        fadeDistance={22}
        fadeStrength={1.6}
        infiniteGrid
      />
      {high ? <ContactShadows position={[0, -0.4, 0]} scale={span + 6} opacity={dark ? 0.75 : 0.35} blur={2.4} far={2.2} resolution={512} color="#000000" /> : null}

      <Rig span={span} height={1.15} mode={mode} progress={props.progress} reducedMotion={reducedMotion} shift={props.shift} />

      {high ? (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom mipmapBlur luminanceThreshold={0.86} luminanceSmoothing={0.2} intensity={dark ? 0.38 : 0.12} radius={0.6} />
          <Vignette offset={0.28} darkness={dark ? 0.62 : 0.25} eskil={false} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
