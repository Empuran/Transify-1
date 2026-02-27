"use client"

import { useEffect, useState } from "react"

interface SplashScreenProps {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "fadeout">("enter")

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 2600)
    const finishTimer = setTimeout(() => onFinish(), 3100)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      style={{ background: "linear-gradient(135deg, #0B0F1A 0%, #0F1E3A 50%, #0B1930 100%)" }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Glow orb */}
      <div
        className="absolute h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }}
      />

      {/* Main logo container */}
      <div className="relative flex flex-col items-center gap-8">

        {/* Logo mark: animated bus + route */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-3xl opacity-30 blur-md"
            style={{ background: "linear-gradient(135deg, #3B82F6, #0EA5E9)" }}
          />

          {/* Icon card */}
          <div
            className="relative flex h-full w-full items-center justify-center rounded-3xl"
            style={{
              background: "linear-gradient(135deg, #1E40AF, #2563EB)",
              boxShadow: "0 0 40px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {/* Animated route SVG */}
            <svg
              viewBox="0 0 80 80"
              className="absolute inset-0 h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Route path — draws itself */}
              <path
                d="M 12 64 Q 24 48 36 38 Q 48 28 64 18"
                fill="none"
                stroke="rgba(147,197,253,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
                className="route-path-animated"
              />
              {/* Animated dot along path */}
              <circle cx="64" cy="18" r="3" fill="#60A5FA" opacity="0.9" className="dot-trail" style={{ animationDelay: "1.3s" }} />
              <circle cx="12" cy="64" r="2.5" fill="#34D399" opacity="0.9" className="dot-trail" />
            </svg>

            {/* Bus icon — slides in */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="relative z-10 h-12 w-12 bus-icon-animated"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 6v6" />
              <path d="M15 6v6" />
              <path d="M2 12h19.6" />
              <path d="M18 18h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
              <circle cx="8" cy="18" r="2" />
              <circle cx="16" cy="18" r="2" />
              <path d="M12 2v4" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <div className="logo-text-animated flex flex-col items-center gap-2">
          <h1
            className="text-5xl font-black tracking-tight text-white"
            style={{ textShadow: "0 0 40px rgba(59,130,246,0.5)" }}
          >
            Trans
            <span style={{ color: "#60A5FA" }}>ify</span>
          </h1>
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: "#64748B" }}>
            Intelligent Transport
          </p>
        </div>

        {/* Animated route progress bar */}
        <div className="flex w-40 flex-col items-center gap-2" style={{ animationDelay: "1.4s" }}>
          <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(59,130,246,0.2)" }}>
            <div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #3B82F6, #0EA5E9, #14B8A6)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear 0.8s infinite, routeProgress 2.2s ease-out 0.4s forwards",
                width: "0%",
              }}
            />
          </div>
        </div>

      </div>

      {/* Bottom tagline */}
      <div
        className="logo-text-animated absolute bottom-16 flex flex-col items-center gap-3"
        style={{ animationDelay: "1.5s" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-px w-8 rounded-full" style={{ background: "rgba(59,130,246,0.4)" }} />
          <p className="text-xs font-medium" style={{ color: "#475569" }}>
            School · Corporate · Logistics
          </p>
          <div className="h-px w-8 rounded-full" style={{ background: "rgba(59,130,246,0.4)" }} />
        </div>
      </div>
    </div>
  )
}
