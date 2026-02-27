"use client"

import { useState } from "react"
import {
  Bus,
  MapPin,
  Play,
  Square,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Navigation,
  Users,
  Route,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

type TripState = "not-started" | "in-progress" | "completed"

const routeStops = [
  { name: "Depot", time: "7:45 AM", students: 0, status: "completed" as const },
  { name: "Koramangala 4th Block", time: "8:00 AM", students: 4, status: "completed" as const },
  { name: "HSR Layout", time: "8:12 AM", students: 3, status: "completed" as const },
  { name: "MG Road", time: "8:25 AM", students: 5, status: "current" as const },
  { name: "Indiranagar", time: "8:35 AM", students: 6, status: "upcoming" as const },
  { name: "School Main Gate", time: "8:45 AM", students: 0, status: "upcoming" as const },
]

export function DriverDashboard() {
  const { profile, logoutMock } = useAuth()
  const router = useRouter()
  const [tripState, setTripState] = useState<TripState>("in-progress")
  const [showDelayReport, setShowDelayReport] = useState(false)
  const [showSosConfirm, setShowSosConfirm] = useState(false)

  const userName = profile?.globalName || "Rajesh Kumar"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const completedStops = routeStops.filter((s) => s.status === "completed").length
  const totalStops = routeStops.length

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-8">
      {/* Header */}
      <div className="bg-primary px-5 pb-5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-primary-foreground/70">Good Morning</p>
            <h1 className="text-lg font-bold text-primary-foreground">{userName}</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
            <span className="text-sm font-bold text-primary-foreground">{initials}</span>
          </div>
        </div>

        {/* Vehicle & Route Info */}
        <div className="mt-4 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2.5">
            <Bus className="h-4 w-4 text-primary-foreground/80" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary-foreground/60">Vehicle</span>
              <span className="text-xs font-semibold text-primary-foreground">KA-01-AB-1234</span>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2.5">
            <Route className="h-4 w-4 text-primary-foreground/80" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary-foreground/60">Route</span>
              <span className="text-xs font-semibold text-primary-foreground">Route A12</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Status & Actions */}
      <div className="mx-4 -mt-3 rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Trip Status</span>
            <StatusBadge
              status={tripState === "in-progress" ? "active" : tripState === "completed" ? "completed" : "upcoming"}
              size="md"
            />
          </div>
          <span className="text-xs text-muted-foreground">{completedStops}/{totalStops} stops</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {tripState === "not-started" ? (
            <Button
              onClick={() => setTripState("in-progress")}
              className="col-span-2 h-12 rounded-xl bg-success text-success-foreground font-semibold hover:bg-success/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Trip
            </Button>
          ) : tripState === "in-progress" ? (
            <>
              <Button
                onClick={() => setTripState("completed")}
                variant="outline"
                className="h-12 rounded-xl font-semibold border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <Square className="mr-2 h-4 w-4" />
                End Trip
              </Button>
              <Button
                onClick={() => setShowDelayReport(true)}
                variant="outline"
                className="h-12 rounded-xl font-semibold border-warning/30 text-warning hover:bg-warning/5"
              >
                <Clock className="mr-2 h-4 w-4" />
                Report Delay
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setTripState("not-started")}
              className="col-span-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Start New Trip
            </Button>
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-48 w-full bg-muted/50">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="driverGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#driverGrid)" />
          </svg>

          {/* Route line */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path
              d="M 30 170 Q 80 140 140 120 Q 200 100 260 70 Q 320 40 370 20"
              fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="8 4" opacity="0.3"
            />
            <path
              d="M 30 170 Q 80 140 140 120 Q 200 100 220 88"
              fill="none" stroke="var(--primary)" strokeWidth="3"
            />
          </svg>

          {/* Stop markers */}
          {routeStops.map((stop, i) => {
            const positions = [
              { left: "5%", top: "82%" },
              { left: "22%", top: "65%" },
              { left: "38%", top: "55%" },
              { left: "54%", top: "42%" },
              { left: "72%", top: "28%" },
              { left: "90%", top: "8%" },
            ]
            const pos = positions[i]
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.left, top: pos.top }}
              >
                {stop.status === "completed" ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                    <CheckCircle2 className="h-3 w-3 text-success-foreground" />
                  </div>
                ) : stop.status === "current" ? (
                  <div className="relative">
                    <div className="absolute -inset-2 animate-ping rounded-full bg-primary/20" />
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary ring-2 ring-primary/20">
                      <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-card" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Trip Summary Card */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Route Stops
        </h3>
        <div className="flex flex-col">
          {routeStops.map((stop, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {stop.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : stop.status === "current" ? (
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="h-3 w-3 rounded-full bg-primary" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                {i < routeStops.length - 1 && (
                  <div className={cn(
                    "my-1 h-6 w-0.5",
                    stop.status === "completed" ? "bg-success/40" : "bg-border"
                  )} />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between pb-2">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-sm",
                    stop.status === "current" ? "font-semibold text-primary" :
                      stop.status === "completed" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {stop.name}
                  </span>
                  {stop.students > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {stop.students} students
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{stop.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SOS Button */}
      <div className="mx-4 mt-4">
        <Button
          onClick={() => setShowSosConfirm(true)}
          variant="outline"
          className="h-14 w-full rounded-xl border-2 border-destructive/30 text-destructive font-bold text-base hover:bg-destructive/5"
        >
          <AlertTriangle className="mr-2 h-5 w-5" />
          Emergency SOS
        </Button>
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => { logoutMock(); router.push("/category") }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 transition-colors active:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Sign Out</span>
        </button>
      </div>

      {/* Delay Report Bottom Sheet */}
      {showDelayReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h3 className="text-lg font-bold text-foreground">Report Delay</h3>
            <p className="mt-1 text-sm text-muted-foreground">Select the reason for the delay</p>
            <div className="mt-4 flex flex-col gap-2">
              {["Heavy Traffic", "Road Construction", "Vehicle Issue", "Weather", "Other"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setShowDelayReport(false)}
                  className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors active:bg-accent"
                >
                  {reason}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDelayReport(false)}
              className="mt-4 h-12 w-full rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* SOS Confirmation */}
      {showSosConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Emergency SOS</h3>
              <p className="text-center text-sm text-muted-foreground">
                This will alert the admin, parents, and emergency services immediately.
              </p>
              <div className="flex w-full gap-3">
                <Button variant="outline" onClick={() => setShowSosConfirm(false)} className="h-12 flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowSosConfirm(false)}
                  className="h-12 flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm SOS
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
