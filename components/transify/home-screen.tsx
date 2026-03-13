"use client"

import { useState, useEffect } from "react"
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
  Sparkles,
  Star,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react"
import { StatusBadge } from "./status-badge"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, runTransaction, query, where, onSnapshot, setDoc, getDocs } from "firebase/firestore"


// ── Child ────────────────────────────────────────────────────────────────────
interface ChildData {
  id: string
  name: string
  school: string
  vehicle: string
  driver: string
  route: string
  routeDocId?: string        // Firestore document ID of the assigned route
  rawVehicleId?: string      // Raw vehicle doc ID for the live listener
  status: "on-time" | "delayed" | "emergency" | "active"
}

// Resolves raw Firestore IDs to human-readable vehicle plates, drivers, and route names
const resolveStudentData = async (rawStudents: Array<{
  id: string, name: string, school: string, orgId: string,
  vehicleId: string, rawRoute: string, routeId?: string
}>): Promise<ChildData[]> => {
  const resolved = await Promise.all(
    rawStudents.map(async (s) => {
      let vehiclePlate = s.vehicleId || "Not Assigned"
      let driverName = "Not Assigned"
      let routeName = s.rawRoute
      let routeDocId: string | undefined = s.routeId

      if (s.orgId) {
          try {
              // Fetch from admin API to bypass client Firestore rules
              const [vRes, rRes] = await Promise.all([
                  s.vehicleId && s.vehicleId !== "Unassigned" ? fetch(`/api/vehicles/list?organization_id=${s.orgId}`).then(r => r.json()) : Promise.resolve(null),
                  s.rawRoute && s.rawRoute !== "Unassigned" ? fetch(`/api/routes/list?organization_id=${s.orgId}`).then(r => r.json()) : Promise.resolve(null)
              ])

              if (vRes?.vehicles) {
                  const vMatch = vRes.vehicles.find((v: any) => v.id === s.vehicleId || v.plate_number === s.vehicleId)
                  if (vMatch) {
                      vehiclePlate = vMatch.plate_number || vMatch.registration_number || s.vehicleId
                      driverName = vMatch.driver_name || vMatch.assigned_driver || "Not Assigned"
                  }
              }

              if (rRes?.routes) {
                  const rMatch = rRes.routes.find((r: any) => r.id === s.routeId || r.route_name === s.rawRoute)
                  if (rMatch) {
                      routeDocId = rMatch.id
                      routeName = rMatch.route_name || s.rawRoute
                  }
              }
          } catch (err) {
              console.error("Resolve error:", err)
          }
      }

      return {
        id: s.id,
        name: s.name,
        school: s.school,
        vehicle: vehiclePlate,
        driver: driverName,
        route: routeName,
        routeDocId,
        rawVehicleId: s.vehicleId,
        orgId: s.orgId,
        status: "on-time" as const,
      } as ChildData & { orgId: string }
    })
  )
  return resolved
}


interface ParentHomeScreenProps {
  isPremium?: boolean
  onUpgrade?: () => void
}

export function ParentHomeScreen({ isPremium = false, onUpgrade }: ParentHomeScreenProps) {
  const { profile } = useAuth()
  const [students, setStudents] = useState<ChildData[]>([])
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null)
  const [showChildPicker, setShowChildPicker] = useState(false)

  const userName = profile?.globalName || "User"
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live route stops for the selected child
  type RouteStop = { name: string; time: string; status: "completed" | "current" | "upcoming" }
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])

  // Live vehicle state — updated by onSnapshot
  const [vehicleData, setVehicleData] = useState<{
    speed: number | null
    status: string
    currentStop: string
    nextStop: string
    etaMinutes: number | null
    lat: number | null
    lng: number | null
  }>({
    speed: null, status: "", currentStop: "", nextStop: "", etaMinutes: null, lat: null, lng: null
  })

  // Derived from Firestore student doc — vehicle_id for the live listener
  const [liveVehicleId, setLiveVehicleId] = useState<string>("")
  const [rawStopsWithCoords, setRawStopsWithCoords] = useState<any[]>([])

  // ── Phone normalization helper ──────────────────────────────────────────────
  const phoneVariants = (phone: string): string[] => {
    const clean = phone.replace(/\s+/g, "").replace(/-/g, "")
    const digits10 = clean.replace(/^\+91/, "").replace(/^0/, "").slice(-10)
    if (digits10.length !== 10) return [clean]
    return [
      `+91${digits10}`,
      `+91 ${digits10}`,
      `0${digits10}`,
      digits10,
    ]
  }

  // Fetch real students from Firestore — tries multiple phone formats for resilience
  useEffect(() => {
    if (!profile?.phone) return

    const variants = phoneVariants(profile.phone)
    let cancelled = false
    const unsubscribers: Array<() => void> = []
    const seenIds = new Set<string>()
    let combinedRaw: Array<{ id: string; name: string; school: string; orgId: string; vehicleId: string; rawRoute: string; routeId: string }> = []

    const processSnapshot = async () => {
      if (cancelled) return
      const enriched = await resolveStudentData(combinedRaw)
      if (cancelled) return
      setStudents(enriched)
      setSelectedChild(prev =>
        prev ? (enriched.find(s => s.id === prev.id) || enriched[0] || null) : (enriched[0] || null)
      )
    }

    // Subscribe to each phone variant
    variants.forEach(variant => {
      const q = query(collection(db, "students"), where("parent_phone", "==", variant))
      const unsub = onSnapshot(q, snapshot => {
        let changed = false
        snapshot.docs.forEach(docSnap => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id)
            const data = docSnap.data()
            combinedRaw.push({
              id: docSnap.id,
              name: data.name || "Unknown",
              school: data.organization || data.school || "School",
              orgId: data.organization_id || "org_1",
              vehicleId: data.vehicle_id || "",
              rawRoute: data.route || "Unassigned",
              routeId: data.route_id || "",
            })
            changed = true
          }
        })
        if (changed) processSnapshot()
      }, err => console.warn("Student query variant failed:", variant, err))
      unsubscribers.push(unsub)
    })

    // Initial load after 1.5s even if no results — clears loading state
    const timer = setTimeout(() => {
      if (!cancelled && combinedRaw.length === 0) {
        setStudents([])
        setSelectedChild(null)
      }
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribers.forEach(u => u())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.phone])

  // ── Haversine helper ──────────────────────────────────────────────────────
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // Fetch route stops AND vehicle_id when selected child changes
  useEffect(() => {
    if (!selectedChild?.routeDocId) {
      setRouteStops([])
      setRawStopsWithCoords([])
      return
    }
    let cancelled = false

    // Use rawVehicleId already stored on selectedChild from resolveStudentData
    setLiveVehicleId(selectedChild.rawVehicleId || "")

    // Fetch route from backend API to bypass client permission issues
    const orgId = (selectedChild as any).orgId || "org_1"
    fetch(`/api/routes/list?organization_id=${orgId}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled || !data.routes) return
        const rData = data.routes.find((r: any) => r.id === selectedChild.routeDocId || r.route_name === selectedChild.route)
        if (!rData) return

        const rawStops: any[] = rData.stops || []
        const startPoint = rData.start_point || ""
        const endPoint = rData.end_point || ""

        const allStops = [
          ...(startPoint ? [{ name: startPoint.split(",")[0], lat: 0, lng: 0 }] : []),
          ...rawStops.map((s: any) => ({
            name: (s.name || s || "Stop").split(",")[0],
            lat: s.lat || 0,
            lng: s.lng || 0
          })),
          ...(endPoint && endPoint !== startPoint ? [{ name: endPoint.split(",")[0], lat: 0, lng: 0 }] : []),
        ]

        setRawStopsWithCoords(allStops)

        // Initial render — will be overridden by vehicle listener
        const mapped: RouteStop[] = allStops.map((s: any, idx: number) => {
          const rawName = s.name || s.stop_name || `Stop ${idx + 1}`
          const shortName = rawName.includes(",") ? rawName.split(",")[0].trim() : rawName
          return {
            name: shortName,
            time: s.time || s.eta || "",
            status: idx === 0 ? "completed" : idx === 1 ? "current" : "upcoming",
          }
        })
        setRouteStops(mapped)
      }).catch(err => {
        console.error("Stops fetch error:", err)
        if (!cancelled) setRouteStops([])
      })

    return () => { cancelled = true }
  }, [selectedChild?.routeDocId, selectedChild?.id, selectedChild?.rawVehicleId, selectedChild?.route])

  // ── Live vehicle listener: updates UI + writes ETA alerts ─────────────────
  useEffect(() => {
    if (!liveVehicleId || !selectedChild) return
    const phone = profile?.phone || ""

    const unsub = onSnapshot(doc(db, "vehicles", liveVehicleId), async (vSnap) => {
      if (!vSnap.exists()) return
      const vData = vSnap.data()
      const vLat: number | null = vData.lat || vData.latitude || vData.current_lat || null
      const vLng: number | null = vData.lng || vData.longitude || vData.current_lng || null
      const rawSpeed: number = vData.speed ?? null  // m/s from GPS, or km/h if driver sets it
      // Normalise speed: if GPS provides m/s (usually <20 for buses), convert to km/h
      const speedKmh: number | null = rawSpeed !== null
        ? (rawSpeed < 50 ? Math.round(rawSpeed * 3.6) : Math.round(rawSpeed))  // <50 = m/s
        : null
      const status = (vData.status || "").toLowerCase()
      const vehicleCurrentStop: string = vData.current_stop || ""

      // ── Update route stop progress from vehicle's current_stop ────────────
      if (rawStopsWithCoords.length > 0) {
        const shortName = (s: any, i: number) => {
          const n = s.name || s.stop_name || `Stop ${i + 1}`
          return n.includes(",") ? n.split(",")[0].trim() : n
        }
        // Find which idx the vehicle is at by matching current_stop name
        let currentIdx = -1
        if (vehicleCurrentStop) {
          currentIdx = rawStopsWithCoords.findIndex((s, i) => {
            const sn = shortName(s, i).toLowerCase()
            return vehicleCurrentStop.toLowerCase().includes(sn) || sn.includes(vehicleCurrentStop.toLowerCase())
          })
        }
        const mapped: RouteStop[] = rawStopsWithCoords.map((s: any, idx: number) => ({
          name: shortName(s, idx),
          time: s.time || s.eta || "",
          status: currentIdx < 0
            ? (idx === 0 ? "completed" : idx === 1 ? "current" : "upcoming")
            : idx < currentIdx ? "completed"
            : idx === currentIdx ? "current"
            : "upcoming",
        }))
        setRouteStops(mapped)
      }

      // ── Determine next stop ───────────────────────────────────────────────
      const currentRouteStopNames = rawStopsWithCoords.map((s: any, i: number) => {
        const n = s.name || s.stop_name || `Stop ${i + 1}`
        return n.includes(",") ? n.split(",")[0].trim() : n
      })
      let currentIdx2 = vehicleCurrentStop
        ? currentRouteStopNames.findIndex(n => vehicleCurrentStop.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(vehicleCurrentStop.toLowerCase()))
        : -1
      const nextStopName = currentIdx2 >= 0 && currentIdx2 < currentRouteStopNames.length - 1
        ? currentRouteStopNames[currentIdx2 + 1]
        : (currentRouteStopNames[1] || "")

      // ── ETA to next stop ──────────────────────────────────────────────────
      let etaMinutes: number | null = null
      if (vLat && vLng && speedKmh && speedKmh > 0) {
        const nextStopObj = rawStopsWithCoords[currentIdx2 >= 0 ? currentIdx2 + 1 : 1]
        if (nextStopObj?.lat && nextStopObj?.lng) {
          const dist = haversineKm(vLat, vLng, nextStopObj.lat, nextStopObj.lng)
          etaMinutes = Math.max(1, Math.round((dist / speedKmh) * 60))
        }
      }

      setVehicleData({
        speed: speedKmh,
        status,
        currentStop: vehicleCurrentStop,
        nextStop: nextStopName,
        etaMinutes,
        lat: vLat,
        lng: vLng,
      })

      // ── ETA + trip_started alerts ─────────────────────────────────────────
      if (phone) {
        if (["on_duty", "active", "moving"].includes(status)) {
          const startKey = `${selectedChild.id}_trip_started_${new Date().toDateString()}`
          getDoc(doc(db, "alerts", startKey)).then(existing => {
            if (!existing.exists()) {
              setDoc(doc(db, "alerts", startKey), {
                type: "trip_started",
                student_id: selectedChild.id,
                student_name: selectedChild.name,
                parent_phone: phone,
                title: "Trip Started",
                description: `${selectedChild.name}'s bus (${selectedChild.vehicle}) has started the route.`,
                created_at: serverTimestamp(),
                read: false,
              }).catch(() => {})
            }
          }).catch(() => {})
        }

        // Boarding point arrival alert
        getDoc(doc(db, "students", selectedChild.id)).then(sSnap => {
          if (!sSnap.exists()) return
          const bp = sSnap.data().boarding_point as { name: string; lat: number; lng: number } | null
          if (!bp?.lat || !vLat || !vLng) return
          const dist = haversineKm(vLat, vLng, bp.lat, bp.lng)
          if (dist <= 2) {
            const etaMins = speedKmh && speedKmh > 0 ? Math.max(1, Math.round((dist / speedKmh) * 60)) : null
            if (!etaMins) return
            const alertKey = `${selectedChild.id}_arriving`
            setDoc(doc(db, "alerts", alertKey), {
              type: etaMins <= 2 ? "arriving" : "arriving_soon",
              student_id: selectedChild.id,
              student_name: selectedChild.name,
              parent_phone: phone,
              title: etaMins <= 2 ? "Bus Arriving Now!" : `Bus in ~${etaMins} min`,
              description: `${selectedChild.name}'s bus is about ${etaMins} min away from ${bp.name}. Get ready!`,
              eta_minutes: etaMins,
              boarding_stop: bp.name,
              created_at: serverTimestamp(),
              read: false,
            }, { merge: true }).catch(() => {})
          }
        }).catch(() => {})
      }
    })

    return unsub
  }, [liveVehicleId, selectedChild?.id, rawStopsWithCoords, profile?.phone])

  const handleSubmitRating = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    try {
      // In a real app, we'd fetch the actual driver_id associated with this vehicle
      // For now, we'll try to find a driver by name or just save it with the driver name
      // and look for matches in the drivers collection if possible.
      
      const ratingData = {
        student_id: profile?.id || "unknown",
        student_name: userName,
        driver_name: selectedChild?.driver || "Unknown",
        vehicle_id: selectedChild?.vehicle || "Unknown",
        rating: rating,
        comment: comment,
        timestamp: serverTimestamp(),
        organization_id: profile?.activeOrgId || "default"
      }

      await addDoc(collection(db, "ratings"), ratingData)
      
      // 3. Update driver's overall rating using a transaction
      // For demo, we use a slug of the driver name as the ID if driverId isn't present
      const driverName = selectedChild?.driver || ""
      const driverId = (selectedChild as any)?.driverId || driverName.toLowerCase().replace(/\s/g, "_")
      if (!driverId) return
      
      const driverRef = doc(db, "drivers", driverId)
      
      try {
        await runTransaction(db, async (transaction) => {
          const driverDoc = await transaction.get(driverRef)
          if (driverDoc.exists()) {
            const data = driverDoc.data()
            const currentTotal = data.total_ratings || 0
            const currentAvg = data.avg_rating || 0
            
            const newTotal = currentTotal + 1
            const newAvg = ((currentAvg * currentTotal) + rating) / newTotal
            
            transaction.update(driverRef, {
              avg_rating: newAvg,
              total_ratings: newTotal
            })
          }
        })
      } catch (err) {
        console.error("Failed to update driver aggregate:", err)
      }

      setShowRatingModal(false)
      setRating(0)
      setComment("")
      alert("Thank you for your feedback!")
    } catch (err) {
      console.error("Failed to submit rating:", err)
      alert("Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-5 pb-4 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Hello</p>
            <h1 className="text-lg font-bold text-foreground">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!students.length && (
               <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-medium text-muted-foreground">
                 <Loader2 className="h-3 w-3 animate-spin" />
                 Syncing...
               </div>
            )}
            {isPremium ? (
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                PREMIUM
              </span>
            ) : (
              <button
                onClick={onUpgrade}
                className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-[11px] font-bold text-gold transition-colors active:bg-gold/25"
              >
                <Sparkles className="h-3 w-3" />
                Go Premium
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <span className="text-sm font-bold text-primary-foreground">{initials}</span>
            </div>
          </div>
        </div>

        {/* Child Switcher */}
        <button
          onClick={() => setShowChildPicker(!showChildPicker)}
          disabled={!students.length}
          className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3 transition-colors active:bg-accent disabled:opacity-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <div className="flex items-center gap-2 text-left">
              <span className="text-sm font-semibold text-foreground">
                {selectedChild?.name || (students.length ? "Select a student" : "Loading students...")}
              </span>
              {selectedChild && <StatusBadge status={selectedChild.status} />}
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedChild?.school || (students.length ? "Select to view status" : "Please wait")}
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
            {students.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChild(child)
                  setShowChildPicker(false)
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  selectedChild?.id === child.id
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
            <span className="text-sm font-semibold text-foreground">{selectedChild?.vehicle || "—"}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">Driver</span>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-foreground">{selectedChild?.driver || "Not Assigned"}</span>
              {selectedChild && (
                <button 
                  onClick={() => setShowRatingModal(true)}
                  className="mt-1 flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <Star className="h-3 w-3 fill-primary/20" />
                  Rate Driver
                </button>
              )}
            </div>
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
        {routeStops.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No stops assigned to this route.</p>
        ) : (
        <div className="flex flex-col">
          {routeStops.map((stop, i) => (
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
                {i < routeStops.length - 1 && (
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
                {stop.time && <span className="text-xs text-muted-foreground">{stop.time}</span>}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Trip Info Cards — live from vehicle Firestore doc */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          {/* Speed */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="text-sm font-semibold text-foreground">
                {vehicleData.speed !== null ? `${vehicleData.speed} km/h` : "—"}
              </p>
            </div>
          </div>
          {/* Next Stop */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Next Stop</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {vehicleData.nextStop || routeStops.find(s => s.status === "current")?.name || "—"}
              </p>
            </div>
          </div>
          {/* ETA */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-semibold text-foreground">
                {vehicleData.etaMinutes !== null ? `~${vehicleData.etaMinutes} min` : "—"}
              </p>
            </div>
          </div>
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              ["on_duty", "active", "moving"].includes(vehicleData.status) ? "bg-success/10"
              : vehicleData.status === "off-duty" ? "bg-muted"
              : "bg-muted"
            )}>
              <Navigation className={cn(
                "h-5 w-5",
                ["on_duty", "active", "moving"].includes(vehicleData.status) ? "text-success"
                : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={cn(
                "text-sm font-semibold",
                ["on_duty", "active", "moving"].includes(vehicleData.status) ? "text-success"
                : vehicleData.status ? "text-foreground"
                : "text-muted-foreground"
              )}>
                {vehicleData.status === "on_duty" || vehicleData.status === "active" || vehicleData.status === "moving"
                  ? "In Transit"
                  : vehicleData.status === "off-duty" || vehicleData.status === "off_duty"
                  ? "Off Duty"
                  : vehicleData.status
                    ? vehicleData.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                    : "Not Active"}
              </p>
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


      {/* Driver Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Star className="h-8 w-8 text-primary" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Rate {selectedChild?.driver || "Driver"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">How was your trip experience today?</p>
              
              <div className="my-6 flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className="group transition-transform active:scale-90"
                  >
                    <Star 
                      className={cn(
                        "h-8 w-8 transition-colors",
                        s <= rating ? "fill-warning text-warning" : "text-muted-foreground/30 hover:text-muted-foreground/50"
                      )} 
                      strokeWidth={s <= rating ? 0 : 2}
                    />
                  </button>
                ))}
              </div>

              <div className="w-full relative mb-6">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  placeholder="Any comments or feedback?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/50 p-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-none"
                />
              </div>

              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRatingModal(false)}
                  className="h-12 flex-1 rounded-xl"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRating}
                  disabled={rating === 0 || isSubmitting}
                  className="h-12 flex-1 rounded-xl bg-primary gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

