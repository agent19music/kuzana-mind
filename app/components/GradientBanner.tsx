"use client";
import { useRef } from "react";
import { useAnimationFrame } from "framer-motion";

export default function GradientBanner() {
  const ref = useRef<HTMLCanvasElement>(null);

  useAnimationFrame((t) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 0.5;
    const w = (canvas.width = canvas.offsetWidth * scale);
    const h = (canvas.height = canvas.offsetHeight * scale);
    const s = t / 4000;

    ctx.fillStyle = "#b8e4ff";
    ctx.fillRect(0, 0, w, h);

    const blobs = [
      { x: w * (0.15 + 0.25 * Math.sin(s * 0.7)), y: h * (0.5 + 0.4 * Math.cos(s * 0.5)), r: w * 0.8, color: "rgba(255,255,255,0.95)" },
      { x: w * (0.55 + 0.3 * Math.cos(s * 0.9)), y: h * (0.5 + 0.35 * Math.sin(s * 0.6)), r: w * 0.7, color: "rgba(255,255,255,0.9)" },
      { x: w * (0.75 + 0.2 * Math.sin(s * 1.1)), y: h * (0.5 + 0.4 * Math.cos(s * 0.8)), r: w * 0.6, color: "rgba(200,235,255,0.85)" },
    ];

    ctx.globalCompositeOperation = "screen";
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
