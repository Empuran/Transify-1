"use client"

import { useEffect, useState } from "react"
import { Bus } from "lucide-react"

interface SplashScreenProps {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800)
    const finishTimer = setTimeout(() => onFinish(), 2300)
    return () => {
      clearTimeout(timer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-foreground/15 backdrop-blur-sm shadow-lg">
          <Bus className="h-12 w-12 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary-foreground">
            Transify
          </h1>
          <p className="text-sm font-medium tracking-wide text-primary-foreground/70">
            Intelligent Transport. Simplified.
          </p>
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground/40" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground/60 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground/80 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
