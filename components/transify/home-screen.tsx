"use client"

import { useState } from "react"
import {
  MapPin,
  Gauge,
  Clock,
  Navigation,
  AlertTriangle,
  Bus,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { StatusBadge } from "./status-badge"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const children = [
  {
    id: 1,
    name: "Arya Sharma",
    school: "Delhi Public School, Koramangala",
    vehicle: "KA-01-AB-1234",
    driver: "Rajesh Kumar",
    route: "Route A12",
    status: "on-time" as const,
  },
  {
    id: 2,
    name: "Vihaan Sharma",
    school: "International Academy, Indiranagar",
    vehicle: "KA-05-CD-5678",
    driver: "Suresh Patel",
    route: "Route B5",
    status: "delayed" as const,
  },
]

const timelineStops = [
  { name: "Depot Start", time: "7:45 AM", status: "completed" as const },
  { name: "Koramangala 4th Block", time: "8:00 AM", status: "completed" as const },
  { name: "HSR Layout", time: "8:12 AM", status: "completed" as const },
  { name: "MG Road", time: "8:25 AM", status: "current" as const },
  { name: "Indiranagar", time: "8:35 AM", status: "upcoming" as const },
  { name: "School Main Gate", time: "8:45 AM", status: "upcoming" as const },
]

interface ParentHomeScreenProps {
  isPremium?: boolean
  onSOS?: () => void
}

export function ParentHomeScreen({ isPremium = false, onSOS }: ParentHomeScreenProps) {
  const { profile } = useAuth()
  const [selectedChild, setSelectedChild] = useState(children[0])
  const [showChildPicker, setShowChildPicker] = useState(false)
  const [showSosConfirm, setShowSosConfirm] = useState(false)

  const userName = profile?.globalName || "User"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Good Morning</p>
            <h1 className="text-lg font-bold text-foreground">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isPremium && (
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                PREMIUM
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <span className="text-sm font-bold text-primary-foreground">{initials}</span>
            </div>
          </div>
        </div>

        {/* Child Switcher */}
        <button
          onClick={() => setShowChildPicker(!showChildPicker)}
          className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3 transition-colors active:bg-accent"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {selectedChild.name}
              </span>
              <StatusBadge status={selectedChild.status} />
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedChild.school}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showChildPicker && "rotate-180"
            )}
          />
        </button>

        {/* Child Dropdown */}
        {showChildPicker && (
          <div className="mt-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-2 shadow-lg">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChild(child)
                  setShowChildPicker(false)
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  selectedChild.id === child.id
                    ? "bg-primary/5 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-xs font-bold text-primary">
                    {child.name.charAt(0)}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{child.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {child.vehicle} - {child.route}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Info Card */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Vehicle</span>
            <span className="text-sm font-semibold text-foreground">{selectedChild.vehicle}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">Driver</span>
            <span className="text-sm font-semibold text-foreground">{selectedChild.driver}</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-56 w-full bg-muted/50">
          {/* Map grid */}
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapGrid)" />
          </svg>

          {/* Route polyline */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 220" preserveAspectRatio="none">
            <path
              d="M 40 190 Q 80 160 130 140 Q 180 120 230 90 Q 280 60 350 30"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeDasharray="8 4"
              opacity="0.3"
            />
            <path
              d="M 40 190 Q 80 160 130 140 Q 180 120 200 105"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
            />
          </svg>

          {/* Start */}
          <div className="absolute bottom-6 left-6 flex h-6 w-6 items-center justify-center rounded-full bg-success ring-4 ring-success/20">
            <div className="h-2 w-2 rounded-full bg-success-foreground" />
          </div>

          {/* Vehicle Marker */}
          <div className="absolute left-[48%] top-[42%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-4 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg ring-4 ring-primary/20">
                <Bus className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="absolute right-8 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-destructive ring-4 ring-destructive/20">
            <MapPin className="h-3 w-3 text-destructive-foreground" />
          </div>
        </div>

        {/* ETA Banner */}
        <div className="flex items-center justify-between bg-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-semibold text-primary-foreground">
              Arriving in 6 mins
            </span>
          </div>
          {/* Animated countdown circle */}
          <div className="relative flex h-10 w-10 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="white" strokeWidth="3"
                strokeDasharray="94.2" strokeDashoffset="31.4"
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="text-xs font-bold text-primary-foreground">6m</span>
          </div>
        </div>
      </div>

      {/* Trip Timeline */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trip Timeline
        </h3>
        <div className="flex flex-col">
          {timelineStops.map((stop, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {stop.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : stop.status === "current" ? (
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/20" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                {i < timelineStops.length - 1 && (
                  <div
                    className={cn(
                      "my-1 h-6 w-0.5",
                      stop.status === "completed" ? "bg-success/40" : "bg-border"
                    )}
                  />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between pb-2">
                <span
                  className={cn(
                    "text-sm",
                    stop.status === "current"
                      ? "font-semibold text-primary"
                      : stop.status === "completed"
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {stop.name}
                </span>
                <span className="text-xs text-muted-foreground">{stop.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Info Cards */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="text-sm font-semibold text-foreground">42 km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Stop</p>
              <p className="text-sm font-semibold text-foreground">MG Road</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-semibold text-foreground">8:42 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Navigation className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-semibold text-foreground">In Transit</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Prediction (Premium) */}
      {isPremium && (
        <div className="mx-4 mt-4 rounded-2xl border border-gold/30 bg-gold/5 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gold uppercase tracking-wider">AI Prediction</span>
          </div>
          <p className="text-sm text-foreground">
            Based on current traffic patterns, your child is likely to arrive
            <span className="font-semibold text-success"> 2 mins early</span> today.
          </p>
        </div>
      )}

      {/* SOS Button */}
      <button
        onClick={() => setShowSosConfirm(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-destructive shadow-lg shadow-destructive/30 transition-transform active:scale-95"
        aria-label="SOS Emergency"
      >
        <AlertTriangle className="h-6 w-6 text-destructive-foreground" strokeWidth={2.5} />
      </button>

      {/* SOS Confirmation Sheet */}
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
                This will immediately alert the school administration, driver, and local authorities. Are you sure?
              </p>
              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSosConfirm(false)}
                  className="h-12 flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowSosConfirm(false)
                    onSOS?.()
                  }}
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
