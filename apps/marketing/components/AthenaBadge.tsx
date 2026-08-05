"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import Image from "next/image";

export default function AthenaBadge() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = hostRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        "px-2 py-2 isolate select-none"
      )}
      style={
        {
          ["--mx" as string]: "50%",
          ["--my" as string]: "50%",
        } as React.CSSProperties
      }
    >
      {/* Subtle moving glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full">
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-[radial-gradient(160px_80px_at_var(--mx)_var(--my),rgba(255,200,80,0.35),transparent_70%)]",
            "blur-2xl"
          )}
        />
      </div>

      {/* Glass pill */}
      <div
        className={cn(
          "relative z-10 rounded-full px-8 py-3",
          "backdrop-blur-xl",
          "bg-white/15",
          "ring-1 ring-white/20",
          "shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="h-6 w-6 shrink-0 rounded-md overflow-hidden" aria-hidden="true">
            <Image
              src="/athena_logo.jpeg"
              alt="Athena"
              width={24}
              height={24}
              className="object-cover"
            />
          </span>
          <span className="text-sm font-medium tracking-wide text-white">
            Backed by Kuzana
          </span>
        </div>
      </div>
    </div>
  );
}
