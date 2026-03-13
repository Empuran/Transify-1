"use client"

import { Home, Route, Bell, User, BarChart3, Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

export type ParentTab = "home" | "trips" | "alerts" | "reports" | "profile"

interface BottomNavProps {
  activeTab: ParentTab
  onTabChange: (tab: ParentTab) => void
  isPremium?: boolean
}

const tabs: { id: ParentTab; label: string; icon: typeof Home; premiumOnly?: boolean }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "trips", label: "Trips", icon: Route },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "reports", label: "Reports", icon: BarChart3, premiumOnly: true },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({ activeTab, onTabChange, isPremium = false }: BottomNavProps) {
  const { profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  // Phone normalization helper
  const phoneVariants = (phone: string): string[] => {
    const clean = phone.replace(/\s+/g, "").replace(/-/g, "")
    const digits10 = clean.replace(/^\+91/, "").replace(/^0/, "").slice(-10)
    if (digits10.length !== 10) return [clean]
    return [
      `+91${digits10}`,
      `+91 ${digits10}`,
      `0${digits10}`,
      digits10,
    ]
  }

  useEffect(() => {
    if (!profile?.phone) return

    const variants = phoneVariants(profile.phone)
    const unsubscribers: Array<() => void> = []
    
    // We only need to know how many unread alerts exist
    let unreadMap = new Map<string, number>()

    const calculateTotal = () => {
      let total = 0
      unreadMap.forEach(count => total += count)
      setUnreadCount(total)
    }

    variants.forEach(variant => {
      const q = query(
        collection(db, "alerts"),
        where("parent_phone", "==", variant),
        where("read", "==", false)
      )
      const unsub = onSnapshot(q, (snap) => {
        unreadMap.set(variant, snap.docs.length)
        calculateTotal()
      })
      unsubscribers.push(unsub)
    })

    return () => {
      unsubscribers.forEach(u => u())
    }
  }, [profile?.phone])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.id === "alerts" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-card animate-in zoom-in">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {tab.premiumOnly && !isPremium && (
                  <Crown className="absolute -right-1.5 -top-1.5 h-3 w-3 text-gold" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {tab.label}
              </span>
              {isActive && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
