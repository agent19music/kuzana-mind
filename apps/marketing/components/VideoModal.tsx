"use client";

import { useEffect, useCallback, useState } from "react";

interface Props {
  onClose: () => void;
}

export default function VideoModal({ onClose }: Props) {
  const [loaded, setLoaded] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        animation: "modal-fade-in 220ms ease-out both",
      }}
    >
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-scale-in {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spinner-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Video container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 900,
          animation: "modal-scale-in 260ms ease-out both",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close video"
          style={{
            position: "absolute",
            top: -40,
            right: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 400,
            padding: 0,
            transition: "color 150ms ease-out",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Close
        </button>

        {/* 16:9 iframe wrapper */}
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            borderRadius: 10,
            overflow: "hidden",
            background: "#111",
          }}
        >
          {/* Spinner — hidden once iframe fires onLoad */}
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.15)",
                  borderTopColor: "rgba(255,255,255,0.75)",
                  animation: "spinner-spin 700ms linear infinite",
                }}
              />
            </div>
          )}
          <iframe
            src="https://www.youtube-nocookie.com/embed/xjsCk_T-qdA?autoplay=1&rel=0&modestbranding=1&color=white"
            title="Athena demo"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              opacity: loaded ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          />
        </div>
      </div>
    </div>
  );
}
