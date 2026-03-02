"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Bus, Users, AlertTriangle, Clock, Activity, Plus, ChevronRight,
  Search, Download, Route, UserPlus, BarChart3, TrendingUp,
  Navigation, GraduationCap, Bell, Settings, LogOut, Menu,
  Home, Briefcase, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, X, ChevronDown, ShieldCheck, Pencil, Trash2, Car, Truck,
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
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      status === "on-time" ? "bg-success/10 text-success" :
        status === "delayed" ? "bg-warning/10 text-warning" :
          status === "emergency" ? "bg-destructive/10 text-destructive" :
            status === "on-duty" ? "bg-success/10 text-success" :
              status === "off-duty" ? "bg-muted text-muted-foreground" :
                status === "on-bus" ? "bg-primary/10 text-primary" :
                  status === "at-school" ? "bg-teal/10 text-teal" :
                    "bg-muted text-muted-foreground"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "on-time" || status === "on-duty" || status === "at-school" ? "bg-success" :
          status === "delayed" ? "bg-warning" :
            status === "emergency" ? "bg-destructive" :
              status === "on-bus" ? "bg-primary" : "bg-muted-foreground"
      )} />
      {status.replace(/-/g, " ")}
    </span>
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

  // ── Date Filtering ──────────────────────────────────────────────────────
  const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().split("T")[0])

  // ── Notifications ───────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const filteredMembers = useMemo(() => studentsData.filter(s =>
    (s.name.toLowerCase().includes(memberSearch.toLowerCase()) || s.memberId.toLowerCase().includes(memberSearch.toLowerCase())) &&
    (memberRouteFilter === "all" || s.route.includes(memberRouteFilter)) &&
    (memberStatusFilter === "all" || s.status === memberStatusFilter) &&
    (memberGradeFilter === "all" || (isCorporate ? s.dept === memberGradeFilter : s.grade === memberGradeFilter))
  ), [memberSearch, memberRouteFilter, memberStatusFilter, memberGradeFilter, isCorporate])

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
    {
      group: "System",
      items: [
        ...(isSuperAdmin ? [{ id: "admins" as ActiveSection, label: "Admin Management", icon: ShieldCheck }] : []),
        ...(isSuperAdmin ? [{ id: "settings" as ActiveSection, label: "Settings", icon: Settings }] : []),
      ],
    },
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
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</h3>
                    <button className="text-[10px] font-bold text-primary hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={cn("border-b border-border/50 px-4 py-3 transition-colors hover:bg-secondary/50", !n.read && "bg-primary/5")}>
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
                    {notifications.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 opacity-20" />
                        <p className="text-xs">No notifications yet</p>
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Good evening, {userName.split(" ")[0]} 👋</h1>
                  <p className="text-sm text-muted-foreground mt-1">Here's your fleet overview for today.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={dashboardDate}
                      onChange={(e) => setDashboardDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    Live · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  { label: "Total Vehicles", value: vehiclesData.length.toString(), sub: `${vehiclesData.length} in fleet`, icon: Bus, color: "text-primary", bg: "bg-primary/10", trend: "neutral" },
                  { label: "Active Trips", value: vehiclesData.filter(v => v.status === "on-time").length.toString(), sub: `of ${vehiclesData.length} vehicles`, icon: Activity, color: "text-success", bg: "bg-success/10", trend: "up" },
                  { label: "Delayed Trips", value: vehiclesData.filter(v => v.status === "delayed").length.toString(), sub: "real-time check", icon: Clock, color: "text-warning", bg: "bg-warning/10", trend: "down" },
                  { label: "SOS Alerts", value: vehiclesData.filter(v => v.status === "emergency").length.toString(), sub: "0 active now", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", trend: "neutral" },
                ].map((card, i) => {
                  const Icon = card.icon
                  return (
                    <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.bg)}>
                          <Icon className={cn("h-5 w-5", card.color)} />
                        </div>
                        {card.trend === "up" && <ArrowUpRight className="h-4 w-4 text-success" />}
                        {card.trend === "down" && <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      </div>
                      <p className="mt-3 text-3xl font-black text-foreground">{card.value}</p>
                      <p className="text-sm font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                    </div>
                  )
                })}
              </div>

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

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fleet Status</h3>
                  <div className="flex flex-col gap-3">
                    {vehiclesData.slice(0, 5).map((v: any) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          v.status === "on-time" ? "bg-success/10" : v.status === "delayed" ? "bg-warning/10" : "bg-destructive/10"
                        )}>
                          {(() => {
                            const Icon = getVehicleIcon(v.type);
                            return <Icon className={cn("h-4 w-4",
                              v.status === "on-time" ? "text-success" : v.status === "delayed" ? "text-warning" : "text-destructive"
                            )} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground">{v.plate_number || v.id}</span>
                            <StatusBadge status={v.status} />
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full",
                              v.status === "on-time" ? "bg-success" : v.status === "delayed" ? "bg-warning" : "bg-destructive"
                            )} style={{ width: `${v.progress}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{v.progress}%</span>
                      </div>
                    ))}
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
                    <LiveMap organizationId={adminSession?.organization_id} />
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
                            <p className="text-[10px] text-muted-foreground">{v.driver || "No driver assigned"}</p>
                          </div>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span><Users className="inline h-3 w-3 mr-1" />{v.members}</span>
                        <span><Navigation className="inline h-3 w-3 mr-1" />{v.speed}</span>
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
                  options={isCorporate
                    ? ["Engineering", "Design", "Marketing", "HR", "Finance"]
                    : ["Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9"]}
                  value={memberGradeFilter}
                  onChange={setMemberGradeFilter}
                />
                <FilterDropdown label="Route" options={["Route A12", "Route B5", "Route C3", "Route D7"]} value={memberRouteFilter} onChange={setMemberRouteFilter} />
                <FilterDropdown label="Status" options={["on-bus", "at-home", "at-school"]} value={memberStatusFilter} onChange={setMemberStatusFilter} />
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
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((s, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{s.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{isCorporate ? s.dept : s.grade}</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{s.memberId}</td>
                        <td className="px-5 py-3 text-muted-foreground">{s.route}</td>
                        <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No {memberLabel.toLowerCase()} match the current filters.</td></tr>
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

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDrivers.map((d, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-bold text-primary">{d.name?.split(" ").map((n: string) => n[0]).join("")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{d.name}</p>
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <span>{d.phone}</span>
                      <span>License: <span className="font-semibold text-foreground">{d.license_number}</span> ({d.license_type})</span>
                      <span>Vehicle: <span className="font-semibold text-foreground">{d.vehicle_id || "Unassigned"}</span></span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <div key={s} className={cn("h-1.5 flex-1 rounded-full", s <= Math.floor(d.score || 0) ? "bg-warning" : "bg-muted")} />
                        ))}
                        <span className="ml-1 text-xs font-bold text-warning">{d.score || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => setEditingDriver(d)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => {
                          if (confirm(`Delete driver "${d.name}"?`)) {
                            fetch("/api/drivers/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver_id: d.id }) })
                              .then(() => { showToast("Driver deleted"); fetchDrivers() })
                          }
                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredDrivers.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Filter className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No drivers match the current filters.</p>
                  </div>
                )}
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
                <FilterDropdown label="Status" options={["on-time", "delayed", "emergency"]} value={vehicleStatusFilter} onChange={setVehicleStatusFilter} />
                <FilterDropdown label="Type" options={["School Bus", "Mini Bus", "Van", "Shuttle"]} value={vehicleTypeFilter} onChange={setVehicleTypeFilter} />
                {(vehicleStatusFilter !== "all" || vehicleTypeFilter !== "all" || vehicleSearch) && (
                  <button onClick={() => { setVehicleStatusFilter("all"); setVehicleTypeFilter("all"); setVehicleSearch("") }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{filteredVehicles.length} of {vehiclesData.length}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredVehicles.map((v, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl",
                          v.status === "on-time" ? "bg-success/10" : v.status === "delayed" ? "bg-warning/10" : "bg-destructive/10"
                        )}>
                          <Bus className={cn("h-5 w-5",
                            v.status === "on-time" ? "text-success" : v.status === "delayed" ? "text-warning" : "text-destructive"
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-bold font-mono text-foreground">{v.plate_number || v.id}</p>
                          <p className="text-xs text-muted-foreground">{v.type}</p>
                        </div>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span><Route className="inline h-3 w-3 mr-1" />{v.route || "No route"}</span>
                      <span><Users className="inline h-3 w-3 mr-1" />{v.capacity || 0} seats</span>
                      <span><Navigation className="inline h-3 w-3 mr-1" />{v.driver_name || "Unassigned"}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full",
                          v.status === "on-time" ? "bg-success" : v.status === "delayed" ? "bg-warning" : "bg-destructive"
                        )} style={{ width: `${v.progress || 50}%` }} />
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => setEditingVehicle(v)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => {
                          if (confirm(`Delete vehicle "${v.plate_number || v.id}"?`)) {
                            fetch("/api/vehicles/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicle_id: v.id }) })
                              .then(() => { showToast("Vehicle deleted"); fetchVehicles() })
                          }
                        }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredVehicles.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Filter className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No vehicles match the current filters.</p>
                  </div>
                )}
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

              <div className="grid gap-4 sm:grid-cols-2">
                {filteredRoutes.map((v, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Route className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{v.route_name}</p>
                        <p className="text-xs text-muted-foreground">Vehicle: {v.vehicle_id || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-muted/50 p-2">
                        <p className="text-lg font-bold text-foreground">{(v.stops || []).length}</p>
                        <p className="text-[10px] text-muted-foreground">Stops</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-2">
                        <p className="text-lg font-bold text-foreground">{v.distance_km || "0"}km</p>
                        <p className="text-[10px] text-muted-foreground">Distance</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <button onClick={() => setEditingRoute(v)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => {
                        if (confirm(`Delete route "${v.route_name}"?`)) {
                          fetch("/api/routes/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ route_id: v.id }) })
                            .then(() => { showToast("Route deleted"); fetchRoutes() })
                        }
                      }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredRoutes.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Filter className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No routes match your search.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORTS */}
          {section === "reports" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
                <Button variant="outline" className="gap-2 rounded-xl"><Download className="h-4 w-4" /> Export All</Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { v: "100%", l: "On-Time Rate", sub: "Based on active fleet", color: "text-success" },
                  { v: "4.8", l: "Avg Driver Score", sub: "Out of 5.0", color: "text-warning" },
                  { v: vehiclesData.filter((v: any) => v.status === "on-time").length.toString(), l: "Trips Today", sub: `Across ${vehiclesData.length} vehicles`, color: "text-primary" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm text-center">
                    <p className={cn("text-4xl font-black", s.color)}>{s.v}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{s.l}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { icon: Clock, label: "Delay Analytics", desc: "Patterns and root causes", color: "text-warning", bg: "bg-warning/10" },
                  { icon: TrendingUp, label: "Driver Performance", desc: "Safety and punctuality scores", color: "text-primary", bg: "bg-primary/10" },
                  { icon: Route, label: "Route Efficiency", desc: "Time & distance optimization", color: "text-success", bg: "bg-success/10" },
                ].map((r, i) => {
                  const Icon = r.icon; return (
                    <button key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98] text-left">
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", r.bg)}>
                        <Icon className={cn("h-6 w-6", r.color)} />
                      </div>
                      <div className="flex-1"><p className="text-sm font-bold text-foreground">{r.label}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
      {activeForm === "student" && <AddStudentForm isCorporate={isCorporate} onClose={() => setActiveForm(null)} onSave={() => showToast(`${memberLabel.slice(0, -1)} added successfully`)} />}
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
    </div>
  )
}
