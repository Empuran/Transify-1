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
  Crown,
  Baby,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"

interface ParentProfileScreenProps {
  isPremium?: boolean
  onUpgrade?: () => void
  onLogout?: () => void
}

interface ChildInfo {
  id: string
  name: string
  school: string
  route: string
  vehicle: string
}

// ── Modals ────────────────────────────────────────────────────────────────────
function NotificationsModal({ onClose }: { onClose: () => void }) {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [arrivalAlerts, setArrivalAlerts] = useState(true)
  const [delayAlerts, setDelayAlerts] = useState(true)
  const [sosAlerts, setSosAlerts] = useState(true)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {[
          { label: "Push Notifications", sub: "All app alerts", value: pushEnabled, set: setPushEnabled },
          { label: "Arrival Alerts", sub: "When vehicle is 5 min away", value: arrivalAlerts, set: setArrivalAlerts },
          { label: "Delay Alerts", sub: "When trip is running late", value: delayAlerts, set: setDelayAlerts },
          { label: "SOS / Emergency", sub: "Critical safety alerts", value: sosAlerts, set: setSosAlerts },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <Switch checked={item.value} onCheckedChange={item.set} />
          </div>
        ))}
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Save Preferences</button>
      </div>
    </div>
  )
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Privacy & Security</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {[
          { icon: CheckCircle2, label: "Location Sharing", desc: "Your location is never shared with other parents.", ok: true },
          { icon: CheckCircle2, label: "Data Encryption", desc: "All data is encrypted in transit and at rest.", ok: true },
          { icon: CheckCircle2, label: "Two-Factor Auth", desc: "OTP-based login is enabled for your account.", ok: true },
          { icon: AlertCircle, label: "Data Retention", desc: "Trip history is retained for 90 days.", ok: false },
        ].map(item => (
          <div key={item.label} className="flex items-start gap-3 py-3.5 border-b border-border last:border-0">
            <item.icon className={cn("h-5 w-5 mt-0.5 shrink-0", item.ok ? "text-success" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Done</button>
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  const faqs = [
    { q: "How do I track my child's bus?", a: "Go to the Home tab. The live map and trip timeline update automatically." },
    { q: "What happens if the bus is delayed?", a: "You'll receive a push notification and the status will change to \"Delayed\" in the Home screen." },
    { q: "How do I rate my child's driver?", a: "On the Home tab, tap \"Rate Driver\" next to the driver's name after a trip." },
    { q: "Can I add multiple children?", a: "Yes. Ask your school admin to link additional students to your phone number." },
    { q: "Who do I contact for emergencies?", a: "Tap the red SOS button on the Home tab to alert the driver and school admin immediately." },
  ]
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Help & FAQ</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-border last:border-0">
            <button className="flex w-full items-center justify-between py-3.5 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
              <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-90")} />
            </button>
            {open === i && (
              <p className="pb-3.5 text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            )}
          </div>
        ))}
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Close</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ParentProfileScreen({ isPremium = false, onUpgrade, onLogout }: ParentProfileScreenProps) {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  // High contrast — stored in localStorage and applied via a data-attribute on <html>
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("transify_high_contrast") === "1"
    }
    return false
  })

  const toggleHighContrast = useCallback((val: boolean) => {
    setHighContrast(val)
    if (typeof window !== "undefined") {
      localStorage.setItem("transify_high_contrast", val ? "1" : "0")
      document.documentElement.setAttribute("data-high-contrast", val ? "true" : "false")
    }
  }, [])

  // Apply on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("transify_high_contrast") === "1"
      document.documentElement.setAttribute("data-high-contrast", stored ? "true" : "false")
    }
  }, [])

  // Active modal state
  const [modal, setModal] = useState<"notifications" | "privacy" | "help" | null>(null)

  const userName = profile?.globalName || profile?.phone || "Parent"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "P"
  const phone = profile?.phone || ""

  // Fetch real children from Firestore
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [loadingChildren, setLoadingChildren] = useState(true)

  useEffect(() => {
    if (!phone) return
    const fetchChildren = async () => {
      setLoadingChildren(true)
      try {
        const q = query(collection(db, "students"), where("parent_phone", "==", phone))
        const snap = await getDocs(q)
        const results: ChildInfo[] = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data()
          let vehicle = data.vehicle_id || "Not Assigned"
          let route = data.route || "Not Assigned"

          // Resolve vehicle plate
          if (data.vehicle_id && data.vehicle_id.length > 3) {
            try {
              const vSnap = await getDoc(doc(db, "vehicles", data.vehicle_id))
              if (vSnap.exists()) vehicle = vSnap.data().plate_number || vehicle
            } catch {}
          }

          // Resolve route name
          if (data.route && data.route !== "Unassigned") {
            try {
              const rSnap = await getDoc(doc(db, "routes", data.route))
              if (rSnap.exists()) route = rSnap.data().route_name || rSnap.data().name || route
            } catch {}
          }

          return {
            id: d.id,
            name: data.name || "Unknown",
            school: data.organization || data.school || "School",
            route,
            vehicle,
          }
        }))
        setChildren(results)
      } catch (e) {
        console.error("Profile children fetch error:", e)
      } finally {
        setLoadingChildren(false)
      }
    }
    fetchChildren()
  }, [phone])

  return (
    <>
      {modal === "notifications" && <NotificationsModal onClose={() => setModal(null)} />}
      {modal === "privacy" && <PrivacyModal onClose={() => setModal(null)} />}
      {modal === "help" && <HelpModal onClose={() => setModal(null)} />}

      <div className={cn("flex min-h-dvh flex-col bg-background pb-24", highContrast && "contrast-150 brightness-105")}>
        {/* Profile Header */}
        <div className="bg-card px-5 pb-6 pt-[env(safe-area-inset-top)] shadow-sm">
          <div className="flex items-center gap-4 pt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="text-xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{userName}</h1>
                {isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
              </div>
              <p className="text-sm text-muted-foreground">Parent Account</p>
              {phone && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{phone.startsWith("+") ? phone : `+91 ${phone}`}</span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription */}
          {isPremium ? (
            <div className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-foreground">Premium Active</span>
                </div>
                <span className="text-xs text-muted-foreground">Renews Mar 1</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onUpgrade}
              className="mt-4 flex w-full items-center justify-between rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-400/30 px-4 py-3 transition-colors active:bg-yellow-100"
            >
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold text-foreground">Upgrade to Premium</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
          {/* ── Children ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Children
            </h2>
            {loadingChildren ? (
              <div className="flex items-center justify-center px-4 py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : children.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No children linked to this account.</p>
            ) : (
              children.map((child) => (
                <div key={child.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Baby className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground">{child.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {child.school} · {child.route}
                    </span>
                  </div>
                  <div className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-muted px-2 gap-1">
                    <Bus className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">{child.vehicle}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Appearance ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Appearance
            </h2>
            <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
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
            <div className="flex items-center justify-between px-4 py-3.5 border-t border-border">
              <div className="flex items-center gap-3">
                <Contrast className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium text-foreground">High Contrast</span>
                  <p className="text-xs text-muted-foreground">Boost visibility for better readability</p>
                </div>
              </div>
              <Switch checked={highContrast} onCheckedChange={toggleHighContrast} />
            </div>
          </div>

          {/* ── Settings ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </h2>
            {[
              {
                icon: Bell, label: "Notifications", detail: "Enabled",
                action: () => setModal("notifications")
              },
              {
                icon: Shield, label: "Privacy & Security", detail: undefined,
                action: () => setModal("privacy")
              },
              {
                icon: HelpCircle, label: "Help & FAQ", detail: undefined,
                action: () => setModal("help")
              },
              {
                icon: Settings, label: "App Settings", detail: "v2.1.0",
                action: undefined
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="flex w-full items-center gap-3 px-4 py-3.5 border-t border-border first:border-0 transition-colors active:bg-secondary/50"
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

          {/* ── Logout ── */}
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 transition-colors active:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
