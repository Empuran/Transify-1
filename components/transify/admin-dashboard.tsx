"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Bus, Users, AlertTriangle, AlertCircle, Clock, Activity, Plus, ChevronRight,
  Search, Download, Route, UserPlus, BarChart3, TrendingUp, Star,
  Navigation, GraduationCap, Bell, Settings, LogOut, Menu,
  Home, Briefcase, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, X, ChevronDown, ShieldCheck, Pencil, Trash2, Car, Truck, Calendar, CircleDashed, User, ArrowLeft, MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { collection, onSnapshot, query, where, orderBy, limit, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AddStudentForm } from "./admin-form-add-student"
import { AddDriverForm } from "./admin-form-add-driver"
import { AddVehicleForm } from "./admin-form-add-vehicle"
import { AddRouteForm } from "./admin-form-add-route"
import { AdminManagement } from "./admin-management"
import { LiveMap } from "./live-map"
import { RemovalReasonModal } from "./removal-reason-modal"
import { useRouter } from "next/navigation"
import { clientAuditLog } from "@/lib/audit-logger-client"
import { StickyHeader } from "./sticky-header"
import { ErrorBoundary } from "@/components/ui/error-boundary"

type ActiveSection = "overview" | "tracking" | "members" | "drivers" | "vehicles" | "routes" | "reports" | "settings" | "admins"
type ActiveForm = "student" | "driver" | "vehicle" | "route" | null

// ── Data ─────────────────────────────────────────────────────────────────────

// vehiclesData, driversData, studentsData, and routesData are now fetched from Firestore 
// see useEffects inside AdminDashboard component

// driversData is now fetched from Firestore — see useEffect inside AdminDashboard

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/[-_ ]/g, "-") // Normalize to hyphen-separated
  const isSuccess = ["on-time", "on-duty", "at-school", "active", "online"].includes(s)
  const isWarning = ["delayed", "idle"].includes(s)
  const isDanger = ["emergency", "sos", "offline", "removed"].includes(s)
  const isPrimary = ["on-bus", "in-progress", "moving"].includes(s)
  const isMuted = ["off-duty", "completed", "stationary"].includes(s)

  // Capitalize each word for label
  const label = status.split(/[-_ ]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors whitespace-nowrap",
      isSuccess ? "bg-success/15 text-success" :
        isWarning ? "bg-warning/15 text-warning" :
          isDanger ? "bg-destructive/15 text-destructive" :
            isPrimary ? "bg-primary/15 text-primary" :
              isMuted ? "bg-muted text-muted-foreground" :
                "bg-muted text-muted-foreground"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full",
        isSuccess ? "bg-success" :
          isWarning ? "bg-warning" :
            isDanger ? "bg-destructive" :
              isPrimary ? "bg-primary" : 
                isMuted ? "bg-muted-foreground" : "bg-muted-foreground"
      )} />
      {label}
    </span>
  )
}

// ── Audit Log Section (Super Admin only) ─────────────────────────────────────
function AuditLogSection({ organizationId }: { organizationId?: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [indexError, setIndexError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    if (!organizationId || !db) return
    setLoading(true)
    
    let q = query(
      collection(db, "audit_logs"),
      where("organization_id", "==", organizationId),
      orderBy("timestamp", "desc"),
      limit(200)
    )

    // Note: startDate/endDate filtering is better done locally if we want instant reaction,
    // or as a query if we have the necessary indexes. For now, we'll keep the snapshot and filter in useMemo.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setLogs(allLogs)
      setIndexError(null)
      setLoading(false)
    }, (err: any) => {
      console.error("Audit log listener error:", err)
      if (err.message?.includes("index")) {
        setIndexError(err.message)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [organizationId])

  const filtered = useMemo(() => {
    let list = logs.filter((l: any) =>
      !search ||
      (l.admin_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.details || "").toLowerCase().includes(search.toLowerCase())
    );

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      
      list = list.filter(l => {
        const t = new Date(l.timestamp).getTime();
        return t >= start && t <= end;
      });
    }

    return list;
  }, [logs, search, startDate, endDate])

  const typeBadge = (action: string = "") => {
    const a = action.toLowerCase()
    if (a.includes("login")) return <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Login</span>
    if (a.includes("delete") || a.includes("remov")) return <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Delete</span>
    if (a.includes("add") || a.includes("creat")) return <span className="rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Add</span>
    return <span className="rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">Edit</span>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[10px] font-medium text-muted-foreground animate-pulse">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          Live
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by admin, action..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground" />
        <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading && <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
        {indexError ? (
          <div className="flex flex-col items-center gap-3 py-12 px-8 text-center bg-destructive/5">
            <AlertCircle className="h-8 w-8 text-destructive opacity-80" />
            <p className="text-sm font-bold text-destructive">Firestore Index Required</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Sorting and filtering requires a composite index. Please click the link below to create it in Firebase Console:
              <br />
              <a href={indexError.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0] || "#"} 
                 target="_blank" rel="noreferrer" className="mt-2 inline-block text-primary underline truncate w-full">
                Create Index
              </a>
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>Retry After Creating</Button>
          </div>
        ) : !loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-sm">No audit entries found</p>
          </div>
        )}
        {!loading && filtered.map((log: any, i: number) => (
          <div key={log.id || i} className="flex items-start gap-4 border-b border-border/50 px-5 py-3.5 hover:bg-muted/30 transition-colors last:border-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {typeBadge(log.action)}
                <span className="text-sm font-semibold text-foreground">{log.action || "Action"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{log.details || log.message || ""}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {log.admin_email || log.actor || "unknown"}
                {log.timestamp ? " · " + new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Filter Chip ──────────────────────────────────────────────────────────────

function FilterDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          value !== "all"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        )}
      >
        <Filter className="h-3 w-3" />
        {label}{value !== "all" ? `: ${value}` : ""}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-32 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg p-1">
          {["all", ...options].map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors capitalize",
                value === opt ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
              )}>
              {opt === "all" ? "All" : opt.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Recent Activity Widget (last 24h from audit_logs) ─────────────────────────
function RecentActivityWidget({ organizationId, onViewLogs }: { organizationId?: string; onViewLogs: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (!organizationId || !db) { setLoading(false); return }
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    
    const q = query(
      collection(db, "audit_logs"),
      where("organization_id", "==", organizationId),
      where("timestamp", ">=", sixHoursAgo),
      orderBy("timestamp", "desc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setLogs(recent)
      setIndexError(null)
      setLoading(false)
    }, (err: any) => {
      console.error("Recent Activity listener error:", err)
      if (err.message?.includes("index")) {
        setIndexError(err.message)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [organizationId])

  const relTime = (ts: any) => {
    if (!ts) return "—"
    let d: Date
    if (ts.toMillis) d = new Date(ts.toMillis())
    else if (ts.seconds) d = new Date(ts.seconds * 1000)
    else d = new Date(ts)

    if (isNaN(d.getTime())) return "—"
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const actionIcon = (action: string) => {
    if (action === "add") return <UserPlus className="h-4 w-4 text-success" />
    if (action === "delete") return <Trash2 className="h-4 w-4 text-destructive" />
    if (action === "update") return <Pencil className="h-4 w-4 text-primary" />
    return <Activity className="h-4 w-4 text-muted-foreground" />
  }
  const actionBg = (action: string) => {
    if (action === "add") return "bg-success/10"
    if (action === "delete") return "bg-destructive/10"
    if (action === "update") return "bg-primary/10"
    return "bg-muted"
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Last 6h</span>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[250px] pr-1">
        {loading && <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
        {indexError ? (
          <div className="flex flex-col items-center gap-2 py-4 px-2 text-center bg-destructive/5 rounded-xl border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive opacity-70" />
            <p className="text-[10px] font-bold text-destructive">Index Required</p>
            <a href={indexError.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0] || "#"} 
               target="_blank" rel="noreferrer" className="text-[9px] text-primary underline truncate w-full">
              Click to Create Index
            </a>
          </div>
        ) : !loading && logs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">No activity in the last 6 hours.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log: any, i: number) => (
              <div key={log.id || i} className="flex items-start gap-3 animate-in fade-in slide-in-from-right-1 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", actionBg(log.action))}>
                  {actionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{log.details || "Action performed"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-muted-foreground truncate">{log.admin_name || log.admin_email || "Admin"}</p>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <p className="text-[10px] text-muted-foreground shrink-0">{log.timestamp ? relTime(log.timestamp) : "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!loading && logs.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 px-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1 px-2 rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
          >
            Prev
          </button>
          <span className="text-[10px] font-bold text-muted-foreground/60">
            {currentPage} / {Math.ceil(logs.length / itemsPerPage)}
          </span>
          <button 
            disabled={currentPage >= Math.ceil(logs.length / itemsPerPage)}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-1 px-2 rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <button onClick={onViewLogs} className="mt-4 w-full rounded-xl bg-primary/5 p-2.5 text-xs font-bold text-primary transition-all hover:bg-primary/10 border border-primary/10">View Detailed Logs</button>
    </div>
  )
}

// ── Vehicle Icon Helper ────────────────────────────────────────────────────
const getVehicleIcon = (type: string = "", capacity: number | string = 0) => {
  const t = type.toLowerCase()
  const cap = typeof capacity === 'string' ? parseInt(capacity, 10) : capacity
  
  if (t.includes("shuttle")) {
    return cap > 7 ? Bus : Car
  }
  if (t.includes("car")) return Car
  if (t.includes("van") || t.includes("mini")) return Bus
  return Bus
}


export function AdminDashboard() {
  const { profile, logoutMock, adminSession } = useAuth()
  const router = useRouter()
  const [section, setSection] = useState<ActiveSection>("overview")
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)

  // ── Editing States ──────────────────────────────────────────────────────
  const [editingDriver, setEditingDriver] = useState<any>(null)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [selectedVehicleCompliance, setSelectedVehicleCompliance] = useState<any>(null)
  const [editingRoute, setEditingRoute] = useState<any>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)

  // ── Lifecycle / Removal Modal State ─────────────────────────────────────
  const [removalTarget, setRemovalTarget] = useState<{ entity: any; type: "student" | "driver" } | null>(null)
  const [removalLoading, setRemovalLoading] = useState(false)
  const [showRemovedStudents, setShowRemovedStudents] = useState(false)
  const [showRemovedDrivers, setShowRemovedDrivers] = useState(false)

  // ── Date Filtering ──────────────────────────────────────────────────────
  const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().split("T")[0])

  // ── Notifications ───────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("transify_admin_cache_notifications")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [dashboardDateEnd, setDashboardDateEnd] = useState<string>("")
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showDriverRatings, setShowDriverRatings] = useState(false)
  const [selectedDriverForReviews, setSelectedDriverForReviews] = useState<any>(null)
  const [driverReviews, setDriverReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [liveRole, setLiveRole] = useState<string | null>(null)

  // ── Report Date-Range Filter Modal ───────────────────────────────────────
  type ReportType = "delay" | "driver" | "route" | null
  const [reportModal, setReportModal] = useState<ReportType>(null)
  const today = new Date().toISOString().split("T")[0]
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const [reportFrom, setReportFrom] = useState(defaultFrom)
  const [reportTo, setReportTo] = useState(today)
  const [reportPreset, setReportPreset] = useState<number | null>(30)

  const filterByDate = (items: any[], field = "timestamp") => {
    const from = reportFrom ? new Date(reportFrom).getTime() : 0
    const to = reportTo ? new Date(reportTo + "T23:59:59").getTime() : Infinity
    
    return items.filter((item: any) => {
      const ts = item[field]
      if (!ts) return false
      
      let t: number
      if (ts.toMillis) t = ts.toMillis()
      else if (ts.seconds) t = ts.seconds * 1000
      else t = new Date(ts).getTime() || 0
      
      return t >= from && t <= to
    })
  }

  const doExportReport = (type: ReportType) => {
    if (!type) return
    if (type === "delay") {
      const rows = filterByDate(dashboardStats.delays)
      const csv = "Time,Driver,Vehicle,Message\n" + rows.map((d: any) => {
        const ts = d.timestamp
        let dObj: Date
        if (ts && ts.toMillis) dObj = new Date(ts.toMillis())
        else if (ts && ts.seconds) dObj = new Date(ts.seconds * 1000)
        else dObj = new Date(ts || 0)
        
        const time = `"${dObj.toLocaleString().replace(/"/g, '""')}"`
        const driver = `"${(d.metadata?.driver_name || "—").replace(/"/g, '""')}"`
        const vehicle = `"${(d.metadata?.vehicle_id || "—").replace(/"/g, '""')}"`
        const msg = `"${(d.message || "—").replace(/"/g, '""')}"`
        return `${time},${driver},${vehicle},${msg}`
      }).join("\n")
      downloadCSV(csv, `delay_analytics_${reportFrom}_to_${reportTo}.csv`)
    } else if (type === "driver") {
      const rows = filterByDate(driversData, "created_at")
      const csv = "Driver,License,Rating,Status\n" + rows.map((d: any) =>
        `${d.name},${d.license_type},${d.avg_rating || 0},${d.status}`
      ).join("\n")
      downloadCSV(csv, `driver_performance_${reportFrom}_to_${reportTo}.csv`)
    } else if (type === "route") {
      const csv = "Route,Vehicle,Stops,Distance (km)\n" + routesData.map((r: any) =>
        `${r.route_name},${r.vehicle_id},${(r.stops || []).length},${r.distance_km || 0}`
      ).join("\n")
      downloadCSV(csv, `route_efficiency_${reportFrom}_to_${reportTo}.csv`)
    }
    setReportModal(null)
  }

  // ── Determine org type from admin session or profile ──
  const isCorporate = adminSession?.organization_category === "corporate" || (profile as any)?.orgCategory === "corporate"
  const memberLabel = isCorporate ? "Employees" : "Students"
  const memberIcon = isCorporate ? Briefcase : GraduationCap

  // Use admin session data if available, fallback to profile
  const userName = adminSession?.name || profile?.globalName || "Test User"
  const userEmail = adminSession?.email || profile?.email || ""
  const adminRole = liveRole || adminSession?.role || "ADMIN"
  const isSuperAdmin = adminRole === "SUPER_ADMIN"
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AD"

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }
  const handleLogout = () => { logoutMock("admin"); router.push("/category") }

  const downloadCSV = (csv: string, filename: string) => {
    if (typeof window === "undefined") return
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Live Role Listener ──────────────────────────────────────────────────
  useEffect(() => {
    const userId = adminSession?.user_id
    if (!userId || !db) return
    const unsub = onSnapshot(doc(db, "admin_users", userId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        if (data.role !== liveRole) {
          setLiveRole(data.role)
        }
      }
    })
    return () => unsub()
  }, [adminSession?.user_id, liveRole])

  // ── Member Filters ──────────────────────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState("")
  const [memberRouteFilter, setMemberRouteFilter] = useState("all")
  const [memberSectionFilter, setMemberSectionFilter] = useState("all")
  const [memberGradeFilter, setMemberGradeFilter] = useState("all")
  const [studentsData, setStudentsData] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("transify_admin_cache_students")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })

  const fetchStudents = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId || !db) return () => { }
    const q = query(
      collection(db, "students"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setStudentsData(students)
      if (typeof window !== "undefined") {
        localStorage.setItem("transify_admin_cache_students", JSON.stringify(students))
      }
    }, (err) => console.error("Firestore student listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    if (!db) return
    const unsub = fetchStudents()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchStudents])

  const filteredMembers = useMemo(() => studentsData.filter(s => {
    const isInactive = s.lifecycle_status === "INACTIVE"
    if (!showRemovedStudents && isInactive) return false
    if (showRemovedStudents && !isInactive) return false

    const name = (s.name || "").toLowerCase()
    const memberId = (s.memberId || s.student_id || s.id || "").toLowerCase()
    const route = s.route || s.route_name || ""
    const gradeString = isCorporate ? (s.dept || s.department || "") : (s.grade || s.class || "")
    const search = memberSearch.toLowerCase()
    
    let section = "None"
    if (s.section) {
      section = s.section
    } else if (gradeString.includes(" - ")) {
      const parts = gradeString.split(" - ")
      section = parts[1] ? parts[1].trim() : "None"
    }

    return (
      (!search || name.includes(search) || memberId.includes(search)) &&
      (memberRouteFilter === "all" || route.includes(memberRouteFilter)) &&
      (memberSectionFilter === "all" || section === memberSectionFilter) &&
      (memberGradeFilter === "all" || gradeString.startsWith(memberGradeFilter))
    )
  }), [studentsData, memberSearch, memberRouteFilter, memberSectionFilter, memberGradeFilter, isCorporate, showRemovedStudents])

  // ── Driver Filters ──────────────────────────────────────────────────────
  const [driverSearch, setDriverSearch] = useState("")
  const [driverStatusFilter, setDriverStatusFilter] = useState("all")
  const [driverLicenseFilter, setDriverLicenseFilter] = useState("all")
  const [driversData, setDriversData] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("transify_admin_cache_drivers")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })

  const fetchDrivers = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId || !db) return () => { }
    const q = query(
      collection(db, "drivers"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDriversData(drivers)
      if (typeof window !== "undefined") {
        localStorage.setItem("transify_admin_cache_drivers", JSON.stringify(drivers))
      }
    }, (err) => console.error("Firestore driver listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    if (!db) return
    const unsub = fetchDrivers()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchDrivers])

  const fetchDriverReviews = useCallback((driverId: string) => {
    setLoadingReviews(true)
    const q = query(
      collection(db, "ratings"),
      where("driver_id", "==", driverId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      reviews.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      setDriverReviews(reviews)
      setLoadingReviews(false)
    }, (err) => {
      console.error("Firestore reviews listener error:", err)
      setLoadingReviews(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (selectedDriverForReviews) {
      const unsub = fetchDriverReviews(selectedDriverForReviews.id)
      return () => unsub()
    } else {
      setDriverReviews([])
    }
  }, [selectedDriverForReviews, fetchDriverReviews])

  const filteredDrivers = useMemo(() => driversData.filter((d: any) => {
    const isInactive = d.lifecycle_status === "INACTIVE"
    if (!showRemovedDrivers && isInactive) return false
    if (showRemovedDrivers && !isInactive) return false

    return (d.name?.toLowerCase().includes(driverSearch.toLowerCase()) || d.phone?.includes(driverSearch)) &&
    (driverStatusFilter === "all" || d.status === driverStatusFilter) &&
    (driverLicenseFilter === "all" || d.license_type === driverLicenseFilter)
  }), [driverSearch, driverStatusFilter, driverLicenseFilter, driversData, showRemovedDrivers])

  // ── Vehicle Filters ─────────────────────────────────────────────────────
  const [vehicleSearch, setVehicleSearch] = useState("")
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all")
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all")
  const [vehicleRouteFilter, setVehicleRouteFilter] = useState("all")
  const [vehicleExpiringFilter, setVehicleExpiringFilter] = useState("all")
  const [vehiclesData, setVehiclesData] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("transify_admin_cache_vehicles")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })

  const fetchVehicles = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId || !db) return () => { }

    const q = query(
      collection(db, "vehicles"),
      where("organization_id", "==", orgId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Manual sort by created_at since combined queries might need indexes
      vehicles.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      setVehiclesData(vehicles)
      if (typeof window !== "undefined") {
        localStorage.setItem("transify_admin_cache_vehicles", JSON.stringify(vehicles))
      }
    }, (err) => {
      console.error("Firestore vehicle listener error:", err)
    })

    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    if (!db) return
    const unsub = fetchVehicles()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchVehicles])

  const filteredVehicles = useMemo(() => vehiclesData.filter((v: any) => {
    const searchMatch = (v.plate_number || v.id || "").toLowerCase().includes(vehicleSearch.toLowerCase()) || (v.driver_name || "").toLowerCase().includes(vehicleSearch.toLowerCase())
    const statusMatch = vehicleStatusFilter === "all" || (v.status || "").toLowerCase().replace(/[-_ ]/g, "-") === vehicleStatusFilter
    const typeMatch = vehicleTypeFilter === "all" || v.type === vehicleTypeFilter
    const routeMatch = vehicleRouteFilter === "all" || (v.route_name || v.route || "").includes(vehicleRouteFilter)
    
    // Compliance check
    let complianceMatch = true
    if (vehicleExpiringFilter !== "all") {
      const fields = ['rc_expiry', 'insurance_expiry', 'puc_expiry', 'fitness_expiry', 'permit_expiry']
      const now = Date.now()
      const weekInMs = 7 * 24 * 60 * 60 * 1000
      let hasExpired = false
      let hasExpiringSoon = false
      fields.forEach(f => {
        if (v[f]) {
          const t = new Date(v[f]).getTime()
          if (t <= now) hasExpired = true
          else if (t - now < weekInMs) hasExpiringSoon = true
        }
      })
      if (vehicleExpiringFilter === "expired") complianceMatch = hasExpired
      if (vehicleExpiringFilter === "expiring-soon") complianceMatch = hasExpiringSoon && !hasExpired
    }

    return searchMatch && statusMatch && typeMatch && routeMatch && complianceMatch
  }), [vehicleSearch, vehicleStatusFilter, vehicleTypeFilter, vehicleRouteFilter, vehicleExpiringFilter, vehiclesData])

  // ── Route Filters ───────────────────────────────────────────────────────
  const [routeSearch, setRouteSearch] = useState("")
  const [routesData, setRoutesData] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("transify_admin_cache_routes")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })

  const fetchRoutes = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId || !db) return () => { }
    const q = query(
      collection(db, "routes"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRoutesData(routes)
      if (typeof window !== "undefined") {
        localStorage.setItem("transify_admin_cache_routes", JSON.stringify(routes))
      }
    }, (err) => console.error("Firestore route listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    if (!db) return
    const unsub = fetchRoutes()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchRoutes])

  // ── One-time backfill: sync vehicle route fields for existing data ──────
  useEffect(() => {
    // Legacy sync backfill removed for mobile direct SDK compliance
  }, [adminSession?.organization_id])

  const filteredRoutes = useMemo(() => routesData.filter((r: any) =>
    (r.route_name || "").toLowerCase().includes(routeSearch.toLowerCase()) ||
    (r.vehicle_id || "").toLowerCase().includes(routeSearch.toLowerCase())
  ), [routeSearch, routesData])

  // ── Notifications Listener ───────────────────────────────────────────────────
  useEffect(() => {
    const orgId = adminSession?.organization_id
    if (!orgId || !db) return
    // No orderBy to avoid composite index requirement — sort in-memory instead
    const q = query(
      collection(db, "notifications"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Sort newest first in memory
      notifs.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      setNotifications(notifs)
      if (typeof window !== "undefined") {
        localStorage.setItem("transify_admin_cache_notifications", JSON.stringify(notifs))
      }
    })
    return unsubscribe
  }, [adminSession?.organization_id])

  // ── Dashboard stats from notifications (real-time) ───────────────────────
  const dashboardStats = useMemo(() => {
    const start = dashboardDate ? new Date(dashboardDate + "T00:00:00").getTime() : 0
    const end = dashboardDateEnd
      ? new Date(dashboardDateEnd + "T23:59:59").getTime()
      : dashboardDate ? new Date(dashboardDate + "T23:59:59").getTime() : Date.now()
    const inRange = (n: any) => {
      if (!n.timestamp) return false
      let t: number
      if (n.timestamp.toMillis) t = n.timestamp.toMillis()
      else if (n.timestamp.seconds) t = n.timestamp.seconds * 1000
      else t = new Date(n.timestamp).getTime() || 0
      
      return t >= start && t <= end
    }
    const ranged = notifications.filter(inRange)
    return {
      delays: ranged.filter((n: any) => n.type === "delay"),
      sos: ranged.filter((n: any) => n.type === "sos"),
      tripStarts: ranged.filter((n: any) => n.type === "trip_start"),
      tripEnds: ranged.filter((n: any) => n.type === "trip_end"),
    }
  }, [notifications, dashboardDate, dashboardDateEnd])

  // ── Notifications Logic ───────────────────────────────────────────────────
  const formatNotifDate = (ts: any) => {
    if (!ts) return "—"
    let d: Date
    if (ts.toMillis) d = new Date(ts.toMillis())
    else if (ts.seconds) d = new Date(ts.seconds * 1000)
    else d = new Date(ts)
    
    if (isNaN(d.getTime())) return "—"
    return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  }

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { is_read: true })
    } catch (err) {
      console.error("Mark as read error:", err)
    }
  }

  const handleClearAll = async () => {
    const orgId = adminSession?.organization_id
    if (!orgId || notifications.length === 0) return

    try {
      const batch = writeBatch(db)
      notifications.forEach(n => {
        if (!n.is_cleared) {
          batch.update(doc(db, "notifications", n.id), { 
            is_cleared: true,
            cleared_at: serverTimestamp() 
          })
        }
      })
      await batch.commit()
      showToast("Notifications cleared")
      setShowNotifications(false)
    } catch (err) {
      console.error("Clear all error:", err)
    }
  }

  const badgeCount = useMemo(() => 
    notifications.filter((n: any) => !n.is_cleared && !n.is_read).length
  , [notifications])

  const sortedNotifications = useMemo(() => {
    return notifications
      .filter((n: any) => !n.is_cleared)
      .sort((a: any, b: any) => {
        // Unread first, then by priority, then by timestamp
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
        const pMap: any = { critical: 3, warning: 2, info: 1 }
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority]
        const getT = (ts: any) => {
          if (!ts) return 0
          if (typeof ts === 'number') return ts
          if (ts.toMillis) return ts.toMillis()
          if (ts.seconds) return ts.seconds * 1000
          return new Date(ts).getTime() || 0
        }
        return getT(b.timestamp) - getT(a.timestamp)
      })
  }, [notifications])

  // ── Proactive Alerting Logic ───────────────────────────────────────────────
  useEffect(() => {
    if (!adminSession?.organization_id || vehiclesData.length === 0) return

    const checkAlerts = async () => {
      const now = Date.now()
      const orgId = adminSession?.organization_id
      if (!orgId) return
      
      const alertsToCreate: any[] = []

      const dayAgo = now - 24 * 60 * 60 * 1000
      const getT = (ts: any) => {
        if (!ts) return 0
        if (typeof ts === 'number') return ts
        if (ts.toMillis) return ts.toMillis()
        if (ts.seconds) return ts.seconds * 1000
        return new Date(ts).getTime() || 0
      }

      vehiclesData.forEach((v: any) => {
        const vId = v.id
        const vPlate = v.plate_number || vId

        // 1. Emergency SOS
        if (v.status === 'emergency') {
          const exists = notifications.some(n => n.vehicle_id === vId && n.type === 'sos' && getT(n.timestamp) > dayAgo)
          if (!exists) {
            alertsToCreate.push({
              organization_id: orgId,
              type: 'sos',
              priority: 'critical',
              title: 'Emergency SOS Alert',
              message: `Vehicle ${vPlate} has triggered an SOS alert!`,
              vehicle_id: vId,
              vehicle_plate: vPlate,
              timestamp: now,
              is_read: false
            })
          }
        }

        // 2. GPS Offline (> 15 mins)
        if (v.last_updated && (now - new Date(v.last_updated).getTime() > 15 * 60 * 1000)) {
          // Only alert if vehicle has a driver (implies it should be active)
          if (v.driver_id) {
            const exists = notifications.some(n => n.vehicle_id === vId && n.type === 'gps_offline' && getT(n.timestamp) > dayAgo)
            if (!exists) {
              alertsToCreate.push({
                organization_id: orgId,
                type: 'gps_offline',
                priority: 'warning',
                title: 'GPS Signal Lost',
                message: `Vehicle ${vPlate} has been offline for more than 15 minutes.`,
                vehicle_id: vId,
                vehicle_plate: vPlate,
                timestamp: now,
                is_read: false
              })
            }
          }
        }

        // 3. Missing Driver Alert
        if (!v.driver_id || !v.driver_name) {
          const exists = notifications.some(n => n.vehicle_id === vId && n.type === 'missing_driver' && getT(n.timestamp) > dayAgo)
          if (!exists) {
            alertsToCreate.push({
              organization_id: orgId,
              type: 'missing_driver',
              priority: 'warning',
              title: 'Driver Not Assigned',
              message: `Vehicle ${vPlate} does not have an active driver assigned today.`,
              vehicle_id: vId,
              vehicle_plate: vPlate,
              timestamp: now,
              is_read: false
            })
          }
        }

        // 4. Compliance Expiry
        const checkDoc = (docType: string, expiry: string, label: string) => {
          if (!expiry) return
          const t = new Date(expiry).getTime()
          const diff = t - now
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
          
          let priority: 'critical' | 'warning' | null = null
          let msg = ""
          
          if (diff <= 0) {
            priority = 'critical'
            msg = `${label} for ${vPlate} has EXPIRED on ${new Date(expiry).toLocaleDateString()}.`
          } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            priority = 'warning'
            msg = `${label} for ${vPlate} expires in ${days} days (${new Date(expiry).toLocaleDateString()}).`
          }

          if (priority) {
            const exists = notifications.some(n => n.vehicle_id === vId && n.document_type === docType && getT(n.timestamp) > dayAgo)
            if (!exists) {
              alertsToCreate.push({
                organization_id: orgId,
                type: 'compliance',
                document_type: docType,
                priority,
                title: `${label} ${priority === 'critical' ? 'Expired' : 'Expiring Soon'}`,
                message: msg,
                vehicle_id: vId,
                vehicle_plate: vPlate,
                timestamp: now,
                is_read: false
              })
            }
          }
        }

        checkDoc('rc', v.rc_expiry, 'RC')
        checkDoc('insurance', v.insurance_expiry, 'Insurance')
        checkDoc('puc', v.puc_expiry, 'PUC')
        checkDoc('fitness', v.fitness_expiry, 'Fitness Certificate')
        checkDoc('permit', v.permit_expiry, 'Permit')
      })

      // Batch create notifications to avoid multiple triggers
      if (alertsToCreate.length > 0) {
        try {
          // Take only first 5 to avoid spamming Firestore in one go (it will catch up in next run)
          const subset = alertsToCreate.slice(0, 5)
          for (const alert of subset) {
            await addDoc(collection(db, "notifications"), {
              ...alert,
              timestamp: serverTimestamp()
            })
          }
        } catch (err) {
          console.error("Proactive alert creation error:", err)
        }
      }
    }

    // Run every 2 minutes or when data changes significantly
    const timer = setTimeout(checkAlerts, 2000) 
    return () => clearTimeout(timer)
  }, [adminSession, vehiclesData, notifications])

  // Selected tile for drilldown drawer
  const [selectedTile, setSelectedTile] = useState<null | { title: string; items: any[]; type: string }>(null)

  // ── Tracking Filters ────────────────────────────────────────────────────
  const [trackStatus, setTrackStatus] = useState("all")
  const filteredTracking = useMemo(() => vehiclesData.filter((v: any) => {
    if (trackStatus === "all") return true
    const s = (v.status || "").toLowerCase().replace(/[-_ ]/g, "-")
    // Group filters
    if (trackStatus === "on-duty") return ["on-duty", "on-time", "moving", "active", "in-progress", "in-transit"].includes(s)
    if (trackStatus === "off-duty") return ["off-duty", "idle", "stationary", "offline"].includes(s)
    return s === trackStatus
  }), [trackStatus, vehiclesData])

  const navGroups: { group: string; items: { id: ActiveSection; label: string; icon: React.ElementType }[] }[] = [
    {
      group: "Main",
      items: [
        { id: "overview", label: "Overview", icon: Home },
        { id: "tracking", label: "Live Tracking", icon: Navigation },
        { id: "reports", label: "Reports", icon: BarChart3 },
      ],
    },
    {
      group: "Manage",
      items: [
        { id: "members", label: memberLabel, icon: memberIcon },
        { id: "drivers", label: "Drivers", icon: Users },
        { id: "vehicles", label: "Vehicles", icon: Bus },
        { id: "routes", label: "Routes", icon: Route },
        ...(isSuperAdmin ? [
          { id: "admins" as ActiveSection, label: "Admin Management", icon: ShieldCheck },
          { id: "settings" as ActiveSection, label: "Settings", icon: Settings }
        ] : []),
      ],
    },
  ]

  const sectionLabel = navGroups.flatMap(g => g.items).find(n => n.id === section)?.label ?? "Overview"

  if (!db) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Connecting to server...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-dvh bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-black text-foreground">Trans<span className="text-primary">ify</span></span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Admin Console</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navGroups.map(({ group, items }) => (
            <div key={group} className="mb-3">
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group}</p>
              {items.map(({ id, label, icon: Icon }) => {
                const active = section === id
                return (
                  <button key={id} onClick={() => { setSection(id); setSidebarOpen(false) }}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}>
                    <Icon className="h-4 w-4 shrink-0" />{label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 bg-muted/5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <StickyHeader 
          title={`Admin / ${sectionLabel}`} 
          showBackButton={true}
        >
          <div className="flex items-center gap-3">
            {/* Search (Desktop only) */}
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search..." 
                className="h-9 w-60 rounded-xl border border-border bg-background pl-9 text-xs focus:ring-1 focus:ring-primary outline-none transition-all" 
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted transition-colors active:scale-95"
              >
                <Bell className="h-4 w-4 text-foreground" />
                {badgeCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-background animate-in zoom-in">
                    {badgeCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</h3>
                    <button
                      className="text-[10px] font-bold text-primary hover:underline transition-all active:scale-95"
                      onClick={handleClearAll}
                    >Clear all</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {sortedNotifications.map((n: any) => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.is_read && markAsRead(n.id)}
                        className={cn("border-b border-border/50 px-4 py-3 transition-colors cursor-pointer group",
                          !n.is_read ? (
                            n.priority === 'critical' ? 'bg-destructive/5 hover:bg-destructive/10' : 
                            n.priority === 'warning' ? 'bg-warning/5 hover:bg-warning/10' : 'bg-primary/5 hover:bg-primary/10'
                          ) : 'hover:bg-muted/50 opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm border",
                            n.priority === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                            n.priority === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-primary/10 border-primary/20 text-primary'
                          )}>
                            {n.priority === 'critical' || n.type === 'sos' ? <AlertTriangle className="h-4 w-4" /> :
                             n.priority === 'warning' || n.type === 'delay' ? <Clock className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("text-sm font-bold leading-tight", !n.is_read ? 'text-foreground' : 'text-muted-foreground')}>
                                {n.vehicle_plate && <span className="text-[10px] font-black mr-1 opacity-60">[{n.vehicle_plate}]</span>}
                                {n.title || (n.priority === 'critical' ? 'Critical Alert' : n.priority === 'warning' ? 'System Warning' : 'Update')}
                              </p>
                              {!n.is_read && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", 
                                n.priority === 'critical' ? 'bg-destructive' : n.priority === 'warning' ? 'bg-warning' : 'bg-primary'
                              )} />}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{n.message}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                {formatNotifDate(n.timestamp)}
                              </p>
                              {!n.is_read && <span className="text-[9px] font-bold text-primary group-hover:underline">Mark as read</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedNotifications.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-1">
                          <Bell className="h-6 w-6 opacity-20" />
                        </div>
                        <p className="text-sm font-bold">All caught up!</p>
                        <p className="text-xs">No unread alerts for your organization</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-all active:scale-95 border border-primary/20"
              >
                <span className="text-sm font-black text-primary uppercase tracking-tighter">{initials}</span>
              </button>

              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                        {isSuperAdmin ? "Super Admin" : "Admin"}
                      </p>
                    </div>
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <button 
                        onClick={() => { setSection("settings"); setShowProfileDropdown(false) }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                      >
                        <User className="h-4 w-4" /> Admin Profile
                      </button>
                      <div className="h-px bg-border my-1 mx-2" />
                      <button 
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Toggle (Mobile) */}
            <button onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-secondary lg:hidden active:scale-95">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </StickyHeader>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          <div className={section === "overview" ? "block" : "hidden"}>
            <div className="flex flex-col gap-6">
              {/* Fleet Overview header + date range */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Fleet Overview</h1>
                  <p className="text-sm text-muted-foreground mt-1">Real-time fleet stats for the selected period.</p>
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">From</span>
                    <input type="date" value={dashboardDate} onChange={e => setDashboardDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
                    <span className="text-muted-foreground">To</span>
                    <input type="date" value={dashboardDateEnd} onChange={e => setDashboardDateEnd(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none" min={dashboardDate} />
                  </div>
                  {dashboardDateEnd && (
                    <button onClick={() => setDashboardDateEnd("")}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Clear</button>
                  )}

                </div>
              </div>



              {/* 6 Stat tiles — all clickable */}
              {(() => {
                const tripsNotStarted = vehiclesData.filter((v: any) => {
                  const started = dashboardStats.tripStarts.some((n: any) => n.metadata?.vehicle_id === v.plate_number || n.metadata?.vehicle_id === v.id)
                  return !started
                })
                const tiles = [
                  { key: "vehicles", label: "Total Vehicles", value: vehiclesData.length, icon: Bus, color: "text-primary", bg: "bg-primary/10", border: "", items: vehiclesData, type: "vehicles" },
                  { key: "starts", label: "Trips Started", value: dashboardStats.tripStarts.length, icon: Activity, color: "text-success", bg: "bg-success/10", border: "", items: dashboardStats.tripStarts, type: "trip_start" },
                  { key: "ends", label: "Trips Ended", value: dashboardStats.tripEnds.length, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", border: "", items: dashboardStats.tripEnds, type: "trip_end" },
                  { key: "not_started", label: "Not Started", value: tripsNotStarted.length, icon: CircleDashed, color: "text-muted-foreground", bg: "bg-muted", border: "", items: tripsNotStarted, type: "not_started" },
                  { key: "delays", label: "Delayed Trips", value: dashboardStats.delays.length, icon: Clock, color: "text-warning", bg: "bg-warning/10", border: dashboardStats.delays.length > 0 ? "border-warning/30 bg-warning/5" : "", items: dashboardStats.delays, type: "delay" },
                  { key: "sos", label: "SOS Alerts", value: dashboardStats.sos.length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: dashboardStats.sos.length > 0 ? "border-destructive/30 bg-destructive/5" : "", items: dashboardStats.sos, type: "sos" },
                ]
                return (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {tiles.map((tile) => {
                      const Icon = tile.icon
                      return (
                        <button key={tile.key} onClick={() => setSelectedTile({ title: tile.label, items: tile.items, type: tile.type })}
                          className={cn(
                            "rounded-2xl border border-border bg-card p-3 shadow-sm text-left transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98] cursor-pointer flex flex-col justify-between",
                            tile.border
                          )}>
                          <div className="flex items-center justify-between w-full mb-2">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tile.bg)}>
                              <Icon className={cn("h-4 w-4", tile.color)} />
                            </div>
                            <span className="text-2xl font-black text-foreground">{tile.value}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground truncate">{tile.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate opacity-80">
                              {tile.items.length > 0 && tile.type !== "vehicles" && tile.type !== "not_started"
                                ? `Last: ${new Date((tile.items as any[])[0]?.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : tile.type === "not_started" ? `${tile.value} idle`
                                  : tile.type === "vehicles" ? `${tile.value} reg`
                                    : "none today"}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              <div className="grid gap-4 lg:grid-cols-2">
                {isSuperAdmin && <RecentActivityWidget organizationId={adminSession?.organization_id} onViewLogs={() => setSection("admins")} />}
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: `Add ${memberLabel.slice(0, -1)}`, icon: memberIcon, form: "student" as ActiveForm, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Add Driver", icon: UserPlus, form: "driver" as ActiveForm, color: "text-teal", bg: "bg-teal/10" },
                    { label: "Add Vehicle", icon: Bus, form: "vehicle" as ActiveForm, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Add Route", icon: Route, form: "route" as ActiveForm, color: "text-success", bg: "bg-success/10" },
                  ].map((a) => {
                    const Icon = a.icon; return (
                      <button key={a.label} onClick={() => setActiveForm(a.form)}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-[0.97]">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", a.bg)}>
                          <Icon className={cn("h-5 w-5", a.color)} />
                        </div>
                        <span className="text-xs font-semibold text-foreground text-center">{a.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* LIVE TRACKING */}
          <div className={section === "tracking" ? "block" : "hidden"}>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-foreground">Live Tracking</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterDropdown label="Status" options={["on-duty", "off-duty", "delayed", "emergency"]} value={trackStatus} onChange={setTrackStatus} />
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    {filteredTracking.length} vehicles
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <span className="text-sm font-semibold text-foreground">Fleet Map</span>
                    <div className="flex items-center gap-3">
                      {[{ c: "bg-success", l: "On Time" }, { c: "bg-warning", l: "Delayed" }, { c: "bg-destructive", l: "Emergency" }].map(leg => (
                        <div key={leg.l} className="flex items-center gap-1.5">
                          <div className={cn("h-2 w-2 rounded-full", leg.c)} />
                          <span className="text-xs text-muted-foreground">{leg.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative h-[400px] w-full bg-muted/20">
                    <LiveMap
                      organizationId={adminSession?.organization_id}
                      vehicleMeta={Object.fromEntries(
                        vehiclesData.map((v: any) => [v.id, { type: v.type, plate_number: v.plate_number }])
                      )}
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-3 overflow-y-auto max-h-[420px] pr-1">
                  {filteredTracking.map((v) => (
                    <div key={v.id} className={cn(
                      "rounded-2xl border bg-card p-4 shadow-sm shrink-0 transition-all",
                      v.status === "emergency"
                        ? "border-destructive/60 bg-destructive/5 shadow-destructive/20 shadow-md ring-1 ring-destructive/30 animate-pulse"
                        : "border-border"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl",
                            v.status === "on-time" ? "bg-success/10" : v.status === "delayed" ? "bg-warning/10" : "bg-destructive/10"
                          )}>
                            {(() => {
                              const Icon = getVehicleIcon(v.type);
                              return <Icon className={cn("h-4 w-4",
                                v.status === "on-time" ? "text-success" : v.status === "delayed" ? "text-warning" : "text-destructive"
                              )} />;
                            })()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{v.plate_number || v.route || v.id}</p>
                            <p className="text-[10px] text-muted-foreground">{v.driver_name || "No driver assigned"}</p>
                          </div>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                      <div className="mt-1 pl-10">
                        {/* Progress Bar */}
                        {(v.status === "on-time" || v.status === "delayed" || v.status === "in-progress" || v.status === "active" || v.status === "moving") && typeof v.progress === 'number' && (
                          <div className="mb-2.5">
                            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-1">
                              <span>Trip Progress</span>
                              <span className="font-bold text-foreground">{v.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full transition-all duration-500",
                                v.status === "on-time" ? "bg-success" : v.status === "delayed" ? "bg-warning" : "bg-primary"
                              )} style={{ width: `${v.progress}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center"><Users className="inline h-3.5 w-3.5 mr-1.5 opacity-70" />{v.members || 0}</span>
                          <span className="flex items-center"><Navigation className="inline h-3.5 w-3.5 mr-1.5 opacity-70" />{v.speed ? `${Math.round(v.speed)} km/h` : "Stationary"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTracking.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Filter className="h-8 w-8 opacity-40" />
                      <p className="text-sm">No vehicles match this filter</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MEMBERS (Students / Employees) */}
          <div className={section === "members" ? "block" : "hidden"}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">{memberLabel}</h1>
                <Button onClick={() => setActiveForm("student")} className="gap-2 bg-primary text-primary-foreground rounded-xl">
                  <Plus className="h-4 w-4" /> Add {memberLabel.slice(0, -1)}
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder={`Search ${memberLabel.toLowerCase()}...`} value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
                </div>
                <FilterDropdown
                  label={isCorporate ? "Department" : "Grade"}
                  options={isCorporate 
                    ? [...new Set(studentsData.map(s => s.dept || s.department || "").filter(Boolean))]
                    : ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"]
                  }
                  value={memberGradeFilter}
                  onChange={setMemberGradeFilter}
                />
                <FilterDropdown 
                  label="Section" 
                  options={isCorporate ? [] : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")} 
                  value={memberSectionFilter} 
                  onChange={setMemberSectionFilter} 
                />
                <FilterDropdown label="Route" options={[...new Set(studentsData.map(s => s.route || s.route_name || "").filter(Boolean))]} value={memberRouteFilter} onChange={setMemberRouteFilter} />
                {(memberGradeFilter !== "all" || memberRouteFilter !== "all" || memberSectionFilter !== "all" || memberSearch) && (
                  <button onClick={() => { setMemberGradeFilter("all"); setMemberRouteFilter("all"); setMemberSectionFilter("all"); setMemberSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Show Removed</span>
                    <button 
                      onClick={() => setShowRemovedStudents(!showRemovedStudents)} 
                      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none", showRemovedStudents ? "bg-primary" : "bg-muted")}
                    >
                      <span aria-hidden="true" className={cn("pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", showRemovedStudents ? "translate-x-3.5" : "-translate-x-0.5")} />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const csv = "Name," + (isCorporate ? "Department" : "Grade") + ",Section,ID,Route,Status\n" + 
                      filteredMembers.map(s => {
                        const name = `"${(s.name || "").replace(/"/g, '""')}"`
                        const grade = `"${(isCorporate ? (s.dept || s.department || "") : (s.grade || s.class || "")).replace(/"/g, '""')}"`
                        const section = `"${(s.section || "").replace(/"/g, '""')}"`
                        const mid = `"${(s.memberId || s.student_id || s.id || "").replace(/"/g, '""')}"`
                        const route = `"${(s.route || s.route_name || "").replace(/"/g, '""')}"`
                        const status = s.lifecycle_status || "ACTIVE"
                        return `${name},${grade},${section},${mid},${route},${status}`
                      }).join("\n")
                    downloadCSV(csv, `${isCorporate ? 'employees' : 'students'}_export_${showRemovedStudents ? 'removed' : 'active'}.csv`)
                  }} className="h-9 gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">{filteredMembers.length} of {studentsData.length}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {isCorporate ? "Department" : "Grade"}
                      </th>
                      {!isCorporate && (
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Section</th>
                      )}
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">ID</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Route</th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((s, i) => (
                      <tr key={s.id || i} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{s.name || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{isCorporate ? (s.dept || s.department || "—") : (s.grade || s.class || "—")}</td>
                        {!isCorporate && (
                          <td className="px-5 py-3 text-muted-foreground">{s.section || "—"}</td>
                        )}
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{s.memberId || s.student_id || s.id || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{s.route || s.route_name || "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingStudent(s); setActiveForm("student") }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {s.lifecycle_status === "INACTIVE" ? (
                              <button onClick={async () => {
                                if (!confirm(`Restore ${s.name || 'this student'}?`)) return
                                try {
                                  await updateDoc(doc(db, "students", s.id), {
                                    lifecycle_status: "ACTIVE",
                                    updated_at: new Date().toISOString(),
                                  });
                                  if (userEmail && adminSession?.organization_id) {
                                    await clientAuditLog({
                                      action: "update",
                                      entity_type: "student",
                                      entity_id: s.id,
                                      admin_id: userEmail,
                                      admin_name: userName || "",
                                      admin_email: userEmail,
                                      organization_id: adminSession.organization_id,
                                      details: `Restored student ${s.name || s.id} to active status`,
                                    });
                                  }
                                  showToast(`${s.name || 'Student'} restored`)
                                } catch (err: any) { alert(err.message || 'Restore failed') }
                              }} className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors" title="Restore">
                                <Activity className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => setRemovalTarget({ entity: s, type: "student" })}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No {memberLabel.toLowerCase()} match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DRIVERS */}
          <div className={section === "drivers" ? "block" : "hidden"}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
                <Button onClick={() => setActiveForm("driver")} className="gap-2 bg-primary text-primary-foreground rounded-xl">
                  <Plus className="h-4 w-4" /> Add Driver
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search drivers..." value={driverSearch} onChange={(e) => setDriverSearch(e.target.value)} className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
                </div>
                <FilterDropdown label="Status" options={["on-duty", "off-duty"]} value={driverStatusFilter} onChange={setDriverStatusFilter} />
                <FilterDropdown label="License" options={["HMV", "PSV", "HTV", "LMV"]} value={driverLicenseFilter} onChange={setDriverLicenseFilter} />
                {(driverStatusFilter !== "all" || driverLicenseFilter !== "all" || driverSearch) && (
                  <button onClick={() => { setDriverStatusFilter("all"); setDriverLicenseFilter("all"); setDriverSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Show Removed</span>
                    <button 
                      onClick={() => setShowRemovedDrivers(!showRemovedDrivers)} 
                      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none", showRemovedDrivers ? "bg-primary" : "bg-muted")}
                    >
                      <span aria-hidden="true" className={cn("pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", showRemovedDrivers ? "translate-x-3.5" : "-translate-x-0.5")} />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const csv = "Name,Phone,License Number,License Type,Vehicle ID,Status\n" + 
                      filteredDrivers.map(d => {
                        const name = `"${(d.name || "").replace(/"/g, '""')}"`
                        const phone = `"${(d.phone || "").replace(/"/g, '""')}"`
                        const lnum = `"${(d.license_number || "").replace(/"/g, '""')}"`
                        const ltype = `"${(d.license_type || "").replace(/"/g, '""')}"`
                        const vid = `"${(d.vehicle_id || "Unassigned").replace(/"/g, '""')}"`
                        const status = d.lifecycle_status === "INACTIVE" ? "REMOVED" : (d.status || "idle")
                        return `${name},${phone},${lnum},${ltype},${vid},${status}`
                      }).join("\n")
                    downloadCSV(csv, `drivers_export_${showRemovedDrivers ? 'removed' : 'active'}.csv`)
                  }} className="h-9 gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <span className="ml-auto text-xs text-muted-foreground font-medium">{filteredDrivers.length} of {driversData.length}</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Driver</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">License</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Vehicle</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Status</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDrivers.map((d, i) => (
                        <tr key={i} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-xs font-bold text-primary">{d.name?.split(" ").map((n: string) => n[0]).join("")}</span>
                             </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-foreground truncate">{d.name}</span>
                                <span className="text-[10px] text-muted-foreground">ID: {d.id.slice(-6)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{d.phone || "—"}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{d.license_number}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{d.license_type}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                             <div className="flex items-center gap-2">
                               <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                               <span className="text-sm text-foreground">{d.vehicle_id || "Unassigned"}</span>
                             </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <StatusBadge status={d.lifecycle_status === "INACTIVE" ? "removed" : (d.status || "idle")} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingDriver(d); setActiveForm("driver") }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                                {d.lifecycle_status === "INACTIVE" ? (
                                  <button onClick={async () => {
                                    if (!confirm(`Restore driver "${d.name}"?`)) return
                                    try {
                                      await updateDoc(doc(db, "drivers", d.id), {
                                        lifecycle_status: "ACTIVE",
                                        leave_date: null,
                                        removal_reason: null,
                                        status: "idle",
                                        updated_at: new Date().toISOString(),
                                      });
                                      await addDoc(collection(db, "drivers", d.id, "lifecycle_history"), {
                                        status: "ACTIVE",
                                        start_date: new Date().toISOString().split("T")[0],
                                        reason: "Restored by admin",
                                        changed_by: userEmail || "",
                                        timestamp: new Date().toISOString(),
                                      });
                                      if (userEmail && adminSession?.organization_id) {
                                        await clientAuditLog({
                                          action: "update",
                                          entity_type: "driver",
                                          entity_id: d.id,
                                          admin_id: userEmail,
                                          admin_name: userName || "",
                                          admin_email: userEmail,
                                          organization_id: adminSession.organization_id,
                                          details: `Restored driver ${d.name || d.id} to active status`,
                                        });
                                      }
                                      showToast("Driver restored")
                                    } catch (err: any) { alert(err.message || "Restore failed") }
                                  }} className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors" title="Restore">
                                    <Activity className="h-4 w-4 text-success" />
                                  </button>
                                ) : (
                                  <button onClick={() => setRemovalTarget({ entity: d, type: "driver" })}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* VEHICLES */}
          <div className={section === "vehicles" ? "block" : "hidden"}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Vehicles</h1>
                <Button onClick={() => setActiveForm("vehicle")} className="gap-2 bg-primary text-primary-foreground rounded-xl">
                  <Plus className="h-4 w-4" /> Add Vehicle
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search vehicles..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
                </div>
                <FilterDropdown label="Type" options={["Bus", "Van", "Mini Bus", "Car"]} value={vehicleTypeFilter} onChange={setVehicleTypeFilter} />
                <FilterDropdown label="Status" options={["on-duty", "off-duty", "delayed", "emergency"]} value={vehicleStatusFilter} onChange={setVehicleStatusFilter} />
                <FilterDropdown label="Route" options={routesData.map(r => r.route_name)} value={vehicleRouteFilter} onChange={setVehicleRouteFilter} />
                <FilterDropdown label="Compliance" options={["expiring-soon", "expired"]} value={vehicleExpiringFilter} onChange={setVehicleExpiringFilter} />
                {(vehicleStatusFilter !== "all" || vehicleTypeFilter !== "all" || vehicleRouteFilter !== "all" || vehicleExpiringFilter !== "all" || vehicleSearch) && (
                  <button onClick={() => { setVehicleStatusFilter("all"); setVehicleTypeFilter("all"); setVehicleRouteFilter("all"); setVehicleExpiringFilter("all"); setVehicleSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground font-medium">{filteredVehicles.length} vehicles found</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vehicle & Model</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignment</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operational Status</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Compliance</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredVehicles.map((v, i) => {
                        // Compliance Logic
                        const complianceFields = [
                          { l: 'RC', v: v.rc_expiry },
                          { l: 'Ins.', v: v.insurance_expiry },
                          { l: 'PUC', v: v.puc_expiry },
                          { l: 'Fitness', v: v.fitness_expiry },
                          { l: 'Permit', v: v.permit_expiry }
                        ]
                        const now = Date.now()
                        const weekInMs = 7 * 24 * 60 * 60 * 1000
                        const issues = complianceFields.map(f => {
                          if (!f.v) return { ...f, status: 'missing', priority: 0, days: null }
                          const t = new Date(f.v).getTime()
                          const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24))
                          if (t <= now) return { ...f, status: 'expired', priority: 3, days }
                          if (t - now < weekInMs) return { ...f, status: 'warning', priority: 2, days }
                          return { ...f, status: 'ok', priority: 1, days }
                        })
                        
                        const criticalIssues = issues.filter(i => i.status === 'expired')
                        const warningIssues = issues.filter(i => i.status === 'warning')
                        
                        const sortedAlerts = [...criticalIssues, ...warningIssues].sort((a,b) => b.priority - a.priority || (a.days || 0) - (b.days || 0))
                        
                        const getAlertText = (iss: any) => {
                          if (iss.status === 'expired') return `${iss.l} expired`
                          if (iss.days === 0) return `${iss.l} expires today`
                          if (iss.days === 1) return `${iss.l} expires tomorrow`
                          return `${iss.l} expires in ${iss.days} days`
                        }
                        
                        const hasCritical = criticalIssues.length > 0
                        const hasWarning = warningIssues.length > 0

                        return (
                        <tr key={v.id || i} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all",
                                v.status === "emergency" ? "bg-destructive text-white animate-pulse" :
                                ["on-duty", "active", "moving"].includes(v.status) ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                              )}>
                                {(() => {
                                  const Icon = getVehicleIcon(v.type, v.capacity)
                                  return <Icon className="h-5 w-5" />
                                })()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={cn("text-sm font-black font-mono tracking-tight", v.status === "emergency" ? "text-destructive" : "text-foreground")}>{v.plate_number || v.id}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 rounded uppercase">{v.type || 'Vehicle'}</span>
                                  {v.brand_model && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{v.brand_model}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                  <User className="h-2.5 w-2.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{v.driver_name || "Unassigned"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
                                  <Route className="h-2.5 w-2.5 text-warning" />
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[120px] font-medium">{v.route_name || v.route || "No Route"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                              <div className="flex items-center justify-between gap-3">
                                <StatusBadge status={v.status} />
                                {v.speed > 0 && <span className="text-[10px] font-black text-primary animate-pulse">{Math.round(v.speed)} km/h</span>}
                              </div>
                              {v.current_location_name && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium truncate">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {v.current_location_name}
                                </div>
                              )}
                              <div className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                                Last updated: {v.last_updated ? new Date(v.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1 flex-wrap max-w-[120px]">
                                {issues.map((iss, idx) => (
                                  <div key={idx} title={`${iss.l}: ${iss.v || 'Missing'}`} 
                                    className={cn("h-1.5 w-3 rounded-full", 
                                      iss.status === 'ok' ? "bg-success/40" : 
                                      iss.status === 'warning' ? "bg-warning animate-pulse" : 
                                      iss.status === 'expired' ? "bg-destructive" : "bg-muted"
                                    )} 
                                  />
                                ))}
                              </div>
                              <div onClick={() => setSelectedVehicleCompliance(v)} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                                {sortedAlerts.length > 0 ? (
                                  <div className={cn("flex flex-col gap-0.5 py-1 px-2 rounded-lg shadow-sm border", 
                                    hasCritical ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-warning/10 border-warning/20 text-warning"
                                  )}>
                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter">
                                      {hasCritical ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                      {hasCritical ? "Critical Alert" : "Expiring Soon"}
                                    </div>
                                    <div className="text-[10px] font-bold leading-tight line-clamp-2 max-w-[140px]">
                                      {sortedAlerts.slice(0, 2).map(getAlertText).join(", ")}
                                      {sortedAlerts.length > 2 && ` +${sortedAlerts.length - 2} more`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 py-1 px-2 rounded-lg bg-success/10 border border-success/20 text-success text-[10px] font-black uppercase tracking-tighter shadow-sm w-fit">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> COMPLIANT
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingVehicle(v)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-all active:scale-90" title="Edit">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button onClick={async () => {
                                if (!confirm(`Delete vehicle "${v.plate_number}"?`)) return
                                  deleteDoc(doc(db, "vehicles", v.id)).then(() => {
                                    if (userEmail && adminSession?.organization_id) {
                                      clientAuditLog({
                                        action: "delete",
                                        entity_type: "vehicle",
                                        entity_id: v.id,
                                        admin_id: userEmail,
                                        admin_email: userEmail,
                                        organization_id: adminSession.organization_id,
                                        details: `Deleted vehicle ${v.plate_number || v.id}`,
                                      });
                                    }
                                    showToast("Vehicle deleted")
                                  }).catch(e => alert("Delete failed"))
                              }} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-destructive/10 group transition-all active:scale-90" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive opacity-70 group-hover:opacity-100" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        )})}
                      {filteredVehicles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-1">
                                <Bus className="h-6 w-6 opacity-20" />
                              </div>
                              <p className="text-sm font-bold">No vehicles found</p>
                              <p className="text-xs">Try adjusting your search or filters</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ROUTES */}
          <div className={section === "routes" ? "block" : "hidden"}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Routes</h1>
                <Button onClick={() => setActiveForm("route")} className="gap-2 bg-primary text-primary-foreground rounded-xl">
                  <Plus className="h-4 w-4" /> Add Route
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search routes..." value={routeSearch} onChange={(e) => setRouteSearch(e.target.value)} className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
                </div>
                {routeSearch && (
                  <button onClick={() => setRouteSearch("")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{filteredRoutes.length} routes</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Route Name</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stops</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Distance</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRoutes.map((v, i) => (
                        <tr key={i} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <Route className="h-5 w-5 text-primary" />
                              </div>
                              <span className="text-sm font-bold text-foreground">{v.route_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{v.vehicle_id || "Unassigned"}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex -space-x-2">
                                {(v.stops || []).slice(0, 3).map((_: any, idx: number) => (
                                  <div key={idx} className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    {idx + 1}
                                  </div>
                                ))}
                                {(v.stops || []).length > 3 && (
                                  <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    +{(v.stops || []).length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{(v.stops || []).length} stops</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {v.distance_km || "0"} km
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingRoute(v)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button onClick={() => {
                                   if (!confirm(`Delete route "${v.route_name}"?`)) return
                                  deleteDoc(doc(db, "routes", v.id)).then(() => {
                                    if (userEmail && adminSession?.organization_id) {
                                      clientAuditLog({
                                        action: "delete",
                                        entity_type: "route",
                                        entity_id: v.id,
                                        admin_id: userEmail,
                                        admin_email: userEmail,
                                        organization_id: adminSession.organization_id,
                                        details: `Deleted route ${v.route_name || v.id}`,
                                      });
                                    }
                                    showToast("Route deleted")
                                  }).catch(e => alert("Delete failed"))
                              }} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredRoutes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-muted-foreground">
                            <p className="text-sm">No routes match your search.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* REPORTS */}
          <div className={section === "reports" ? "block" : "hidden"}>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      const now = new Date();
                      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
                      
                      // Filter notifications for last 7 days
                      const last7DaysNotifs = notifications.filter(n => {
                        let t: number;
                        if (n.timestamp?.toMillis) t = n.timestamp.toMillis();
                        else if (n.timestamp?.seconds) t = n.timestamp.seconds * 1000;
                        else t = new Date(n.timestamp || 0).getTime();
                        return t >= sevenDaysAgo;
                      });

                      const delays = last7DaysNotifs.filter(n => n.type === "delay");
                      const sos = last7DaysNotifs.filter(n => n.type === "sos");
                      const starts = last7DaysNotifs.filter(n => n.type === "trip_start");
                      const ends = last7DaysNotifs.filter(n => n.type === "trip_end");

                      const downloadFile = (content: string, filename: string) => {
                        const blob = new Blob([content], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.setAttribute('hidden', '');
                        a.setAttribute('href', url);
                        a.setAttribute('download', filename);
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      };

                      // 1. Delays Report
                      const delaysCsv = "DELAYS & ALERTS (Last 7 Days)\nDate,Type,Details,Priority\n" + 
                        delays.map((l: any) => `${new Date(l.timestamp?.toMillis ? l.timestamp.toMillis() : (l.timestamp?.seconds ? l.timestamp.seconds * 1000 : l.timestamp)).toLocaleString()},${l.type},"${l.message}",${l.priority}`).join("\n");
                      downloadFile(delaysCsv, `delays_report_${now.toISOString().split('T')[0]}.csv`);

                      // 2. SOS Report
                      const sosCsv = "EMERGENCY SOS (Last 7 Days)\nDate,Vehicle,Driver,Details\n" + 
                        sos.map((l: any) => `${new Date(l.timestamp?.toMillis ? l.timestamp.toMillis() : (l.timestamp?.seconds ? l.timestamp.seconds * 1000 : l.timestamp)).toLocaleString()},${l.vehicle_plate},${l.metadata?.driver_name || '—'},"${l.message}"`).join("\n");
                      setTimeout(() => downloadFile(sosCsv, `sos_report_${now.toISOString().split('T')[0]}.csv`), 200);

                      // 3. Trip Activity Report
                      const tripStatsCsv = "TRIP ACTIVITY (Last 7 Days)\nDate,Event,Vehicle,Route\n" + 
                        [...starts, ...ends]
                          .sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                          .map((l: any) => `${new Date(l.timestamp?.toMillis ? l.timestamp.toMillis() : (l.timestamp?.seconds ? l.timestamp.seconds * 1000 : l.timestamp)).toLocaleString()},${l.type === 'trip_start' ? 'STARTED' : 'ENDED'},${l.metadata?.vehicle_id || l.vehicle_plate || '—'},"${l.metadata?.route_name || l.message || '—'}"`).join("\n");
                      setTimeout(() => downloadFile(tripStatsCsv, `trip_activity_${now.toISOString().split('T')[0]}.csv`), 400);

                      showToast("7-day reports generated");
                    }}
                  >
                    <Download className="h-4 w-4" /> Export All
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                {(() => {
                  const totalVehicles = vehiclesData.length || 1;
                  // Count vehicles that are currently active/on-duty as "on-time" proxies,
                  // since vehicles don't separate on-time from delayed unless a trip is in progress.
                  const ACTIVE_STATUSES = ["on-time", "on_duty", "on-duty", "active", "in_transit", "in-transit", "moving"]
                  const onTimeVehicles = vehiclesData.filter((v: any) => ACTIVE_STATUSES.includes((v.status || "").toLowerCase())).length;
                  const onTimeRate = Math.round((onTimeVehicles / totalVehicles) * 100);
                  
                  // Avg rating: try multiple field names in case of different storage schemas
                  const driversWithRatings = driversData.filter((d: any) => {
                    const r = d.avg_rating ?? d.rating ?? (d.rating_count > 0 ? (d.total_rating / d.rating_count) : undefined)
                    return r !== undefined && r > 0
                  });
                  const avgScore = driversWithRatings.length > 0 
                    ? (driversWithRatings.reduce((acc: number, d: any) => {
                        const r = d.avg_rating ?? d.rating ?? (d.rating_count > 0 ? d.total_rating / d.rating_count : 0)
                        return acc + r
                      }, 0) / driversWithRatings.length).toFixed(1)
                    : "N/A";

                  return [
                    { v: `${onTimeRate}%`, l: "On-Time Rate", sub: `Based on ${onTimeVehicles}/${vehiclesData.length} vehicles`, color: "text-success" },
                    { 
                      v: avgScore, 
                      l: "Avg Driver Score", 
                      sub: "Click to view ratings", 
                      color: "text-warning", 
                      clickable: true,
                      onClick: () => setShowDriverRatings(true)
                    },
                    { v: dashboardStats.tripStarts.length.toString(), l: "Trips Today", sub: `Showing for ${dashboardDate}`, color: "text-primary" },
                  ].map((s, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "rounded-2xl border border-border bg-card p-5 shadow-sm text-center transition-all",
                        s.clickable && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                      )}
                      onClick={s.onClick}
                    >
                      <p className={cn("text-4xl font-black", s.color)}>{s.v}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{s.l}</p>
                      <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* ── DATE RANGE FILTER TILES ── */}
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { key: "delay" as const, icon: Clock, label: "Delay Analytics", desc: "Patterns and root causes", color: "text-warning", bg: "bg-warning/10" },
                  { key: "driver" as const, icon: TrendingUp, label: "Driver Performance", desc: "Safety and punctuality scores", color: "text-primary", bg: "bg-primary/10" },
                  { key: "route" as const, icon: Route, label: "Route Efficiency", desc: "Time & distance optimization", color: "text-success", bg: "bg-success/10" },
                ].map((r) => {
                  const Icon = r.icon; return (
                    <button
                      key={r.key}
                      onClick={() => { setReportFrom(defaultFrom); setReportTo(today); setReportModal(r.key) }}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98] text-left"
                    >
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", r.bg)}>
                        <Icon className={cn("h-6 w-6", r.color)} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  )
                })}
              </div>

              {/* ── DATE RANGE MODAL ── */}
              {reportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {reportModal === "delay" ? "Delay Analytics" : reportModal === "driver" ? "Driver Performance" : "Route Efficiency"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Select a date range to export</p>
                      </div>
                      <button onClick={() => setReportModal(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</label>
                        <input
                          type="date"
                          value={reportFrom}
                          max={reportTo || today}
                          onChange={e => { setReportFrom(e.target.value); setReportPreset(null) }}
                          className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</label>
                        <input
                          type="date"
                          value={reportTo}
                          min={reportFrom}
                          max={today}
                          onChange={e => { setReportTo(e.target.value); setReportPreset(null) }}
                          className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Last 7 days", days: 7 },
                        { label: "Last 30 days", days: 30 },
                        { label: "Last 90 days", days: 90 },
                      ].map(({ label, days }) => (
                        <button
                          key={label}
                          onClick={() => {
                            const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                            setReportFrom(from)
                            setReportTo(today)
                            setReportPreset(days)
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                            reportPreset === days
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setReportModal(null)} className="flex-1 rounded-xl h-11">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => doExportReport(reportModal)}
                        disabled={!reportFrom || !reportTo}
                        className="flex-1 rounded-xl h-11 gap-2 bg-primary"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings etc... */}

          {/* SETTINGS */}
          <div className={section === "settings" ? "block" : "hidden"}>
            <div className="flex flex-col gap-6 max-w-2xl">
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              {[
                { label: "Organization Name", value: adminSession?.organization_name || "Delhi Public School", type: "text" },
                { label: "Admin Email", value: adminSession?.email || "admin@dps.edu.in", type: "email" },
                { label: "Timezone", value: "Asia/Kolkata (IST)", type: "text" },
              ].map((field, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">{field.label}</label>
                  <Input defaultValue={field.value} type={field.type} className="h-11 rounded-xl border-border bg-card" />
                </div>
              ))}
              <div className="flex gap-3">
                <Button className="bg-primary text-primary-foreground rounded-xl">Save Changes</Button>
                <Button variant="outline" className="rounded-xl">Cancel</Button>
              </div>
              <div className="pt-4 border-t border-border">
                <Button onClick={handleLogout} variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl">
                  <LogOut className="h-4 w-4" />Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* ADMIN MANAGEMENT (Super Admin only) */}
          <div className={section === "admins" ? "block" : "hidden"}>
            {adminSession && (
              <AdminManagement adminSession={adminSession} />
            )}
          </div>

        </main>
      </div>

      {/* Forms */}
      {(activeForm === "student" || editingStudent) && <AddStudentForm initialData={editingStudent} isCorporate={isCorporate} onClose={() => { setActiveForm(null); setEditingStudent(null) }} onSave={() => { showToast(editingStudent ? `${memberLabel.slice(0, -1)} updated` : `${memberLabel.slice(0, -1)} added successfully`); fetchStudents() }} />}
      {(activeForm === "driver" || editingDriver) && (
        <AddDriverForm
          initialData={editingDriver}
          onClose={() => { setActiveForm(null); setEditingDriver(null) }}
          onSave={() => { showToast(editingDriver ? "Driver updated successfully" : "Driver onboarded successfully"); fetchDrivers() }}
        />
      )}
      {(activeForm === "vehicle" || editingVehicle) && (
        <AddVehicleForm
          initialData={editingVehicle}
          onClose={() => { setActiveForm(null); setEditingVehicle(null) }}
          onSave={() => { showToast(editingVehicle ? "Vehicle updated successfully" : "Vehicle registered successfully"); fetchVehicles() }}
        />
      )}
      {(activeForm === "route" || editingRoute) && (
        <AddRouteForm
          initialData={editingRoute}
          onClose={() => { setActiveForm(null); setEditingRoute(null) }}
          onSave={() => { showToast(editingRoute ? "Route updated successfully" : "Route created successfully"); fetchRoutes() }}
        />
      )}

      {/* Compliance Breakdown Modal */}
      {selectedVehicleCompliance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setSelectedVehicleCompliance(null)}>
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-200 rounded-3xl bg-card shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Compliance Breakdown</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{selectedVehicleCompliance.plate_number || selectedVehicleCompliance.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicleCompliance(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {[
                { label: 'RC Expiry', value: selectedVehicleCompliance.rc_expiry },
                { label: 'Insurance Expiry', value: selectedVehicleCompliance.insurance_expiry },
                { label: 'PUC Expiry', value: selectedVehicleCompliance.puc_expiry },
                { label: 'Fitness Expiry', value: selectedVehicleCompliance.fitness_expiry },
                { label: 'Permit Expiry', value: selectedVehicleCompliance.permit_expiry }
              ].map((item, idx) => {
                const status = !item.value ? 'missing' : 
                               new Date(item.value).getTime() <= Date.now() ? 'expired' : 
                               new Date(item.value).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 ? 'warning' : 'ok';
                const daysLeft = item.value ? Math.ceil((new Date(item.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                return (
                  <div key={idx} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                      <span className="text-sm font-bold text-foreground">{item.value ? new Date(item.value).toLocaleDateString("en-IN", { dateStyle: "long" }) : "Not uploaded"}</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm",
                      status === 'ok' ? "bg-success/10 border-success/20 text-success" :
                      status === 'warning' ? "bg-warning/10 border-warning/20 text-warning animate-pulse" :
                      status === 'expired' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-muted-foreground"
                    )}>
                      {status === 'expired' && "Expired"}
                      {status === 'warning' && `Expiring in ${daysLeft}d`}
                      {status === 'ok' && "Compliant"}
                      {status === 'missing' && "Missing"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 bg-muted/10 border-t border-border">
              <Button onClick={() => setSelectedVehicleCompliance(null)} className="w-full h-11 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 rounded-xl bg-success px-5 py-3 shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-success-foreground" />
            <span className="text-sm font-semibold text-success-foreground">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Tile Drilldown Modal */}
      {selectedTile && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
          onClick={e => e.target === e.currentTarget && setSelectedTile(null)}>
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-t-3xl sm:rounded-2xl bg-card shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedTile.title}</h2>
                <p className="text-xs text-muted-foreground">{selectedTile.items.length} record{selectedTile.items.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setSelectedTile(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2">
              {selectedTile.items.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No records for this period</p>
                </div>
              )}
              {selectedTile.items.map((item: any, i: number) => {
                // Vehicle tile
                if (selectedTile.type === "vehicles" || selectedTile.type === "not_started") return (
                  <div key={item.id || i} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          item.status === "on-time" ? "bg-success/10" : item.status === "delayed" ? "bg-warning/10" : item.status === "emergency" ? "bg-destructive/10" : "bg-muted/50"
                        )}>
                          {(() => { const Icon = getVehicleIcon(item.type); return <Icon className={cn("h-5 w-5", item.status === "on-time" ? "text-success" : item.status === "delayed" ? "text-warning" : item.status === "emergency" ? "text-destructive" : "text-muted-foreground")} /> })()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", item.status === "on-time" || item.status === "in-progress" || item.status === "active" || item.status === "moving" ? "bg-success" : item.status === "delayed" ? "bg-warning" : item.status === "emergency" ? "bg-destructive" : "bg-muted-foreground")} />
                            <p className="text-sm font-bold text-foreground">{item.plate_number || item.id}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{item.type || "vehicle"} · {item.driver_name || item.driver || "No driver"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
                // Notification-based tiles (delay, sos, trip_start, trip_end)
                return (
                  <div key={item.id || i} className={cn("rounded-xl border border-border px-4 py-3",
                    item.type === 'sos' ? 'bg-destructive/5 border-destructive/20' :
                      item.type === 'delay' ? 'bg-warning/5 border-warning/20' : 'bg-muted/30'
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-foreground leading-tight">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    {item.metadata && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {item.metadata.driver_name && <span className="text-[10px] font-medium text-foreground">👤 {item.metadata.driver_name}</span>}
                        {item.metadata.driver_phone && <span className="text-[10px] text-muted-foreground">📞 {item.metadata.driver_phone}</span>}
                        {item.metadata.vehicle_id && <span className="text-[10px] font-medium text-foreground">🚌 {item.metadata.vehicle_id}</span>}
                        {item.metadata.reason && <span className="text-[10px] font-semibold text-warning">⚠️ {item.metadata.reason}</span>}
                        {item.metadata.route_name && <span className="text-[10px] text-muted-foreground">🛣️ {item.metadata.route_name}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Driver Ratings Detail Modal */}
      {showDriverRatings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowDriverRatings(false)}>
          <div className="w-full max-w-2xl rounded-3xl bg-card shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border px-8 py-6">
              {selectedDriverForReviews ? (
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedDriverForReviews(null)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedDriverForReviews.name}</h2>
                    <p className="text-sm text-muted-foreground">Detailed reviews and comments</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-foreground">Driver Performance Ratings</h2>
                  <p className="text-sm text-muted-foreground">Detailed scores for all registered drivers</p>
                </div>
              )}
              <button onClick={() => { setShowDriverRatings(false); setSelectedDriverForReviews(null) }}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedDriverForReviews ? (
                <div className="flex flex-col gap-4">
                  {loadingReviews ? (
                    <div className="flex justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : driverReviews.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                      <Star className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No reviews yet for this driver</p>
                    </div>
                  ) : (
                    driverReviews.map((r, i) => (
                      <div key={r.id || i} className="rounded-2xl border border-border bg-muted/20 p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-warning">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={cn("h-4 w-4", star <= (r.rating || 0) ? "fill-current" : "opacity-20")} />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {r.timestamp ? new Date(r.timestamp?.seconds * 1000 || r.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                          </span>
                        </div>
                        {r.comment && <p className="text-sm text-foreground italic">"{r.comment}"</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {(r.student_name || "P")[0]}
                          </div>
                          <p className="text-[11px] font-semibold text-muted-foreground">Parent of {r.student_name || "Student"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {driversData.map((d) => (
                    <button 
                      key={d.id} 
                      onClick={() => setSelectedDriverForReviews(d)}
                      className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4 hover:bg-muted/40 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.phone || "No phone"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="text-lg font-bold text-foreground">{(d.avg_rating || 0).toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            {(d.total_ratings || 0)} Reviews
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border p-6 bg-muted/10 rounded-b-3xl">
              <Button onClick={() => { setShowDriverRatings(false); setSelectedDriverForReviews(null) }} className="w-full h-12 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* LIFECYCLE REMOVAL MODAL */}
      {removalTarget && (
        <RemovalReasonModal
          entityType={removalTarget.type}
          entityName={removalTarget.entity.name}
          isLoading={removalLoading}
          onCancel={() => setRemovalTarget(null)}
          onConfirm={async (reason) => {
            setRemovalLoading(true)
            try {
              if (removalTarget.type === "student") {
                await updateDoc(doc(db, "students", removalTarget.entity.id), {
                  lifecycle_status: "INACTIVE",
                  removal_reason: reason,
                  updated_at: new Date().toISOString(),
                });
              } else {
                await updateDoc(doc(db, "drivers", removalTarget.entity.id), {
                  lifecycle_status: "INACTIVE",
                  removal_reason: reason,
                  status: "off-duty",
                  updated_at: new Date().toISOString(),
                });
              }

              if (userEmail && adminSession?.organization_id) {
                await clientAuditLog({
                  action: "delete",
                  entity_type: removalTarget.type,
                  entity_id: removalTarget.entity.id,
                  admin_id: userEmail,
                  admin_name: userName || "",
                  admin_email: userEmail,
                  organization_id: adminSession.organization_id,
                  details: `Removed ${removalTarget.type} ${removalTarget.entity.name} (Reason: ${reason})`,
                });
              }
              
              showToast(`${removalTarget.type === "student" ? "Student" : "Driver"} removed (status: INACTIVE)`)
            } catch (err: any) {
              alert(err.message || 'Removal failed')
            } finally {
              setRemovalLoading(false)
              setRemovalTarget(null)
            }
          }}
        />
      )}

      </div>
    </ErrorBoundary>
  )
}
