"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { MQ, useMediaQuery } from "@/lib/hooks";
import { Wordmark } from "@/features/shell/parts";
import type { StructuralMember } from "@/domain/structure";
import { StructureView } from "@/three/structure-view";
import { Label } from "@/ui/typography";
import { MagneticLink } from "./magnetic";

const CHAPTERS = [
  {
    id: "foundation",
    index: "01",
    name: "Start small",
    title: "Every habit is a beam.",
    body: "Add a few habits you want to keep. Each one becomes a beam in your bridge. Do it every day and the bridge gets stronger.",
  },
  {
    id: "load",
    index: "02",
    name: "Choose what matters",
    title: "Some habits matter more.",
    body: "Mark how important each habit is, from 1 to 5. The important ones count more toward your daily score.",
  },
  {
    id: "balance",
    index: "03",
    name: "Stay balanced",
    title: "Do them all, and it stands level.",
    body: "Check off your habits each day. When everything is done, your bridge stands straight. Miss a few and it starts to bend.",
  },
] as const;

// The landing model is illustrative; its members aren't user data.
const SHOWCASE: StructuralMember[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), label: "", weight: 3, state: "pending" }));

export function Landing() {
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const wide = useMediaQuery(MQ.desktop);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]);
      if (cancelled || !stage.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let lenis: InstanceType<typeof Lenis> | null = null;
      const raf = (time: number) => lenis?.raf(time * 1000);
      if (!reduce) {
        lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
      }

      // Intro: the foundation assembles on arrival, before any scrolling.
      const intro = { value: 0 };
      let scrolled = 0;
      const apply = () => {
        progress.current = Math.max(intro.value, scrolled);
      };

      const ctx = gsap.context(() => {
        gsap.to(intro, { value: 0.16, duration: reduce ? 0 : 3.2, delay: reduce ? 0 : 0.4, ease: "power2.inOut", onUpdate: apply });
        ScrollTrigger.create({
          trigger: stage.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => {
            scrolled = Math.min(1, Math.max(0, (self.progress - 0.06) / 0.9));
            apply();
          },
        });

        // Hero copy leaves as the structure starts to assemble.
        // autoAlpha also hides it, so faded links can't catch clicks.
        gsap.to("[data-hero]", {
          autoAlpha: 0,
          y: reduce ? 0 : -40,
          ease: "none",
          scrollTrigger: { trigger: stage.current, start: "top top", end: "8% top", scrub: true },
        });

        // Each chapter fades in and out over its slice of the pinned stage.
        gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((el, i) => {
          const from = 0.12 + i * 0.28;
          const tl = gsap.timeline({
            scrollTrigger: { trigger: stage.current, start: `${from * 100}% top`, end: `${(from + 0.28) * 100}% top`, scrub: true },
          });
          tl.fromTo(el, { opacity: 0, y: reduce ? 0 : 36 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.35 })
            .to(el, { opacity: 1, duration: 0.4 })
            .to(el, { opacity: i === CHAPTERS.length - 1 ? 1 : 0, y: reduce || i === CHAPTERS.length - 1 ? 0 : -36, ease: "power2.in", duration: 0.25 });
          el.querySelectorAll("[data-rule]").forEach((rule) => tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, 0));
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.fromTo(el, { opacity: 0, y: reduce ? 0 : 28 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
        });

        gsap.to("[data-progress]", { scaleX: 1, ease: "none", scrollTrigger: { trigger: stage.current, start: "top top", end: "bottom bottom", scrub: true } });
      });

      const onAnchor = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
        if (!a || !lenis) return;
        e.preventDefault();
        lenis.scrollTo(a.getAttribute("href")!, { offset: 0, duration: 1.6 });
      };
      document.addEventListener("click", onAnchor);

      cleanup = () => {
        document.removeEventListener("click", onAnchor);
        ctx.revert();
        gsap.ticker.remove(raf);
        lenis?.destroy();
      };
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <main className="relative bg-bg">
      <header className="fixed inset-x-0 top-0 z-30 mix-blend-difference">
        <div className="flex h-16 items-center justify-between px-4 text-white md:px-10">
          <Wordmark className="!text-white" />
          <nav aria-label="Primary" className="flex items-center gap-6 text-[13px]">
            <a href="#foundation" className="hidden text-white/70 transition-colors hover:text-white sm:inline">
              Principles
            </a>
            <Link href="/today" className="text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              Open app
            </Link>
          </nav>
        </div>
        <div className="h-px origin-left scale-x-0 bg-white/80" data-progress />
      </header>

      {/* Pinned stage: the structure assembles as the chapters scroll past. */}
      <div ref={stage} className="relative h-[520svh]">
        <div className="sticky top-0 h-svh overflow-hidden">
          <StructureView
            members={SHOWCASE}
            mode="assemble"
            progress={progress}
            shift={wide ? 0.2 : 0}
            label="A bridge that builds itself as you scroll."
            className="absolute inset-0 h-full w-full"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/60 md:bg-gradient-to-r md:from-bg md:via-bg/30 md:to-transparent" />

          <div data-hero className="absolute inset-0 flex flex-col justify-end px-4 pb-[12svh] md:justify-center md:px-10 md:pb-0">
            <Label className="mb-6">A simple habit tracker</Label>
            <h1 className="text-mega font-semibold text-fg-strong">Equilibrium</h1>
            <p className="mt-6 max-w-md text-[18px] leading-snug text-fg md:text-[21px]">Build good habits, one day at a time.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <MagneticLink href="/today">
                Enter Equilibrium <ArrowRight className="size-4" strokeWidth={1.5} />
              </MagneticLink>
              <a href="#foundation" className="inline-flex h-14 items-center px-4 text-[15px] text-muted-strong transition-colors hover:text-fg">
                How it works
              </a>
            </div>
            <div className="absolute bottom-6 left-4 right-4 hidden items-end justify-between md:left-10 md:right-10 md:flex">
              <Label>Scroll down</Label>
            </div>
          </div>

          {CHAPTERS.map((c) => (
            <article
              key={c.id}
              data-chapter
              aria-labelledby={`${c.id}-title`}
              className="pointer-events-none absolute inset-x-4 bottom-[8svh] opacity-0 md:inset-x-auto md:bottom-auto md:left-10 md:top-1/2 md:w-[420px] md:-translate-y-1/2"
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-fg">{c.index}</span>
                <span data-rule className="h-px w-10 origin-left bg-fg" />
                <Label>{c.name}</Label>
              </div>
              <h2 id={`${c.id}-title`} className="mt-6 text-[clamp(2rem,4.4vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.02em] text-fg-strong">
                {c.title}
              </h2>
              <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-muted-strong">{c.body}</p>
            </article>
          ))}
        </div>
        {/* Anchors for in-page navigation, positioned at each chapter's slice. */}
        {CHAPTERS.map((c, i) => (
          <span key={c.id} id={c.id} aria-hidden className="absolute left-0" style={{ top: `${(0.18 + i * 0.28) * 100}%` }} />
        ))}
      </div>

      <section aria-labelledby="cta" className="relative border-t border-line px-4 py-[18svh] md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-12">
          <Label data-reveal>Ready?</Label>
          <h2 id="cta" data-reveal className="max-w-5xl text-[clamp(3rem,9vw,8.5rem)] font-semibold leading-[0.9] tracking-[-0.035em] text-fg-strong">
            Build a life that holds.
          </h2>
          <div data-reveal className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-[17px] leading-relaxed text-muted-strong">
              Free and private. No account needed. Everything stays on your device.
            </p>
            <MagneticLink href="/today">
              Enter Equilibrium <ArrowRight className="size-4" strokeWidth={1.5} />
            </MagneticLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <p className="text-[13px] text-muted-strong">Your data stays on your device</p>
          <p className="text-[13px] text-muted-strong">
            Made by <span className="text-fg">Nourah Aleissa</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
