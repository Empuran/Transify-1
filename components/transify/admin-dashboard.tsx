"use client"

import { useState } from "react"
import {
  Bus,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  Activity,
  Plus,
  ChevronRight,
  Search,
  Filter,
  Download,
  Route,
  UserPlus,
  BarChart3,
  TrendingUp,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"

type AdminTab = "overview" | "tracking" | "manage" | "reports"

const overviewCards = [
  { label: "Total Vehicles", value: "24", icon: Bus, iconBg: "bg-primary/10", iconColor: "text-primary", trend: "+2" },
  { label: "Active Trips", value: "18", icon: Activity, iconBg: "bg-success/10", iconColor: "text-success", trend: "" },
  { label: "Delayed Trips", value: "3", icon: Clock, iconBg: "bg-warning/10", iconColor: "text-warning", trend: "-1" },
  { label: "SOS Alerts", value: "0", icon: AlertTriangle, iconBg: "bg-destructive/10", iconColor: "text-destructive", trend: "" },
  { label: "Active Drivers", value: "22", icon: Users, iconBg: "bg-primary/10", iconColor: "text-primary", trend: "" },
]

const vehicles = [
  { id: "KA-01-AB-1234", route: "Route A12", driver: "Rajesh Kumar", status: "on-time" as const, students: 18, speed: "42 km/h" },
  { id: "KA-05-CD-5678", route: "Route B5", driver: "Suresh Patel", status: "delayed" as const, students: 15, speed: "28 km/h" },
  { id: "KA-09-EF-9012", route: "Route C3", driver: "Amit Singh", status: "on-time" as const, students: 20, speed: "38 km/h" },
  { id: "KA-12-GH-3456", route: "Route D7", driver: "Pradeep Rao", status: "on-time" as const, students: 12, speed: "45 km/h" },
  { id: "KA-03-IJ-7890", route: "Route E1", driver: "Vijay Kumar", status: "emergency" as const, students: 16, speed: "0 km/h" },
]

const managementItems = [
  { label: "Add Vehicle", description: "Register a new vehicle", icon: Bus, action: "add-vehicle" },
  { label: "Add Driver", description: "Onboard a new driver", icon: UserPlus, action: "add-driver" },
  { label: "Add Route", description: "Create a new route", icon: Route, action: "add-route" },
  { label: "Assign Students", description: "Map students to routes", icon: Users, action: "assign-students" },
  { label: "Assign Employees", description: "Map employees to shuttles", icon: Users, action: "assign-employees" },
]

const reportItems = [
  { label: "Delay Analytics", description: "Patterns and root causes", icon: Clock, color: "text-warning" },
  { label: "Driver Performance", description: "Safety and punctuality scores", icon: TrendingUp, color: "text-primary" },
  { label: "Route Efficiency", description: "Time & distance optimization", icon: Route, color: "text-success" },
]

export function AdminDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const userName = profile?.globalName || "Admin User"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tracking", label: "Live Track" },
    { id: "manage", label: "Manage" },
    { id: "reports", label: "Reports" },
  ]

  const filteredVehicles = filterStatus === "all"
    ? vehicles
    : vehicles.filter((v) => v.status === filterStatus)

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-8">
      {/* Header */}
      <div className="bg-primary px-5 pb-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-primary-foreground/70">Admin Dashboard</p>
            <h1 className="text-lg font-bold text-primary-foreground">{userName}</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
            <span className="text-sm font-bold text-primary-foreground">{initials}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex gap-1 rounded-xl bg-primary-foreground/10 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-primary-foreground text-primary shadow-sm"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4 p-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {overviewCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-2xl border border-border bg-card p-4 shadow-sm",
                      i === 0 && "col-span-2"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.iconBg)}>
                        <Icon className={cn("h-5 w-5", card.iconColor)} />
                      </div>
                      {card.trend && (
                        <span className={cn(
                          "text-xs font-semibold",
                          card.trend.startsWith("+") ? "text-success" : "text-destructive"
                        )}>
                          {card.trend}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Recent Activity
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="flex-1 text-sm text-foreground">Route A12 completed morning trip</span>
                  <span className="text-xs text-muted-foreground">5m ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-warning" />
                  <span className="flex-1 text-sm text-foreground">Route B5 reported 8 min delay</span>
                  <span className="text-xs text-muted-foreground">15m ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="flex-1 text-sm text-foreground">New driver Vijay Kumar onboarded</span>
                  <span className="text-xs text-muted-foreground">1h ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Tracking Tab */}
        {activeTab === "tracking" && (
          <div className="flex flex-col gap-4 p-4">
            {/* Map */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="relative h-52 w-full bg-muted/50">
                <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="adminGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#adminGrid)" />
                </svg>

                {/* Vehicle markers */}
                {[
                  { left: "20%", top: "30%", status: "on-time" },
                  { left: "45%", top: "55%", status: "delayed" },
                  { left: "70%", top: "25%", status: "on-time" },
                  { left: "35%", top: "75%", status: "on-time" },
                  { left: "80%", top: "60%", status: "emergency" },
                ].map((v, i) => (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: v.left, top: v.top }}
                  >
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full shadow-md",
                      v.status === "on-time" ? "bg-success" :
                        v.status === "delayed" ? "bg-warning" : "bg-destructive"
                    )}>
                      <Bus className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {["all", "on-time", "delayed", "emergency"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                    filterStatus === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Vehicle List */}
            <div className="flex flex-col gap-2">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    vehicle.status === "on-time" ? "bg-success/10" :
                      vehicle.status === "delayed" ? "bg-warning/10" : "bg-destructive/10"
                  )}>
                    <Bus className={cn(
                      "h-5 w-5",
                      vehicle.status === "on-time" ? "text-success" :
                        vehicle.status === "delayed" ? "text-warning" : "text-destructive"
                    )} />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{vehicle.id}</span>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {vehicle.route} - {vehicle.driver}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {vehicle.students}
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {vehicle.speed}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Management Tab */}
        {activeTab === "manage" && (
          <div className="flex flex-col gap-4 p-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicles, drivers, routes..."
                className="h-11 rounded-xl border-border bg-card pl-10"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              {managementItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.action}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-secondary/80"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </button>
                )
              })}
            </div>

            {/* Quick Stats */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Fleet Summary
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">24</p>
                  <p className="text-[10px] text-muted-foreground">Vehicles</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">22</p>
                  <p className="text-[10px] text-muted-foreground">Drivers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">12</p>
                  <p className="text-[10px] text-muted-foreground">Routes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="flex flex-col gap-4 p-4">
            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-foreground">91%</p>
                <p className="text-[10px] text-muted-foreground">On-Time Rate</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-foreground">4.6</p>
                <p className="text-[10px] text-muted-foreground">Avg Driver Score</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-[10px] text-muted-foreground">Trips Today</p>
              </div>
            </div>

            {/* Report Cards */}
            <div className="flex flex-col gap-3">
              {reportItems.map((report, i) => {
                const Icon = report.icon
                return (
                  <button
                    key={i}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-secondary/80"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className={cn("h-6 w-6", report.color)} />
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-sm font-semibold text-foreground">{report.label}</span>
                      <span className="text-xs text-muted-foreground">{report.description}</span>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </button>
                )
              })}
            </div>

            {/* Export */}
            <Button variant="outline" className="h-12 rounded-xl">
              <BarChart3 className="mr-2 h-4 w-4" />
              Export Full Report
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
