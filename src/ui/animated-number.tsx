"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/** Number that springs to its new value. Rendered with tabular figures. */
export function AnimatedNumber({ value, decimals = 0, pad = 0, className }: { value: number; decimals?: number; pad?: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 });
  const text = useTransform(spring, (v) => v.toFixed(decimals).padStart(pad + (decimals ? decimals + 1 : 0), "0"));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span className={className}>{text}</motion.span>;
}
