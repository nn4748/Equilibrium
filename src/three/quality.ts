export type Tier = "high" | "low" | "none";

let webgl: boolean | null = null;

export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const canvas = document.createElement("canvas");
    webgl = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** Best-guess rendering tier before any frames are measured. */
export function detectTier(preference: "auto" | "high" | "low"): Tier {
  if (typeof window === "undefined" || !hasWebGL()) return "none";
  if (preference !== "auto") return preference;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "low";
  if ((nav.deviceMemory ?? 8) <= 4) return "low";
  if ((nav.hardwareConcurrency ?? 8) <= 4) return "low";
  if (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 768) return "low";
  return "high";
}
