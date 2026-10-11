"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Hero background photographs (2560 x 1440). Only one photo is kept for now.
 * Add more paths here to bring back the shuffled cross-fade rotation.
 */
const SLIDES = ["/images/hero-slides/hero-slide-1-2560.jpg"];

/** Time each photo stays on screen before the cross-fade starts (10 seconds). */
const INTERVAL_MS = 10000;

type Cycle = { order: number[]; pos: number };

function subscribeNoop() {
  return () => {};
}

/** Random order of slide indexes. The first photo of a new cycle never repeats the last one. */
function shuffledOrder(previousLast?: number): number[] {
  const order = SLIDES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (previousLast !== undefined && order[0] === previousLast) {
    [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  }
  return order;
}

/**
 * Auto-advancing hero background. It sits behind the same content and overlay
 * as before. Photos mount only after the page hydrates, so a stale cached copy
 * of the page can never leave them stacked in normal flow. Layout-critical
 * styles are inline. Users who ask for reduced motion keep the first photo still.
 */
export function HeroSlideshow() {
  // false on the server and during hydration, true once the page is interactive.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [cycle, setCycle] = useState<Cycle>(() => ({ order: shuffledOrder(), pos: 0 }));

  useEffect(() => {
    if (SLIDES.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setCycle((current) => {
        const next = current.pos + 1;
        if (next < current.order.length) return { order: current.order, pos: next };
        return { order: shuffledOrder(current.order[current.order.length - 1]), pos: 0 };
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const activeIndex = cycle.order[cycle.pos];

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}
    >
      {mounted &&
        SLIDES.map((src, i) => {
          const active = i === activeIndex;
          return (
            <img
              key={src}
              src={src}
              alt=""
              width={2560}
              height={1440}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              data-testid={i === 0 ? "hero-photograph" : undefined}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "60% center",
                opacity: active ? 1 : 0,
                transition: "opacity 1.6s ease-in-out",
              }}
            />
          );
        })}
    </div>
  );
}
