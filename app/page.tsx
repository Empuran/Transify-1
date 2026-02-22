"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { SplashScreen } from "@/components/transify/splash-screen"
import { useRouter } from "next/navigation"

export default function TransifyRoot() {
  const { user, profile, loading, currentRole } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const router = useRouter()

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false)
  }, [])

  useEffect(() => {
    if (!loading && !showSplash) {
      if (user && currentRole) {
        const rolePath = currentRole === "guardian" ? "/parent" : `/${currentRole}`
        router.push(rolePath)
      } else {
        router.push("/category")
      }
    }
  }, [user, currentRole, loading, showSplash, router])

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
