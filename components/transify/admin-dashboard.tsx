"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Bus, Users, AlertTriangle, Clock, Activity, Plus, ChevronRight,
  Search, Download, Route, UserPlus, BarChart3, TrendingUp, Star,
  Navigation, GraduationCap, Bell, Settings, LogOut, Menu,
  Home, Briefcase, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, X, ChevronDown, ShieldCheck, Pencil, Trash2, Car, Truck, Calendar, CircleDashed, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AddStudentForm } from "./admin-form-add-student"
import { AddDriverForm } from "./admin-form-add-driver"
import { AddVehicleForm } from "./admin-form-add-vehicle"
import { AddRouteForm } from "./admin-form-add-route"
import { AdminManagement } from "./admin-management"
import { LiveMap } from "./live-map"
import { useRouter } from "next/navigation"

type ActiveSection = "overview" | "tracking" | "members" | "drivers" | "vehicles" | "routes" | "reports" | "settings" | "admins"
type ActiveForm = "student" | "driver" | "vehicle" | "route" | null

// ── Data ─────────────────────────────────────────────────────────────────────

// vehiclesData, driversData, studentsData, and routesData are now fetched from Firestore 
// see useEffects inside AdminDashboard component

// driversData is now fetched from Firestore — see useEffect inside AdminDashboard

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const isSuccess = ["on-time", "on-duty", "at-school", "active", "online"].includes(s)
  const isWarning = ["delayed", "idle"].includes(s)
  const isDanger = ["emergency", "sos", "offline"].includes(s)
  const isPrimary = ["on-bus", "in-progress", "moving"].includes(s)
  const isMuted = ["off-duty", "completed", "stationary"].includes(s)

  // Capitalize each word
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const fetchLogs = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      let url = `/api/admin/audit-logs?organization_id=${organizationId}&limit=200`
      if (startDate) url += `&start_date=${startDate}`
      if (endDate) url += `&end_date=${endDate}`
      const res = await fetch(url)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { }
    finally { setLoading(false) }
  }, [organizationId, startDate, endDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = useMemo(() => logs.filter((l: any) =>
    !search ||
    (l.admin_email || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.details || "").toLowerCase().includes(search.toLowerCase())
  ), [logs, search])

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
        <button onClick={fetchLogs}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
          Refresh
        </button>
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
        {!loading && filtered.length === 0 && (
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
        <div className="absolute top-full left-0 z-20 mt-1 min-w-32 rounded-xl border border-border bg-card shadow-lg p-1">
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

// ── Main Component ────────────────────────────────────────────────────────────




// ── Vehicle Icon Helper ────────────────────────────────────────────────────
const getVehicleIcon = (type: string = "") => {
  const t = type.toLowerCase()
  if (t.includes("car")) return Car
  if (t.includes("van")) return Truck
  if (t.includes("mini") || t.includes("shuttle")) return Truck
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
  const [editingRoute, setEditingRoute] = useState<any>(null)
  const [editingStudent, setEditingStudent] = useState<any>(null)

  // ── Date Filtering ──────────────────────────────────────────────────────
  const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().split("T")[0])

  // ── Notifications ───────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [dashboardDateEnd, setDashboardDateEnd] = useState<string>("")
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showDriverRatings, setShowDriverRatings] = useState(false)

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
      const t = item[field] ? new Date(item[field]).getTime() : 0
      return t >= from && t <= to
    })
  }

  const doExportReport = (type: ReportType) => {
    if (!type) return
    if (type === "delay") {
      const rows = filterByDate(dashboardStats.delays)
      const csv = "Time,Driver,Vehicle,Message\n" + rows.map((d: any) => {
        const time = `"${new Date(d.timestamp).toLocaleString().replace(/"/g, '""')}"`
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
  const adminRole = adminSession?.role || "ADMIN"
  const isSuperAdmin = adminRole === "SUPER_ADMIN"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }
  const handleLogout = () => { logoutMock(); router.push("/category") }

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

  // ── Member Filters ──────────────────────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState("")
  const [memberRouteFilter, setMemberRouteFilter] = useState("all")
  const [memberStatusFilter, setMemberStatusFilter] = useState("all")
  const [memberGradeFilter, setMemberGradeFilter] = useState("all")
  const [studentsData, setStudentsData] = useState<any[]>([])

  const fetchStudents = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return () => { }
    const q = query(
      collection(db, "students"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setStudentsData(students)
    }, (err) => console.error("Firestore student listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    const unsub = fetchStudents()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchStudents])

  const filteredMembers = useMemo(() => studentsData.filter(s => {
    const name = (s.name || "").toLowerCase()
    const memberId = (s.memberId || s.student_id || s.id || "").toLowerCase()
    const route = s.route || s.route_name || ""
    const status = s.status || "active"
    const grade = isCorporate ? (s.dept || s.department || "") : (s.grade || s.class || "")
    const search = memberSearch.toLowerCase()
    return (
      (!search || name.includes(search) || memberId.includes(search)) &&
      (memberRouteFilter === "all" || route.includes(memberRouteFilter)) &&
      (memberStatusFilter === "all" || status === memberStatusFilter) &&
      (memberGradeFilter === "all" || grade === memberGradeFilter)
    )
  }), [studentsData, memberSearch, memberRouteFilter, memberStatusFilter, memberGradeFilter, isCorporate])

  // ── Driver Filters ──────────────────────────────────────────────────────
  const [driverSearch, setDriverSearch] = useState("")
  const [driverStatusFilter, setDriverStatusFilter] = useState("all")
  const [driverLicenseFilter, setDriverLicenseFilter] = useState("all")
  const [driversData, setDriversData] = useState<any[]>([])

  const fetchDrivers = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return () => { }
    const q = query(
      collection(db, "drivers"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDriversData(drivers)
    }, (err) => console.error("Firestore driver listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    const unsub = fetchDrivers()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchDrivers])

  const filteredDrivers = useMemo(() => driversData.filter((d: any) =>
    (d.name?.toLowerCase().includes(driverSearch.toLowerCase()) || d.phone?.includes(driverSearch)) &&
    (driverStatusFilter === "all" || d.status === driverStatusFilter) &&
    (driverLicenseFilter === "all" || d.license_type === driverLicenseFilter)
  ), [driverSearch, driverStatusFilter, driverLicenseFilter, driversData])

  // ── Vehicle Filters ─────────────────────────────────────────────────────
  const [vehicleSearch, setVehicleSearch] = useState("")
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all")
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all")
  const [vehiclesData, setVehiclesData] = useState<any[]>([])

  const fetchVehicles = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return () => { }

    const q = query(
      collection(db, "vehicles"),
      where("organization_id", "==", orgId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      // Manual sort by created_at since combined queries might need indexes
      vehicles.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      setVehiclesData(vehicles)
    }, (err) => {
      console.error("Firestore vehicle listener error:", err)
    })

    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    const unsub = fetchVehicles()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchVehicles])

  const filteredVehicles = useMemo(() => vehiclesData.filter((v: any) =>
    ((v.plate_number || v.id || "").toLowerCase().includes(vehicleSearch.toLowerCase()) || (v.driver_name || "").toLowerCase().includes(vehicleSearch.toLowerCase())) &&
    (vehicleStatusFilter === "all" || v.status === vehicleStatusFilter) &&
    (vehicleTypeFilter === "all" || v.type === vehicleTypeFilter)
  ), [vehicleSearch, vehicleStatusFilter, vehicleTypeFilter, vehiclesData])

  // ── Route Filters ───────────────────────────────────────────────────────
  const [routeSearch, setRouteSearch] = useState("")
  const [routesData, setRoutesData] = useState<any[]>([])

  const fetchRoutes = useCallback(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return () => { }
    const q = query(
      collection(db, "routes"),
      where("organization_id", "==", orgId)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRoutesData(routes)
    }, (err) => console.error("Firestore route listener error:", err))
    return unsubscribe
  }, [adminSession?.organization_id])

  useEffect(() => {
    const unsub = fetchRoutes()
    return () => { if (typeof unsub === 'function') unsub() }
  }, [fetchRoutes])

  // ── One-time backfill: sync vehicle route fields for existing data ──────
  useEffect(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return
    fetch("/api/routes/sync-vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: orgId }),
    }).then(r => r.json()).then(d => {
      if (d.updated > 0) console.log(`✅ Route-vehicle sync: ${d.message}`)
    }).catch(() => { })
  }, [adminSession?.organization_id])

  const filteredRoutes = useMemo(() => routesData.filter((r: any) =>
    (r.route_name || "").toLowerCase().includes(routeSearch.toLowerCase()) ||
    (r.vehicle_id || "").toLowerCase().includes(routeSearch.toLowerCase())
  ), [routeSearch, routesData])

  // ── Notifications Listener ───────────────────────────────────────────────────
  useEffect(() => {
    const orgId = adminSession?.organization_id
    if (!orgId) return
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
      const t = new Date(n.timestamp || 0).getTime()
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

  // Notifications visible in bell panel — hidden after user taps "Clear all"
  const [panelClearedAt, setPanelClearedAt] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transify_panel_cleared_at")
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })
  const handleClearNotifications = () => {
    const now = Date.now()
    setPanelClearedAt(now)
    if (typeof window !== "undefined") localStorage.setItem("transify_panel_cleared_at", now.toString())
  }
  const panelNotifications = useMemo(() =>
    notifications.filter((n: any) => new Date(n.timestamp || 0).getTime() > panelClearedAt)
    , [notifications, panelClearedAt])

  // Selected tile for drilldown drawer
  const [selectedTile, setSelectedTile] = useState<null | { title: string; items: any[]; type: string }>(null)

  // ── Tracking Filters ────────────────────────────────────────────────────
  const [trackStatus, setTrackStatus] = useState("all")
  const filteredTracking = useMemo(() => vehiclesData.filter((v: any) =>
    trackStatus === "all" || v.status === trackStatus
  ), [trackStatus, vehiclesData])

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
      ],
    },
        { group: "System", items: [
          ...(isSuperAdmin ? [{ id: "admins" as ActiveSection, label: "Admin Management", icon: ShieldCheck }] : []),
          ...(isSuperAdmin ? [{ id: "settings" as ActiveSection, label: "Settings", icon: Settings }] : []),
        ] },
  ]

  const sectionLabel = navGroups.flatMap(g => g.items).find(n => n.id === section)?.label ?? "Overview"

  return (
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

        <div className="border-t border-border p-3 space-y-1">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
          <button onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{sectionLabel}</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search anything..." className="h-9 w-60 rounded-lg border-border bg-background pl-9 text-sm" />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <Bell className="h-4 w-4 text-foreground" />
                {panelNotifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {panelNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</h3>
                    <button
                      className="text-[10px] font-bold text-primary hover:underline"
                      onClick={() => handleClearNotifications()}
                    >Clear all</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {panelNotifications.map((n: any) => (
                      <div key={n.id} className={cn("border-b border-border/50 px-4 py-3 transition-colors hover:bg-secondary/50",
                        n.type === 'sos' ? 'bg-destructive/5' : n.type === 'delay' ? 'bg-warning/5' : ''
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            n.type === 'sos' ? 'bg-destructive/10 text-destructive' :
                              n.type === 'delay' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                          )}>
                            {n.type === 'sos' ? <AlertTriangle className="h-4 w-4" /> :
                              n.type === 'delay' ? <Clock className="h-4 w-4" /> : <Bus className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground leading-tight">{n.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground leading-snug">{n.message}</p>
                            <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {panelNotifications.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 opacity-20" />
                        <p className="text-xs">All caught up!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {section === "overview" && (
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
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                  <div className="flex flex-col gap-4">
                    {driversData.slice(0, 5).map((d: any, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10")}>
                          <UserPlus className={cn("h-4 w-4 text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{d.name} onboarded</p>
                          <p className="text-xs text-muted-foreground">{new Date(d.created_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {driversData.length === 0 && <p className="text-xs text-muted-foreground italic">No recent activity found.</p>}
                  </div>
                </div>


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
          )}

          {/* LIVE TRACKING */}
          {section === "tracking" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-foreground">Live Tracking</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterDropdown label="Status" options={["on-time", "delayed", "emergency"]} value={trackStatus} onChange={setTrackStatus} />
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
                    <div key={v.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm shrink-0">
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
          )}

          {/* MEMBERS (Students / Employees) */}
          {section === "members" && (
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
                  options={[...new Set(studentsData.map(s => isCorporate ? (s.dept || s.department || "") : (s.grade || s.class || "")).filter(Boolean))]}
                  value={memberGradeFilter}
                  onChange={setMemberGradeFilter}
                />
                <FilterDropdown label="Route" options={[...new Set(studentsData.map(s => s.route || s.route_name || "").filter(Boolean))]} value={memberRouteFilter} onChange={setMemberRouteFilter} />
                <FilterDropdown label="Status" options={[...new Set(studentsData.map(s => s.status || "active").filter(Boolean))]} value={memberStatusFilter} onChange={setMemberStatusFilter} />
                {(memberGradeFilter !== "all" || memberRouteFilter !== "all" || memberStatusFilter !== "all" || memberSearch) && (
                  <button onClick={() => { setMemberGradeFilter("all"); setMemberRouteFilter("all"); setMemberStatusFilter("all"); setMemberSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{filteredMembers.length} of {studentsData.length}</span>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {isCorporate ? "Department" : "Grade"}
                      </th>
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
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{s.memberId || s.student_id || s.id || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{s.route || s.route_name || "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingStudent(s); setActiveForm("student") }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={async () => {
                              if (!confirm(`Delete ${s.name || 'this student'}? This cannot be undone.`)) return
                              try {
                                const res = await fetch('/api/students/delete', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    id: s.id,
                                    organization_id: adminSession?.organization_id,
                                    admin_email: userEmail,
                                    admin_name: userName,
                                  })
                                })
                                if (!res.ok) throw new Error((await res.json()).error)
                                showToast(`${s.name || 'Student'} deleted`)
                              } catch (err: any) { alert(err.message || 'Delete failed') }
                            }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
          )}

          {/* DRIVERS */}
          {section === "drivers" && (
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
                <span className="ml-auto text-xs text-muted-foreground">{filteredDrivers.length} of {driversData.length}</span>
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
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
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
                            <StatusBadge status={d.status || "off-duty"} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingDriver(d)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button onClick={() => {
                                if (confirm(`Delete driver "${d.name}"?`)) {
                                  fetch("/api/drivers/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_id: d.id }) })
                                    .then(() => { showToast("Driver deleted"); fetchDrivers() })
                                }
                              }} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredDrivers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                              <div className="rounded-full bg-muted p-4">
                                <Filter className="h-10 w-10 opacity-20" />
                              </div>
                              <p className="text-sm font-medium">No drivers match the current filters.</p>
                              <button onClick={() => { setDriverStatusFilter("all"); setDriverLicenseFilter("all"); setDriverSearch("") }} className="text-xs text-primary hover:underline">Clear all filters</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VEHICLES */}
          {section === "vehicles" && (
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
                  <Input placeholder="Search by plate or driver..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="h-10 rounded-xl bg-card border-border pl-9 text-sm" />
                </div>
                <FilterDropdown label="Status" options={["on-duty", "off-duty", "delayed", "emergency"]} value={vehicleStatusFilter} onChange={setVehicleStatusFilter} />
                <FilterDropdown label="Type" options={["School Bus", "Mini Bus", "Van", "Shuttle"]} value={vehicleTypeFilter} onChange={setVehicleTypeFilter} />
                {(vehicleStatusFilter !== "all" || vehicleTypeFilter !== "all" || vehicleSearch) && (
                  <button onClick={() => { setVehicleStatusFilter("all"); setVehicleTypeFilter("all"); setVehicleSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{filteredVehicles.length} of {vehiclesData.length}</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Driver</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Route</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status & Progress</th>
                        <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredVehicles.map((v, i) => (
                        <tr key={i} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                v.status === "on-duty" || v.status === "on-time" ? "bg-success/10 text-success" : 
                                v.status === "delayed" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                              )}>
                                <Bus className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold font-mono text-foreground">{v.plate_number || v.id}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{v.organization_id?.split("-")[0]}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{v.type}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm text-foreground">{v.driver_name || "Unassigned"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Route className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm text-foreground">{v.route || "No Route"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <div className="flex items-center justify-between gap-3">
                                <StatusBadge status={v.status} />
                                <span className="text-[10px] font-bold text-muted-foreground">{typeof v.progress === 'number' ? v.progress.toFixed(0) : 0}%</span>
                              </div>
                              {v.current_stop && ["on-duty", "on-time", "moving", "delayed", "emergency"].includes(v.status) && (
                                <div className="text-[10px] font-medium text-primary/80 truncate mb-1">
                                  {v.current_stop}
                                </div>
                              )}
                              {/* Only show progress bar when on-duty or active alerts */}
                              {["on-duty", "on-time", "moving", "delayed", "emergency"].includes(v.status) && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div 
                                    className={cn("h-full rounded-full transition-all duration-500", 
                                      v.status === "delayed" ? "bg-warning" : 
                                      v.status === "emergency" ? "bg-destructive" : "bg-success"
                                    )}
                                    style={{ width: `${v.progress || 0}%` }} 
                                  />
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground font-medium">
                                {["on-duty", "on-time", "moving", "delayed", "emergency"].includes(v.status) && v.speed ? `${Math.round(v.speed)} km/h` : "Stationary"}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingVehicle(v)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button onClick={() => {
                                if (confirm(`Delete vehicle "${v.plate_number || v.id}"?`)) {
                                  fetch("/api/vehicles/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicle_id: v.id }) })
                                    .then(() => { showToast("Vehicle deleted"); fetchVehicles() })
                                }
                              }} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredVehicles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-20 text-center text-muted-foreground">
                            <p className="text-sm">No vehicles match the current filters.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ROUTES */}
          {section === "routes" && (
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
                                if (confirm(`Delete route "${v.route_name}"?`)) {
                                  fetch("/api/routes/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ route_id: v.id }) })
                                    .then(() => { showToast("Route deleted"); fetchRoutes() })
                                }
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
          )}

          {/* REPORTS */}
          {section === "reports" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      const csv = "Date,Action,Admin,Details\n" + 
                        dashboardStats.delays.map((l: any) => `${new Date(l.timestamp).toLocaleString()},Delay,${l.driver_name},${l.message}`).join("\n");
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.setAttribute('hidden', '');
                      a.setAttribute('href', url);
                      a.setAttribute('download', 'delay_analytics.csv');
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
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
          )}

          {/* Settings etc... */}

          {/* SETTINGS */}
          {section === "settings" && (
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
          )}

          {/* ADMIN MANAGEMENT (Super Admin only) */}
          {section === "admins" && adminSession && (
            <AdminManagement adminSession={adminSession} />
          )}

        </main>
      </div>

      {/* Forms */}
      {(activeForm === "student" || editingStudent) && <AddStudentForm initialData={editingStudent} isCorporate={isCorporate} onClose={() => { setActiveForm(null); setEditingStudent(null) }} onSave={() => { showToast(editingStudent ? `${memberLabel.slice(0, -1)} updated` : `${memberLabel.slice(0, -1)} added successfully`) }} />}
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
              <div>
                <h2 className="text-xl font-bold text-foreground">Driver Performance Ratings</h2>
                <p className="text-sm text-muted-foreground">Detailed scores for all registered drivers</p>
              </div>
              <button onClick={() => setShowDriverRatings(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4">
                {driversData.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone || "No phone"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-lg font-bold text-foreground">{(d.avg_rating || 0).toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        {(d.total_ratings || 0)} Reviews
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-6 bg-muted/10 rounded-b-3xl">
              <Button onClick={() => setShowDriverRatings(false)} className="w-full h-12 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
