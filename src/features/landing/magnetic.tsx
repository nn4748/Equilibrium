"use client";

import Link from "next/link";
import { useRef } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/ui/button";

/**
 * Link that leans toward the pointer. Fine pointers only; still under reduced
 * motion. Transform is written directly, so React doesn't re-render.
 */
export function MagneticLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={move}
      onPointerLeave={leave}
      className={buttonClass(variant, size, `transition-[transform,background-color,border-color,color] duration-300 ease-settle ${className ?? ""}`)}
    >
      {children}
    </Link>
  );
}
