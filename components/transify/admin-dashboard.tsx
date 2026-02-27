"use client"

import { useState, useMemo } from "react"
import {
  Bus, Users, AlertTriangle, Clock, Activity, Plus, ChevronRight,
  Search, Download, Route, UserPlus, BarChart3, TrendingUp,
  Navigation, GraduationCap, Bell, Settings, LogOut, Menu,
  Home, Briefcase, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Filter, X, ChevronDown, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { AddStudentForm } from "./admin-form-add-student"
import { AddDriverForm } from "./admin-form-add-driver"
import { AddVehicleForm } from "./admin-form-add-vehicle"
import { AddRouteForm } from "./admin-form-add-route"
import { AdminManagement } from "./admin-management"
import { useRouter } from "next/navigation"

type ActiveSection = "overview" | "tracking" | "members" | "drivers" | "vehicles" | "routes" | "reports" | "settings" | "admins"
type ActiveForm = "student" | "driver" | "vehicle" | "route" | null

// ── Data ─────────────────────────────────────────────────────────────────────

const vehiclesData = [
  { id: "KA-01-AB-1234", route: "Route A12 – Koramangala", driver: "Rajesh Kumar", status: "on-time", members: 18, speed: "42 km/h", progress: 68, type: "School Bus" },
  { id: "KA-05-CD-5678", route: "Route B5 – Indiranagar", driver: "Suresh Patel", status: "delayed", members: 15, speed: "28 km/h", progress: 35, type: "Van" },
  { id: "KA-09-EF-9012", route: "Route C3 – HSR Layout", driver: "Amit Singh", status: "on-time", members: 20, speed: "38 km/h", progress: 82, type: "School Bus" },
  { id: "KA-12-GH-3456", route: "Route D7 – Whitefield", driver: "Pradeep Rao", status: "on-time", members: 12, speed: "45 km/h", progress: 51, type: "Mini Bus" },
  { id: "KA-03-IJ-7890", route: "Route E1 – Jayanagar", driver: "Vijay Kumar", status: "emergency", members: 16, speed: "0 km/h", progress: 20, type: "School Bus" },
]

const studentsData = [
  { name: "Aarav Sharma", grade: "Class 7", memberId: "MBR-001", route: "Route A12", status: "on-bus", dept: "Engineering" },
  { name: "Priya Nair", grade: "Class 5", memberId: "MBR-002", route: "Route B5", status: "at-home", dept: "Design" },
  { name: "Kiran Reddy", grade: "Class 9", memberId: "MBR-003", route: "Route C3", status: "on-bus", dept: "Marketing" },
  { name: "Sneha Patel", grade: "Class 6", memberId: "MBR-004", route: "Route D7", status: "at-school", dept: "Engineering" },
  { name: "Rahul Mehta", grade: "Class 8", memberId: "MBR-005", route: "Route A12", status: "on-bus", dept: "HR" },
  { name: "Ananya Singh", grade: "Class 4", memberId: "MBR-006", route: "Route C3", status: "at-home", dept: "Finance" },
]

const driversData = [
  { name: "Rajesh Kumar", phone: "+91 98765 43210", license: "DL-HMV-2019", vehicle: "KA-01-AB-1234", score: 4.8, status: "on-duty", licenseType: "HMV" },
  { name: "Suresh Patel", phone: "+91 97654 32109", license: "DL-HMV-2020", vehicle: "KA-05-CD-5678", score: 4.5, status: "on-duty", licenseType: "HMV" },
  { name: "Amit Singh", phone: "+91 96543 21098", license: "DL-PSV-2018", vehicle: "KA-09-EF-9012", score: 4.9, status: "on-duty", licenseType: "PSV" },
  { name: "Pradeep Rao", phone: "+91 95432 10987", license: "DL-HMV-2021", vehicle: "KA-12-GH-3456", score: 4.3, status: "off-duty", licenseType: "HMV" },
  { name: "Vijay Kumar", phone: "+91 94321 09876", license: "DL-HTV-2017", vehicle: "KA-03-IJ-7890", score: 3.9, status: "on-duty", licenseType: "HTV" },
]

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

export function AdminDashboard() {
  const { profile, logoutMock, adminSession } = useAuth()
  const router = useRouter()
  const [section, setSection] = useState<ActiveSection>("overview")
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)
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

  const filteredDrivers = useMemo(() => driversData.filter(d =>
    (d.name.toLowerCase().includes(driverSearch.toLowerCase()) || d.phone.includes(driverSearch)) &&
    (driverStatusFilter === "all" || d.status === driverStatusFilter) &&
    (driverLicenseFilter === "all" || d.licenseType === driverLicenseFilter)
  ), [driverSearch, driverStatusFilter, driverLicenseFilter])

  // ── Vehicle Filters ─────────────────────────────────────────────────────
  const [vehicleSearch, setVehicleSearch] = useState("")
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all")
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all")

  const filteredVehicles = useMemo(() => vehiclesData.filter(v =>
    (v.id.toLowerCase().includes(vehicleSearch.toLowerCase()) || v.driver.toLowerCase().includes(vehicleSearch.toLowerCase())) &&
    (vehicleStatusFilter === "all" || v.status === vehicleStatusFilter) &&
    (vehicleTypeFilter === "all" || v.type === vehicleTypeFilter)
  ), [vehicleSearch, vehicleStatusFilter, vehicleTypeFilter])

  // ── Route Filters ───────────────────────────────────────────────────────
  const [routeSearch, setRouteSearch] = useState("")
  const filteredRoutes = useMemo(() => vehiclesData.filter(v =>
    v.route.toLowerCase().includes(routeSearch.toLowerCase()) || v.id.toLowerCase().includes(routeSearch.toLowerCase())
  ), [routeSearch])

  // ── Tracking Filters ────────────────────────────────────────────────────
  const [trackStatus, setTrackStatus] = useState("all")
  const filteredTracking = useMemo(() => vehiclesData.filter(v =>
    trackStatus === "all" || v.status === trackStatus
  ), [trackStatus])

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
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
              <Bell className="h-4 w-4 text-foreground" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">3</span>
            </button>
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
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Live · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  { label: "Total Vehicles", value: "24", sub: "+2 this month", icon: Bus, color: "text-primary", bg: "bg-primary/10", trend: "up" },
                  { label: "Active Trips", value: "18", sub: "of 24 vehicles", icon: Activity, color: "text-success", bg: "bg-success/10", trend: "up" },
                  { label: "Delayed Trips", value: "3", sub: "-1 vs yesterday", icon: Clock, color: "text-warning", bg: "bg-warning/10", trend: "down" },
                  { label: "SOS Alerts", value: "1", sub: "1 active now", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", trend: "neutral" },
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
                    {[
                      { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", text: "Route A12 completed morning trip", time: "5m ago" },
                      { icon: Clock, color: "text-warning", bg: "bg-warning/10", text: "Route B5 reported 8 min delay", time: "15m ago" },
                      { icon: UserPlus, color: "text-primary", bg: "bg-primary/10", text: "New driver Vijay Kumar onboarded", time: "1h ago" },
                      { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", text: "SOS triggered on Route E1", time: "2h ago" },
                      { icon: Bus, color: "text-teal", bg: "bg-teal/10", text: "Vehicle KA-12-GH-3456 serviced", time: "3h ago" },
                    ].map((item, i) => {
                      const Icon = item.icon; return (
                        <div key={i} className="flex items-start gap-3">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", item.bg)}>
                            <Icon className={cn("h-4 w-4", item.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{item.text}</p>
                            <p className="text-xs text-muted-foreground">{item.time}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fleet Status</h3>
                  <div className="flex flex-col gap-3">
                    {vehiclesData.map((v) => (
                      <div key={v.id} className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          v.status === "on-time" ? "bg-success/10" : v.status === "delayed" ? "bg-warning/10" : "bg-destructive/10"
                        )}>
                          <Bus className={cn("h-4 w-4",
                            v.status === "on-time" ? "text-success" : v.status === "delayed" ? "text-warning" : "text-destructive"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground">{v.id}</span>
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
                  <div className="relative h-80">
                    <svg className="absolute inset-0 h-full w-full bg-muted/30" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="adminGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.8" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#adminGrid)" />
                      <line x1="0" y1="160" x2="100%" y2="160" stroke="var(--muted)" strokeWidth="3" />
                      <line x1="200" y1="0" x2="200" y2="100%" stroke="var(--muted)" strokeWidth="3" />
                      <line x1="450" y1="0" x2="450" y2="100%" stroke="var(--muted)" strokeWidth="3" />
                    </svg>
                    {[
                      { x: "18%", y: "28%", s: "on-time", label: "A12" },
                      { x: "42%", y: "58%", s: "delayed", label: "B5" },
                      { x: "68%", y: "22%", s: "on-time", label: "C3" },
                      { x: "33%", y: "72%", s: "on-time", label: "D7" },
                      { x: "78%", y: "62%", s: "emergency", label: "E1" },
                    ].filter(v => trackStatus === "all" || v.s === trackStatus).map((v, i) => (
                      <div key={i} className="absolute" style={{ left: v.x, top: v.y, transform: "translate(-50%,-50%)" }}>
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shadow-lg border-2 border-white",
                          v.s === "on-time" ? "bg-success" : v.s === "delayed" ? "bg-warning" : "bg-destructive"
                        )}>
                          <Bus className="h-4 w-4 text-white" />
                        </div>
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-foreground bg-card rounded px-1 shadow">{v.label}</span>
                      </div>
                    ))}
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
                            <Bus className={cn("h-4 w-4",
                              v.status === "on-time" ? "text-success" : v.status === "delayed" ? "text-warning" : "text-destructive"
                            )} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{v.id}</p>
                            <p className="text-[10px] text-muted-foreground">{v.driver}</p>
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
                        <span className="text-sm font-bold text-primary">{d.name.split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{d.name}</p>
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <span>{d.phone}</span>
                      <span>License: <span className="font-semibold text-foreground">{d.license}</span> ({d.licenseType})</span>
                      <span>Vehicle: <span className="font-semibold text-foreground">{d.vehicle}</span></span>
                    </div>
                    <div className="mt-3 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={cn("h-1.5 flex-1 rounded-full", s <= Math.floor(d.score) ? "bg-warning" : "bg-muted")} />
                      ))}
                      <span className="ml-1 text-xs font-bold text-warning">{d.score}</span>
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
                          <p className="text-sm font-bold font-mono text-foreground">{v.id}</p>
                          <p className="text-xs text-muted-foreground">{v.type}</p>
                        </div>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span><Route className="inline h-3 w-3 mr-1" />{v.route}</span>
                      <span><Users className="inline h-3 w-3 mr-1" />{v.members} {memberLabel.toLowerCase()}</span>
                      <span><Navigation className="inline h-3 w-3 mr-1" />{v.speed}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full",
                        v.status === "on-time" ? "bg-success" : v.status === "delayed" ? "bg-warning" : "bg-destructive"
                      )} style={{ width: `${v.progress}%` }} />
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
                        <p className="text-sm font-bold text-foreground">{v.route}</p>
                        <p className="text-xs text-muted-foreground">Assigned: {v.id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">{v.members}</p><p className="text-[10px] text-muted-foreground">{memberLabel}</p></div>
                      <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">4</p><p className="text-[10px] text-muted-foreground">Stops</p></div>
                      <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">12km</p><p className="text-[10px] text-muted-foreground">Distance</p></div>
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
                  { v: "91%", l: "On-Time Rate", sub: "+3% vs last month", color: "text-success" },
                  { v: "4.6", l: "Avg Driver Score", sub: "Out of 5.0", color: "text-warning" },
                  { v: "156", l: "Trips Today", sub: "Across 24 vehicles", color: "text-primary" },
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
                { label: "Organization Name", value: "Delhi Public School", type: "text" },
                { label: "Admin Email", value: "admin@dps.edu.in", type: "email" },
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
      {activeForm === "driver" && <AddDriverForm onClose={() => setActiveForm(null)} onSave={() => showToast("Driver onboarded successfully")} />}
      {activeForm === "vehicle" && <AddVehicleForm onClose={() => setActiveForm(null)} onSave={() => showToast("Vehicle registered successfully")} />}
      {activeForm === "route" && <AddRouteForm onClose={() => setActiveForm(null)} onSave={() => showToast("Route created successfully")} />}

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
