"use client"

import { Home, Route, Bell, User, BarChart3, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

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
