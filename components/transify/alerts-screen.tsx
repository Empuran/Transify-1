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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, limit } from "firebase/firestore"

// ── Alert type icon helper ───────────────────────────────────────────────────
function AlertIcon({ type }: { type: string }) {
  const t = (type || "").toLowerCase()
  if (t.includes("arriv")) return <MapPin className="h-5 w-5 text-success" />
  if (t.includes("trip_started") || t.includes("started")) return <Bus className="h-5 w-5 text-primary" />
  if (t.includes("delay")) return <Clock className="h-5 w-5 text-warning" />
  if (t.includes("sos") || t.includes("emergency")) return <AlertTriangle className="h-5 w-5 text-destructive" />
  return <Bell className="h-5 w-5 text-muted-foreground" />
}

function alertBg(type: string) {
  const t = (type || "").toLowerCase()
  if (t.includes("arriv")) return "bg-success/10"
  if (t.includes("started")) return "bg-primary/10"
  if (t.includes("delay")) return "bg-warning/10"
  if (t.includes("sos") || t.includes("emergency")) return "bg-destructive/10"
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
    const phone = profile?.phone
    if (!phone) { setLoading(false); return }

    const q = query(
      collection(db, "alerts"),
      where("parent_phone", "==", phone),
      orderBy("created_at", "desc"),
      limit(50)
    )

    const unsub = onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))

    return unsub
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
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                Mark all read
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
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", alertBg(alert.type))}>
              <AlertIcon type={alert.type} />
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className={cn("text-sm font-semibold leading-snug text-foreground", !alert.read && "text-foreground")}>{alert.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(alert.created_at)}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
              {alert.eta_minutes && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                  <Clock className="h-3 w-3" />ETA ~{alert.eta_minutes} min · {alert.boarding_stop}
                </span>
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
