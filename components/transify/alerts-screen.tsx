"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  BellOff,
  CheckCircle2,
  MapPin,
  Bus,
  AlertTriangle,
  Clock,
  Loader2,
  Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, limit } from "firebase/firestore"

// ── Alert type icon helper ───────────────────────────────────────────────────
function AlertIcon({ type, priority }: { type: string, priority?: string }) {
  const t = (type || "").toLowerCase()
  if (priority === "emergency" || t.includes("sos")) return <AlertTriangle className="h-5 w-5 text-white" />
  if (t.includes("trip_started") || t.includes("started")) return <Bus className="h-5 w-5 text-primary" />
  if (t.includes("trip_end") || t.includes("completed") || t.includes("student_reached")) return <CheckCircle2 className="h-5 w-5 text-success" />
  if (t.includes("stop_reached") || t.includes("arrived")) return <MapPin className="h-5 w-5 text-success" />
  if (t.includes("stops_away")) return <Navigation className="h-5 w-5 text-primary" />
  if (t.includes("stop_departed") || t.includes("departed")) return <Navigation className="h-5 w-5 text-primary rotate-45" />
  if (t.includes("approaching")) return <Navigation className="h-5 w-5 text-primary" />
  if (t.includes("delay")) return <Clock className="h-5 w-5 text-warning" />
  if (t.includes("reached_school")) return <CheckCircle2 className="h-5 w-5 text-success" />
  return <Bell className="h-5 w-5 text-muted-foreground" />
}

function alertBg(type: string, priority?: string) {
  const t = (type || "").toLowerCase()
  if (priority === "emergency" || t.includes("sos")) return "bg-destructive shadow-lg shadow-destructive/30"
  if (t.includes("trip_started")) return "bg-primary/10"
  if (t.includes("trip_end") || t.includes("completed") || t.includes("student_reached")) return "bg-success/10"
  if (t.includes("stop_reached") || t.includes("arrived") || t.includes("stops_away")) return "bg-success/5"
  if (t.includes("stop_departed") || t.includes("departed")) return "bg-primary/5"
  if (t.includes("approaching")) return "bg-primary/5"
  if (t.includes("delay")) return "bg-warning/10"
  if (t.includes("reached_school")) return "bg-success/10"
  return "bg-muted"
}

function timeAgo(ts: any): string {
  if (!ts) return ""
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function ParentAlertsScreen() {
  const { profile } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to alerts filtered by parent phone
  useEffect(() => {
    if (!profile?.phone) { setLoading(false); return }

    const clean = profile.phone.replace(/\s+/g, "").replace(/-/g, "")
    const digits10 = clean.replace(/^\+91/, "").replace(/^0/, "").slice(-10)
    const variants = digits10.length === 10 ? [`+91${digits10}`, `0${digits10}`, digits10] : [clean]

    let cancelled = false
    const unsubscribers: Array<() => void> = []
    const allAlerts: any[] = []
    const seenAlertIds = new Set<string>()

    const processSnapshot = () => {
      if (cancelled) return
      const sorted = [...allAlerts].sort((a, b) => {
        try {
          const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : (a.created_at?.seconds ? a.created_at.seconds * 1000 : 0)
          const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : (b.created_at?.seconds ? b.created_at.seconds * 1000 : 0)
          return timeB - timeA
        } catch { return 0 }
      })
      setAlerts(sorted.slice(0, 50))
      setLoading(false)
    }

    variants.forEach(variant => {
      const q = query(
        collection(db, "alerts"),
        where("parent_phone", "==", variant),
        limit(50)
      )
      const unsub = onSnapshot(q, (snap) => {
        console.log(`[ParentAlerts] Variant ${variant} got ${snap.docs.length} alerts`)
        
        // Find existing alerts for this phone number variant
        const variantAlerts = allAlerts.filter(a => a.parent_phone === variant)
        
        // If snapshot is empty, remove all alerts for this variant from our local cache
        if (snap.empty) {
          variantAlerts.forEach(va => {
            const idx = allAlerts.findIndex(a => a.id === va.id)
            if (idx !== -1) allAlerts.splice(idx, 1)
            seenAlertIds.delete(va.id)
          })
        } else {
          snap.docs.forEach(d => {
            if (!seenAlertIds.has(d.id)) {
              seenAlertIds.add(d.id)
              allAlerts.push({ id: d.id, ...d.data() })
            } else {
              // Update existing
              const idx = allAlerts.findIndex(a => a.id === d.id)
              if (idx !== -1) allAlerts[idx] = { id: d.id, ...d.data() }
            }
          })
          
          // Remove alerts that were deleted remotely for this variant
          const currentIds = new Set(snap.docs.map(d => d.id))
          variantAlerts.forEach(va => {
            if (!currentIds.has(va.id)) {
               const idx = allAlerts.findIndex(a => a.id === va.id)
               if (idx !== -1) allAlerts.splice(idx, 1)
               seenAlertIds.delete(va.id)
            }
          })
        }
        
        try {
          processSnapshot()
        } catch (err) {
          console.error("[ParentAlerts] Error sorting alerts:", err)
        }
      }, (err) => {
        console.warn("Alert query failed for variant:", variant, err)
      })
      unsubscribers.push(unsub)
    })

    const timer = setTimeout(() => {
      if (!cancelled && allAlerts.length === 0) setLoading(false)
    }, 2000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribers.forEach(u => u())
    }
  }, [profile?.phone])

  const unreadCount = alerts.filter(a => !a.read).length

  const markRead = async (alertId: string) => {
    try {
      await updateDoc(doc(db, "alerts", alertId), { read: true })
    } catch { }
  }

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.read)
    await Promise.all(unread.map(a => updateDoc(doc(db, "alerts", a.id), { read: true })))
  }

  const clearAll = async () => {
    if (!alerts.length) return
    const confirmed = window.confirm("Are you sure you want to clear all notifications?")
    if (!confirmed) return
    
    setLoading(true)
    try {
      const promises = alerts.map(a => deleteDoc(doc(db, "alerts", a.id)))
      await Promise.all(promises)
    } catch (e) {
      console.error("Error clearing alerts", e)
    } finally {
      // Local state will update via snapshot
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Alerts</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors active:bg-primary/20"
              >
                Mark read
              </button>
            )}
            {alerts.length > 0 && (
              <button
                onClick={clearAll}
                className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted/80"
              >
                Clear all
              </button>
            )}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 px-4 pt-4">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading alerts…</p>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No alerts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You'll get notified when the bus starts or is near your stop.
              </p>
            </div>
          </div>
        )}

        {!loading && alerts.map(alert => (
          <button
            key={alert.id}
            onClick={() => !alert.read && markRead(alert.id)}
            className={cn(
              "relative flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all active:scale-[0.98]",
              !alert.read && "border-primary/20 shadow-primary/5"
            )}
          >
            {/* Icon */}
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95", alertBg(alert.type, alert.priority))}>
              <AlertIcon type={alert.type} priority={alert.priority} />
            </div>
 
            {/* Text */}
            <div className="flex flex-1 flex-col gap-1 min-w-0 py-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                   <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold leading-snug text-foreground", !alert.read && "text-primary/90")}>{alert.title}</span>
                    {alert.priority === "emergency" && (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-white animate-pulse">Emergency</span>
                    )}
                    {alert.priority === "warning" && (
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest text-warning">Alert</span>
                    )}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight mt-1">
                     {alert.bus_number && (
                       <span className="flex items-center gap-1">
                         <Bus className="h-3 w-3" /> Bus {alert.bus_number}
                       </span>
                     )}
                     {alert.stop_name && (
                       <>
                         <span>•</span>
                         <span className="flex items-center gap-1">
                           <MapPin className="h-3 w-3" /> {alert.stop_name}
                         </span>
                       </>
                     )}
                   </div>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{timeAgo(alert.created_at)}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground/90 font-medium">{alert.description}</p>
              {alert.eta_minutes && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 p-2 border border-primary/10">
                   <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                   </div>
                   <span className="text-[11px] font-bold text-primary italic">ETA ~{alert.eta_minutes} min · {alert.boarding_stop}</span>
                </div>
              )}
            </div>

            {/* Unread dot */}
            {!alert.read && (
              <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
