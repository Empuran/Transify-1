"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import {
  Bus, Car, Truck, Bike,
  MapPin, Play, Square,
  AlertTriangle, Clock, CheckCircle2,
  Circle, Navigation, Users, Route, LogOut,
  ChevronDown, Activity, Phone, Bell, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import { useLiveTracking } from "@/hooks/use-live-tracking"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { LiveMap } from "./live-map"

type TripState = "not-started" | "in-progress" | "completed"

// ── Vehicle Icon by type ─────────────────────────────────────────────────────
function VehicleMapIcon({ type, animate }: { type: string; animate?: boolean }) {
  const t = (type || "").toLowerCase()
  const size = "h-8 w-8"
  const cls = cn(size, "drop-shadow-lg", animate && "animate-bounce")

  if (t.includes("car")) return (
    <svg className={cls} viewBox="0 0 48 32" fill="none">
      <rect x="4" y="14" width="40" height="14" rx="3" fill="#3b82f6" />
      <rect x="10" y="6" width="28" height="12" rx="3" fill="#60a5fa" />
      <rect x="12" y="8" width="8" height="7" rx="1" fill="#bfdbfe" />
      <rect x="28" y="8" width="8" height="7" rx="1" fill="#bfdbfe" />
      <circle cx="12" cy="28" r="4" fill="#1e293b" /><circle cx="36" cy="28" r="4" fill="#1e293b" />
      <circle cx="12" cy="28" r="2" fill="#64748b" /><circle cx="36" cy="28" r="2" fill="#64748b" />
    </svg>
  )
  if (t.includes("bike") || t.includes("scooter") || t.includes("motorbike")) return (
    <svg className={cls} viewBox="0 0 48 36" fill="none">
      <circle cx="10" cy="26" r="8" stroke="#3b82f6" strokeWidth="3" fill="none" />
      <circle cx="38" cy="26" r="8" stroke="#3b82f6" strokeWidth="3" fill="none" />
      <path d="M 10 26 L 24 14 L 38 26" stroke="#3b82f6" strokeWidth="3" fill="none" />
      <path d="M 24 14 L 28 6" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="18" y="12" width="8" height="5" rx="2" fill="#60a5fa" />
    </svg>
  )
  if (t.includes("truck") || t.includes("van")) return (
    <svg className={cls} viewBox="0 0 56 32" fill="none">
      <rect x="2" y="10" width="52" height="18" rx="2" fill="#3b82f6" />
      <rect x="2" y="10" width="16" height="18" rx="2" fill="#2563eb" />
      <rect x="4" y="12" width="12" height="9" rx="1" fill="#bfdbfe" />
      <circle cx="12" cy="30" r="4" fill="#1e293b" /><circle cx="44" cy="30" r="4" fill="#1e293b" />
      <circle cx="12" cy="30" r="2" fill="#64748b" /><circle cx="44" cy="30" r="2" fill="#64748b" />
    </svg>
  )
  // Default: bus
  return (
    <svg className={cls} viewBox="0 0 56 36" fill="none">
      <rect x="2" y="4" width="52" height="26" rx="4" fill="#3b82f6" />
      <rect x="6" y="8" width="10" height="9" rx="1" fill="#bfdbfe" />
      <rect x="20" y="8" width="10" height="9" rx="1" fill="#bfdbfe" />
      <rect x="34" y="8" width="10" height="9" rx="1" fill="#bfdbfe" />
      <rect x="2" y="22" width="52" height="4" rx="0" fill="#2563eb" />
      <circle cx="12" cy="32" r="4" fill="#1e293b" /><circle cx="44" cy="32" r="4" fill="#1e293b" />
      <circle cx="12" cy="32" r="2" fill="#64748b" /><circle cx="44" cy="32" r="2" fill="#64748b" />
    </svg>
  )
}

export function DriverDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <DriverDashboardContent />
    </Suspense>
  )
}

// ── Geofence radius (metres) ─────────────────────────────────────────────────
const GEOFENCE_RADIUS_M = 80

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Delay reasons ─────────────────────────────────────────────────────────────
const DELAY_REASONS = ["Heavy Traffic", "Road Construction", "Vehicle Issue", "Weather", "Breakdown", "Accident Nearby", "Other"]

function DriverDashboardContent() {
  const { profile, logoutMock } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [orgCode, setOrgCode] = useState<string>("")
  useEffect(() => {
    const urlOrgCode = searchParams.get("orgCode")
    const storedOrgCode = sessionStorage.getItem("transify_last_org_code")
    if (urlOrgCode) { setOrgCode(urlOrgCode); sessionStorage.setItem("transify_last_org_code", urlOrgCode) }
    else if (storedOrgCode) setOrgCode(storedOrgCode)
  }, [searchParams])

  const [resolvedOrgId, setResolvedOrgId] = useState<string>("")
  const [isResolvingOrg, setIsResolvingOrg] = useState(false)
  const resolveOrg = useCallback(async () => {
    if (!orgCode) return
    setIsResolvingOrg(true)
    try {
      const res = await fetch(`/api/org/lookup?code=${encodeURIComponent(orgCode.trim().toUpperCase())}`)
      const data = await res.json()
      const foundId = data.id || data.organization_id || data._id
      setResolvedOrgId(foundId || orgCode)
    } catch { setResolvedOrgId(orgCode) }
    finally { setIsResolvingOrg(false) }
  }, [orgCode])
  useEffect(() => { resolveOrg() }, [resolveOrg])

  const [tripState, setTripState] = useState<TripState>("not-started")
  const [showDelayReport, setShowDelayReport] = useState(false)
  const [showSosConfirm, setShowSosConfirm] = useState(false)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [showVehiclePicker, setShowVehiclePicker] = useState(false)
  const [realName, setRealName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [isVerifying, setIsVerifying] = useState(true)
  const [currentRoute, setCurrentRoute] = useState<any>(null)
  const [dynamicStops, setDynamicStops] = useState<any[]>([])
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [isAtStop, setIsAtStop] = useState(false)
  // Track if we already auto-advanced to avoid double-trigger
  const lastAutoStopRef = useRef(-1)

  const normalize = (p: string) => p?.replace(/\D/g, '').slice(-10)

  // 1. Fetch driver info
  const fetchDriverInfo = useCallback(async () => {
    if (!resolvedOrgId || !profile?.phone) { if (resolvedOrgId || profile?.phone) setIsVerifying(false); return }
    if (!realName) setIsVerifying(true)
    try {
      const res = await fetch(`/api/drivers/list?organization_id=${resolvedOrgId}`)
      const data = await res.json()
      if (data.drivers) {
        const userPhoneDigits = normalize(profile.phone)
        const currentDriver = data.drivers.find((d: any) => normalize(d.phone) === userPhoneDigits || d.phone === profile.phone)
        if (currentDriver) {
          setRealName(currentDriver.name)
          setDriverPhone(currentDriver.phone || profile.phone || "")
          const targetVehId = currentDriver.vehicle_id || currentDriver.vehicle
          if (targetVehId && targetVehId !== "Unassigned" && vehicles.length > 0) {
            const assignedVeh = vehicles.find((v: any) => v.id === targetVehId || v.plate_number === targetVehId || normalize(v.plate_number) === normalize(targetVehId))
            if (assignedVeh && (!selectedVehicle || selectedVehicle.id !== assignedVeh.id)) setSelectedVehicle(assignedVeh)
          }
        }
      }
    } catch (e) { console.error("Failed to fetch driver info:", e) }
    finally { setIsVerifying(false) }
  }, [resolvedOrgId, profile?.phone, vehicles, realName, selectedVehicle])

  // 2. Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    if (!resolvedOrgId) return
    try {
      const res = await fetch(`/api/vehicles/list?organization_id=${resolvedOrgId}`)
      const data = await res.json()
      if (data.vehicles) {
        setVehicles(data.vehicles)
        if (data.vehicles.length === 1 && !selectedVehicle) setSelectedVehicle(data.vehicles[0])
      }
    } catch (e) { console.error("Failed to fetch vehicles:", e) }
  }, [resolvedOrgId, selectedVehicle])

  // 3. Real-time route listener (Firestore onSnapshot)
  useEffect(() => {
    if (!resolvedOrgId || !selectedVehicle) return
    const ids = [...new Set([selectedVehicle.id, selectedVehicle.plate_number].filter(Boolean))]
    const q = query(collection(db, "routes"), where("organization_id", "==", resolvedOrgId), where("vehicle_id", "in", ids))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routeDoc = snapshot.docs[0]
      if (routeDoc) {
        const route = routeDoc.data()
        setCurrentRoute({ id: routeDoc.id, ...route })
        const mappedStops = [
          { name: route.start_point, lat: null, lng: null },
          ...(route.stops || []).map((s: string) => ({ name: s, lat: null, lng: null })),
          { name: route.end_point, lat: null, lng: null }
        ]
        setDynamicStops(mappedStops)
      }
    }, (err) => console.error("Route listener error:", err))
    return () => unsubscribe()
  }, [resolvedOrgId, selectedVehicle?.id, selectedVehicle?.plate_number])

  useEffect(() => { if (resolvedOrgId) fetchVehicles() }, [resolvedOrgId, fetchVehicles])
  useEffect(() => { if (vehicles.length > 0 || (resolvedOrgId && profile?.phone)) fetchDriverInfo() }, [vehicles.length, fetchDriverInfo, resolvedOrgId, profile?.phone])

  // 4. Live tracking
  const { location, error: gpsError } = useLiveTracking(
    selectedVehicle?.id || selectedVehicle?.plate_number || "",
    tripState === "in-progress",
    resolvedOrgId
  )

  const currentStops = dynamicStops.map((s, i) => ({
    ...s,
    status: (i < currentStopIndex ? "completed" : i === currentStopIndex ? "current" : "upcoming") as "completed" | "current" | "upcoming"
  }))
  const completedStops = currentStopIndex
  const totalStops = currentStops.length

  // ── Notify admin helper ──────────────────────────────────────────────────
  const notifyAdmin = useCallback((type: string, title: string, message: string, extra?: any) => {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: resolvedOrgId,
        type, title, message,
        metadata: {
          driver_name: realName,
          driver_phone: driverPhone || profile?.phone,
          vehicle_id: selectedVehicle?.plate_number || selectedVehicle?.id,
          vehicle_type: selectedVehicle?.type,
          route_name: currentRoute?.route_name,
          ...extra
        }
      })
    }).catch(e => console.error("Notify fail:", e))
  }, [resolvedOrgId, realName, driverPhone, profile?.phone, selectedVehicle, currentRoute])

  // GPS warmup — silently pre-acquire fix when component mounts so trip start is instant
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => { /* warm up GPS chip — discard result */ },
      () => { /* ignore warmup error */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const handleStartTrip = () => {
    if (!selectedVehicle) { alert("Please select a vehicle before starting the trip."); setShowVehiclePicker(true); return }
    setTripState("in-progress")
    setCurrentStopIndex(0)
    setIsAtStop(true)
    lastAutoStopRef.current = -1
    notifyAdmin("trip_start", "🚌 Trip Started",
      `Vehicle ${selectedVehicle?.plate_number} started the trip on route ${currentRoute?.route_name || "—"}.`)
  }

  const handleEndTrip = () => {
    setTripState("completed")
    notifyAdmin("trip_end", "🏁 Trip Ended",
      `Vehicle ${selectedVehicle?.plate_number} completed the trip on route ${currentRoute?.route_name || "—"}.`)
  }

  // ── Auto-advance stop on geofence ────────────────────────────────────────
  // (Only works when stop geocoords are available; otherwise manual fallback remains)
  // For now stops don't have lat/lng from DB so we don't auto-advance automatically.
  // When the driver physically arrives, they can tap "Arrived" (manual fallback).
  // The "Depart Stop" button is removed — progress is: Arrived → auto move to next stop.
  const handleArrived = () => {
    if (currentStopIndex < totalStops - 1) {
      const nextIdx = currentStopIndex + 1
      setCurrentStopIndex(nextIdx)
      setIsAtStop(true)
      notifyAdmin("stop_reached", "📍 Stop Reached",
        `Vehicle ${selectedVehicle?.plate_number} arrived at ${dynamicStops[nextIdx]?.name}.`)
    } else {
      handleEndTrip()
    }
  }

  const userName = isVerifying ? "..." : (realName || "Not Found")
  const initials = userName === "..." ? "??" : userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const vehicleType = selectedVehicle?.type || "bus"

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-primary px-5 pb-5 pt-[env(safe-area-inset-top)] border-b border-white/5 shadow-md">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-primary-foreground/70">{isVerifying ? "Please wait" : "Hello"}</p>
            <h1 className="text-lg font-bold text-primary-foreground flex items-center gap-2">
              {userName}
              {isVerifying && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              {realName && !isVerifying && <CheckCircle2 className="h-4 w-4 text-white fill-white/20" />}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Delay button always accessible when trip is in progress */}
            {tripState === "in-progress" && (
              <button
                onClick={() => setShowDelayReport(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-warning/20 border border-warning/30 px-2.5 text-[11px] font-semibold text-warning transition-colors active:bg-warning/30"
              >
                <Clock className="h-3.5 w-3.5" /> Delay
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <span className="text-sm font-bold text-primary-foreground">{initials}</span>
            </div>
          </div>
        </div>

        {/* Vehicle & Route */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowVehiclePicker(!showVehiclePicker)}
            className="flex flex-1 items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2.5 text-left transition-colors active:bg-primary-foreground/20"
          >
            <Bus className="h-4 w-4 text-primary-foreground/80" />
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wider font-bold">Vehicle</span>
              <span className="text-xs font-semibold text-primary-foreground truncate">{selectedVehicle?.plate_number || "Select Vehicle"}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-primary-foreground/40 transition-transform", showVehiclePicker && "rotate-180")} />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-2.5">
            <Route className="h-4 w-4 text-primary-foreground/80" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wider font-bold">Route</span>
              <span className="text-xs font-semibold text-primary-foreground">{currentRoute?.route_name || "No route"}</span>
            </div>
          </div>
        </div>

        {/* Vehicle Picker */}
        {showVehiclePicker && (
          <div className="mt-2 flex flex-col gap-1 overflow-hidden rounded-xl bg-primary-foreground/5 p-1 border border-primary-foreground/10 animate-in fade-in slide-in-from-top-2 duration-200">
            {vehicles.map((v) => (
              <button key={v.id} onClick={() => { setSelectedVehicle(v); setShowVehiclePicker(false) }}
                className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  selectedVehicle?.id === v.id ? "bg-primary-foreground text-primary" : "text-primary-foreground/80 hover:bg-primary-foreground/10"
                )}>
                <span>{v.plate_number}</span>
                <span className="text-[10px] opacity-60 capitalize">{v.type}</span>
              </button>
            ))}
            {vehicles.length === 0 && <p className="px-3 py-2 text-xs text-primary-foreground/40 italic">No vehicles found</p>}
          </div>
        )}
      </div>

      {/* ── GPS Error ────────────────────────────────────────────────── */}
      {gpsError && (
        <div className="mx-4 mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {gpsError}
        </div>
      )}

      {/* ── GPS Active pill (compact, no lat/lng spam) ────────────────── */}
      {location && tripState === "in-progress" && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/20">
          <div className="h-2 w-2 shrink-0 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">GPS Active</span>
          {location.speed != null && (
            <span className="ml-auto text-xs text-success/70 font-mono">{(location.speed * 3.6).toFixed(0)} km/h</span>
          )}
        </div>
      )}

      {/* ── Trip Status Card ─────────────────────────────────────────── */}
      <div className="mx-4 mt-3 rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Trip Status</span>
            <StatusBadge status={tripState === "in-progress" ? "active" : tripState === "completed" ? "completed" : "upcoming"} size="md" />
          </div>
          <span className="text-xs text-muted-foreground">{completedStops}/{totalStops} stops</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {tripState === "not-started" ? (
            <Button onClick={handleStartTrip} className="col-span-2 h-12 rounded-xl bg-success text-success-foreground font-semibold hover:bg-success/90">
              <Play className="mr-2 h-4 w-4" /> Start Trip
            </Button>
          ) : tripState === "in-progress" ? (
            <>
              {/* Arrived at next stop — replaces Depart Stop */}
              <Button
                onClick={handleArrived}
                className="h-12 rounded-xl font-semibold bg-primary text-primary-foreground"
                disabled={!isAtStop && currentStopIndex === 0}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {currentStopIndex === totalStops - 1 ? "Finish Route" : "Next Stop"}
              </Button>
              <Button
                onClick={handleEndTrip}
                variant="outline"
                className="h-12 rounded-xl font-semibold border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <Square className="mr-2 h-4 w-4" /> End Trip
              </Button>
            </>
          ) : (
            <Button onClick={() => { setTripState("not-started"); setCurrentStopIndex(0); setIsAtStop(false) }}
              className="col-span-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold">
              Start New Trip
            </Button>
          )}
        </div>

        {tripState === "in-progress" && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/5 py-2 px-3 border border-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">
              Currently at: {currentStops[currentStopIndex]?.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Map View — Real Google Maps with live tracking ────────────── */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-64 w-full">
          <LiveMap organizationId={resolvedOrgId} />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-card/50">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Live Route Map</span>
          <div className="flex items-center gap-1.5">
            <VehicleMapIcon type={vehicleType} />
            <span className="text-[10px] text-muted-foreground capitalize">{vehicleType}</span>
          </div>
        </div>
      </div>

      {/* ── Route Stops List ─────────────────────────────────────────── */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Route Stops</h3>
        <div className="flex flex-col">
          {currentStops.map((stop, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {stop.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : stop.status === "current" ? (
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                {i < currentStops.length - 1 && (
                  <div className={cn("my-1 h-6 w-0.5", stop.status === "completed" ? "bg-success/40" : "bg-border")} />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between pb-2">
                <span className={cn("text-sm",
                  stop.status === "current" ? "font-semibold text-primary" :
                    stop.status === "completed" ? "text-foreground" : "text-muted-foreground"
                )}>{stop.name}</span>
                <span className="text-[10px] text-muted-foreground">{stop.status === "completed" ? "✓" : stop.status === "current" ? "Here" : ""}</span>
              </div>
            </div>
          ))}
          {currentStops.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">No route assigned yet</p>
          )}
        </div>
      </div>

      {/* ── SOS Button ───────────────────────────────────────────────── */}
      <div className="mx-4 mt-4">
        <Button onClick={() => setShowSosConfirm(true)} variant="outline"
          className="h-14 w-full rounded-xl border-2 border-destructive/30 text-destructive font-bold text-base hover:bg-destructive/5">
          <AlertTriangle className="mr-2 h-5 w-5" /> Emergency SOS
        </Button>
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────────── */}
      <div className="mx-4 mt-4">
        <button onClick={() => { logoutMock(); router.push("/category") }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 transition-colors active:bg-destructive/10">
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Sign Out</span>
        </button>
      </div>

      {/* ── Delay Report Bottom Sheet ─────────────────────────────────── */}
      {showDelayReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowDelayReport(false)}>
          <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Report Delay</h3>
                <p className="text-xs text-muted-foreground">Select the reason — admin will be notified</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {DELAY_REASONS.map((reason) => (
                <button key={reason}
                  onClick={() => {
                    setShowDelayReport(false)
                    notifyAdmin("delay", `⚠️ Delay: ${reason}`,
                      `Driver ${realName} (${driverPhone || profile?.phone}) reported a delay on route ${currentRoute?.route_name || "—"}: ${reason}`,
                      { reason })
                  }}
                  className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors active:bg-accent hover:bg-muted">
                  {reason}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setShowDelayReport(false)} className="mt-4 h-12 w-full rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* ── SOS Confirmation ─────────────────────────────────────────── */}
      {showSosConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-4 ring-destructive/20 animate-pulse">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Emergency SOS</h3>
              <div className="w-full rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                <div className="flex justify-between"><span className="opacity-60">Driver</span><span className="font-semibold">{realName}</span></div>
                <div className="flex justify-between"><span className="opacity-60">Phone</span><span className="font-semibold">{driverPhone || profile?.phone}</span></div>
                <div className="flex justify-between"><span className="opacity-60">Vehicle</span><span className="font-semibold">{selectedVehicle?.plate_number || "—"}</span></div>
                <div className="flex justify-between"><span className="opacity-60">Route</span><span className="font-semibold">{currentRoute?.route_name || "—"}</span></div>
              </div>
              <p className="text-center text-xs text-muted-foreground">This will immediately alert the admin with your location and vehicle details.</p>
              <div className="flex w-full gap-3">
                <Button variant="outline" onClick={() => setShowSosConfirm(false)} className="h-12 flex-1 rounded-xl">Cancel</Button>
                <Button
                  onClick={() => {
                    setShowSosConfirm(false)
                    notifyAdmin("sos", "🆘 SOS ALERT!",
                      `URGENT: Driver ${realName} (${driverPhone || profile?.phone}) triggered an SOS in vehicle ${selectedVehicle?.plate_number}!`,
                      { urgent: true, lat: location?.latitude, lng: location?.longitude })
                  }}
                  className="h-12 flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
                  SEND SOS
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
