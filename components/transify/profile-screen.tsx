"use client"

import {
  User,
  Bus,
  ChevronRight,
  LogOut,
  Phone,
  Moon,
  Sun,
  Contrast,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  CreditCard,
  Crown,
  Baby,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface ParentProfileScreenProps {
  isPremium?: boolean
  onUpgrade?: () => void
  onLogout?: () => void
}

const childrenList = [
  { name: "Arya Sharma", school: "Delhi Public School", route: "Route A12", vehicle: "KA-01-AB-1234" },
  { name: "Vihaan Sharma", school: "International Academy", route: "Route B5", vehicle: "KA-05-CD-5678" },
]

const paymentHistory = [
  { date: "Feb 1, 2026", amount: "299", plan: "Premium Monthly" },
  { date: "Jan 1, 2026", amount: "299", plan: "Premium Monthly" },
]

export function ParentProfileScreen({ isPremium = false, onUpgrade, onLogout }: ParentProfileScreenProps) {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const userName = profile?.globalName || "Nidhin Sharma"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const childrenList = profile?.children || [
    { name: "Arya Sharma", school: "Delhi Public School", route: "Route A12", vehicle: "KA-01-AB-1234" },
    { name: "Vihaan Sharma", school: "International Academy", route: "Route B5", vehicle: "KA-05-CD-5678" },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      {/* Profile Header */}
      <div className="bg-card px-5 pb-6 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center gap-4 pt-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="text-xl font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{userName}</h1>
              {isPremium && (
                <Crown className="h-4 w-4 text-gold" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Parent Account</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{profile?.phone || "+91 98765 43210"}</span>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        {isPremium ? (
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-gold" />
                <span className="text-sm font-semibold text-foreground">Premium Active</span>
              </div>
              <span className="text-xs text-muted-foreground">Renews Mar 1</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onUpgrade}
            className="mt-4 flex w-full items-center justify-between rounded-xl bg-gold/10 px-4 py-3 transition-colors active:bg-gold/20"
          >
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">Upgrade to Premium</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Children */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Children
          </h2>
          {childrenList.map((child, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Baby className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-foreground">{child.name}</span>
                <span className="text-xs text-muted-foreground">
                  {child.school} - {child.route}
                </span>
              </div>
              <div className="flex h-8 items-center justify-center rounded-lg bg-muted px-2">
                <Bus className="h-3 w-3 text-muted-foreground" />
                <span className="ml-1 text-[10px] text-muted-foreground">{child.vehicle}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Payment History (Premium) */}
        {isPremium && (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment History
            </h2>
            {paymentHistory.map((payment, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{payment.plan}</span>
                    <span className="text-xs text-muted-foreground">{payment.date}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{"₹"}{payment.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Appearance */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h2>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">Dark Mode</span>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={(checked: boolean) => setTheme(checked ? "dark" : "light")}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Contrast className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">High Contrast</span>
            </div>
            <Switch />
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h2>
          {[
            { icon: Bell, label: "Notifications", detail: "Enabled" },
            { icon: Shield, label: "Privacy & Security" },
            { icon: HelpCircle, label: "Help & FAQ" },
            { icon: Settings, label: "App Settings", detail: "v2.1.0" },
          ].map((item, i) => (
            <button
              key={i}
              className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors active:bg-secondary/50"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {item.label}
              </span>
              {item.detail && (
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 transition-colors active:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Log Out</span>
        </button>
      </div>
    </div>
  )
}
