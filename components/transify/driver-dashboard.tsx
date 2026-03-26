"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import {
  Bus, Car, Truck, Bike,
  MapPin, Play, Square,
  AlertTriangle, Clock, CheckCircle2,
  Circle, Navigation, Users, Route, LogOut,
  ChevronDown, Activity, Phone, Bell, Zap, ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { StickyHeader } from "./sticky-header"
import { useRouter, useSearchParams } from "next/navigation"
import { useLiveTracking } from "@/hooks/use-live-tracking"
import { calcDistanceKm } from "@/lib/utils"
import { useJsApiLoader } from "@react-google-maps/api"
import { collection, onSnapshot, query, where, updateDoc, doc, addDoc, serverTimestamp, setDoc, getDocs, limit } from "firebase/firestore"
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
      <rect x="10" y="8" width="10" height="8" rx="1" fill="#bfdbfe" />
      <rect x="23" y="8" width="10" height="8" rx="1" fill="#bfdbfe" />
      <rect x="36" y="8" width="10" height="8" rx="1" fill="#bfdbfe" />
      <circle cx="14" cy="30" r="4" fill="#1e293b" /><circle cx="42" cy="30" r="4" fill="#1e293b" />
    </svg>
  )
}

const LIBRARIES: ("places")[] = ["places"]

interface DriverDashboardProps {
  profile?: any
  resolvedOrgId?: string
}

export default function DriverDashboard(props: DriverDashboardProps) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <DriverDashboardWithAuth {...props} />
    </Suspense>
  )
}

function DriverDashboardWithAuth(props: DriverDashboardProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  })

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  
  return <DriverDashboardContent isLoaded={isLoaded} {...props} />
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

function DriverDashboardContent({ isLoaded }: { isLoaded: boolean }) {
  const { profile, logoutMock } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Diagnostic: If DB is not initialized, show loading state instead of crashing
  if (!db) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <h2 className="text-xl font-bold text-foreground">Connecting to server...</h2>
        <p className="text-sm text-muted-foreground mt-2">Please ensure you have a stable internet connection.</p>
        <Button onClick={() => window.location.reload()} className="mt-6" variant="outline">Retry Connection</Button>
      </div>
    )
  }

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
    // Priority 1: Use activeOrgId from profile if available
    if (profile?.activeOrgId) {
      setResolvedOrgId(profile.activeOrgId)
      return
    }

    if (!orgCode) return
    setIsResolvingOrg(true)
    try {
      const orgsRef = collection(db, "organizations")
      const q = query(orgsRef, where("code", "==", orgCode.trim().toUpperCase()), limit(1))
      const snap = await getDocs(q)
      if (!snap.empty) {
        setResolvedOrgId(snap.docs[0].id)
      } else {
        setResolvedOrgId(orgCode)
      }
    } catch { setResolvedOrgId(orgCode) }
    finally { setIsResolvingOrg(false) }
  }, [orgCode, profile?.activeOrgId])
  useEffect(() => { 
    if (db) resolveOrg() 
  }, [resolveOrg])

  const [tripState, setTripState] = useState<TripState>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("transify_driver_trip_state") as TripState) || "not-started"
    }
    return "not-started"
  })
  const [tripDirection, setTripDirection] = useState<"to-school" | "from-school">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("transify_driver_trip_direction") as any) || "to-school"
    }
    return "to-school"
  })
  const [showDelayReport, setShowDelayReport] = useState(false)
  const [showSosConfirm, setShowSosConfirm] = useState(false)
  
  const [vehicles, setVehicles] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("transify_driver_vehicles")
      return cached ? JSON.parse(cached) : []
    }
    return []
  })
  const [selectedVehicle, setSelectedVehicle] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("transify_driver_selected_vehicle")
      return cached ? JSON.parse(cached) : null
    }
    return null
  })
  const [showVehiclePicker, setShowVehiclePicker] = useState(false)
  
  const [realName, setRealName] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("transify_driver_name") || ""
    return ""
  })
  const [driverId, setDriverId] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("transify_driver_id") || ""
    return ""
  })
  const [driverPhone, setDriverPhone] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("transify_driver_phone") || ""
    return ""
  })
  const [driverPhoto, setDriverPhoto] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("transify_driver_photo") || ""
    return ""
  })
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("transify_driver_assigned_veh_id") || ""
    return ""
  })
  const [isVerifying, setIsVerifying] = useState(true)
  
  const [currentRoute, setCurrentRoute] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("transify_driver_current_route")
      return cached ? JSON.parse(cached) : null
    }
    return null
  })
  const [dynamicStops, setDynamicStops] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("transify_driver_dynamic_stops")
      return cached ? JSON.parse(cached) : []
    }
    return []
  })
  const [currentStopIndex, setCurrentStopIndex] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("transify_driver_stop_index") || "0")
    }
    return 0
  })
  const [isAtStop, setIsAtStop] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("transify_driver_is_at_stop") === "true"
    }
    return false
  })

  // Persist state changes to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("transify_driver_trip_state", tripState)
    localStorage.setItem("transify_driver_trip_direction", tripDirection)
    localStorage.setItem("transify_driver_stop_index", currentStopIndex.toString())
    localStorage.setItem("transify_driver_is_at_stop", isAtStop.toString())
  }, [tripState, tripDirection, currentStopIndex, isAtStop])

  const [geocodedStops, setGeocodedStops] = useState<({ lat: number; lng: number } | null)[]>([])
  const [deviationAlertSent, setDeviationAlertSent] = useState(false)
  // Track if we already auto-advanced to avoid double-trigger
  const lastAutoStopRef = useRef(-1)
  // Track proximity alerts sent to avoid spamming
  const proximityAlertsSent = useRef<Set<number>>(new Set())
  // Track active trip_sessions doc ID (for updating on trip end)
  const activeTripDocId = useRef<string | null>(typeof window !== "undefined" ? localStorage.getItem("transify_driver_active_trip_id") : null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (activeTripDocId.current) {
      localStorage.setItem("transify_driver_active_trip_id", activeTripDocId.current)
    } else {
      localStorage.removeItem("transify_driver_active_trip_id")
    }
  }, [activeTripDocId.current])

  // 4. Live tracking (Moved up to fix declaration order)
  const { location, error: gpsError } = useLiveTracking(
    selectedVehicle?.id || selectedVehicle?.plate_number || "",
    tripState === "in-progress",
    resolvedOrgId
  )

  const normalize = (p: string) => p?.replace(/\D/g, '').slice(-10)

  // ── Notify parent helper ─────────────────────────────────────────────────
  const sendParentAlerts = useCallback(async (type: "trip_started" | "stop_reached" | "stop_departed" | "approaching" | "trip_end" | "delay" | "sos" | "reached_school" | "student_reached", nextStopIndex?: number, priority: "normal" | "warning" | "emergency" = "normal", customMessage?: string) => {
    if (!resolvedOrgId || !currentRoute?.id || !db) return

    try {
      // 1. Fetch all students on this route
      const q = query(
        collection(db, "students"),
        where("organization_id", "==", resolvedOrgId),
        where("route_id", "==", currentRoute.id)
      )
      const snap = await getDocs(q)
      const students = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
      
      const vehiclePlate = selectedVehicle?.plate_number || "Unknown"
      const morningEvening = tripDirection === "to-school" ? "morning" : "return"
      const currentStopIndexLocal = nextStopIndex !== undefined ? nextStopIndex : currentStopIndex
      const rawCurrentStop = dynamicStops[currentStopIndexLocal]
      const currentStopName = typeof rawCurrentStop === "string" ? rawCurrentStop : (rawCurrentStop?.name || rawCurrentStop?.stop_name || "Unknown Stop")

      for (const st of students) {
        if (!st.parent_phone) continue
        
        // Normalize phone to match login profiles
        const pPhone = normalize(st.parent_phone)
        const formattedPhone = pPhone.length === 10 ? `+91${pPhone}` : st.parent_phone

        let title = ""
        let description = ""
        let alertKeySuffix = ""
        let current_priority = priority
        let current_type: string = type

        // Helper to find student's stop index in current route
        const bPoint = st.boarding_point
        const dPoint = st.dropoff_point
        const boardingStr = typeof bPoint === "string" ? bPoint : (bPoint?.name || "")
        const dropoffStr = typeof dPoint === "string" ? dPoint : (dPoint?.name || "")

        const studentStopName = tripDirection === "to-school" ? boardingStr : dropoffStr
        
        // Use recursive helper to find student stop index
        let studentStopIndex = dynamicStops.findIndex((s: any) => {
          const sName = typeof s === "string" ? s : (s.name || s.stop_name || "")
          const target = studentStopName?.toLowerCase() || "___none___"
          const candidate = sName.toLowerCase()
          return candidate.includes(target) || target.includes(candidate)
        })

        // Coordinate matching fallback
        if (studentStopIndex === -1 && studentStopName) {
           const target = tripDirection === "to-school" ? st.boarding_point : st.dropoff_point
           if (target?.lat && target?.lng) {
             studentStopIndex = dynamicStops.findIndex((s: any) => {
               if (typeof s === "string") return false // Can't match coords on raw strings
               if (!s.lat || !s.lng) return false
               return Math.abs(s.lat - target.lat) < 0.002 && Math.abs(s.lng - target.lng) < 0.002
             })
           }
        }

        // Guard: For return trips, suppress all alerts after the student is dropped off
        if (tripDirection === "from-school" && studentStopIndex !== -1 && currentStopIndexLocal > studentStopIndex) {
          if (type !== "trip_end") continue
        }

        if (type === "trip_started") {
          if (tripDirection === "to-school") {
            title = "Bus Started Route"
            description = `Bus ${vehiclePlate} has started the morning pickup route.`
          } else {
            title = "Bus Started Return Trip"
            description = `Bus ${vehiclePlate} has started the return trip from school.`
          }
          alertKeySuffix = `${tripDirection}_trip_started_${new Date().toDateString()}`
        } else if (type === "delay") {
          title = "Bus Delay Notification"
          description = `Bus ${vehiclePlate} is delayed due to ${customMessage || "traffic"}. Expected arrival time may be later than usual.`
          alertKeySuffix = `delay_${new Date().getTime()}`
          current_priority = "warning"
        } else if (type === "sos") {
          title = "Emergency SOS Alert"
          description = `Emergency alert reported from Bus ${vehiclePlate}.`
          alertKeySuffix = `sos_${new Date().getTime()}`
          current_priority = "emergency"
        } else if (type === "reached_school" && tripDirection === "to-school") {
          title = "Bus Reached School"
          description = `Bus ${vehiclePlate} has reached the school.`
          alertKeySuffix = `${tripDirection}_reached_school_${new Date().toDateString()}`
        } else if (type === "stop_reached") {
          const diff = studentStopIndex !== -1 ? studentStopIndex - currentStopIndex : null
          
          if (diff === 2) {
            current_type = "stops_away_2"
            title = tripDirection === "to-school" ? "Bus Two Stops Away" : "Bus Two Stops Away From Drop Stop"
            description = tripDirection === "to-school"
              ? `Bus ${vehiclePlate} is two stops away from your pickup stop.`
              : `Bus ${vehiclePlate} is two stops away from your child’s drop stop.`
            alertKeySuffix = `${tripDirection}_stops_away_2_${studentStopIndex}_${new Date().toDateString()}`
          } else if (diff === 1) {
            current_type = "stops_away_1"
            title = tripDirection === "to-school" ? "Bus One Stop Away" : "Bus One Stop Away From Drop Stop"
            description = tripDirection === "to-school"
              ? `Bus ${vehiclePlate} is one stop away from your pickup stop. Please be ready.`
              : `Bus ${vehiclePlate} is one stop away from your child’s drop stop.`
            alertKeySuffix = `${tripDirection}_stops_away_1_${studentStopIndex}_${new Date().toDateString()}`
          } else if (diff === 0) {
            // Reached destination
            title = tripDirection === "to-school" ? "Bus Reached Pickup Stop" : "Trip Completed"
            description = tripDirection === "to-school"
              ? `Bus ${vehiclePlate} has reached your pickup stop.`
              : `Bus ${vehiclePlate} has reached the drop-off point. Trip completed.`
            alertKeySuffix = `${tripDirection}_stop_reached_${studentStopIndex}_${new Date().toDateString()}`
          } else {
            // General intermediate stop notification for all parents
            current_type = "intermediate_stop_reached"
            title = currentStopName ? `Bus Reached ${currentStopName}` : "Bus Reached Intermediate Stop"
            description = `Bus ${vehiclePlate} has reached ${currentStopName || "the next stop"}.`
            alertKeySuffix = `${tripDirection}_stop_reached_${currentStopIndexLocal}_${new Date().toDateString()}`
          }
        } else if (type === "stop_departed" && currentStopIndexLocal !== dynamicStops.length - 1) {
          if (tripDirection === "to-school" && studentStopIndex === currentStopIndexLocal) {
            // Specifically left the student's pickup stop
            current_type = "stop_departed"
            title = "Bus Left Pickup Stop"
            description = `Bus ${vehiclePlate} has departed from your pickup stop.`
            alertKeySuffix = `${tripDirection}_stop_departed_${currentStopIndexLocal}_${new Date().toDateString()}`
          } else if (tripDirection === "from-school" && studentStopIndex === currentStopIndexLocal) {
            // Student just got dropped off, we already send "Trip Completed" via student_reached
            // Skip the generic "Bus Left Stop" for this parent
            continue
          } else {
            // General intermediate departure notification
            current_type = "intermediate_stop_departed"
            title = currentStopName ? `Bus Left ${currentStopName}` : "Bus Left Intermediate Stop"
            description = `Bus ${vehiclePlate} has departed from ${currentStopName || "the stop"}.`
            alertKeySuffix = `${tripDirection}_stop_departed_${currentStopIndexLocal}_${new Date().toDateString()}`
          }
        } else if (type === "student_reached" && studentStopIndex === currentStopIndexLocal && tripDirection === "from-school") {
          // Triggered when bus DEPARTS from the student's drop-off stop
          title = "Trip Completed"
          description = `Your child ${st.name} has been dropped off. Trip completed.`
          alertKeySuffix = `${tripDirection}_student_reached_final_${studentStopIndex}_${new Date().toDateString()}`
        } else if (type === "trip_end") {
           title = "Trip Completed"
           description = `The trip has successfully reached its final destination.`
           alertKeySuffix = `${tripDirection}_trip_end_${new Date().getTime()}`
        } else {
          continue
        }

        const alertKey = `${st.id}_${alertKeySuffix}`
        const alertRef = doc(db, "alerts", alertKey)
        
        setDoc(alertRef, {
          type: current_type,
          student_id: st.id,
          student_name: st.name,
          parent_phone: formattedPhone,
          title,
          description,
          bus_number: vehiclePlate,
          stop_name: currentStopName,
          priority: current_priority,
          created_at: serverTimestamp(),
          read: false,
        }, { merge: true }).catch(err => console.error("Error setting alert doc:", err))
      }
    } catch (e) {
      console.error("Failed to send parent alerts:", e)
    }
  }, [resolvedOrgId, currentRoute?.id, dynamicStops, currentStopIndex, selectedVehicle?.plate_number, tripDirection])

  // ── Notify admin helper ──────────────────────────────────────────────────
  const notifyAdmin = useCallback((type: string, title: string, message: string, extra?: any) => {
    if (!db) return
    addDoc(collection(db, "notifications"), {
      organization_id: resolvedOrgId,
      type, title, message,
      read: false,
      timestamp: new Date().toISOString(),
      metadata: {
        driver_name: realName,
        driver_phone: driverPhone || profile?.phone,
        vehicle_id: selectedVehicle?.plate_number || selectedVehicle?.id,
        vehicle_type: selectedVehicle?.type,
        route_name: currentRoute?.route_name,
        ...extra
      }
    }).catch(e => console.error("Notify fail:", e))

    // Update Vehicle Status in Firestore if it's an alert
    if (selectedVehicle?.id && (type === "delay" || type === "sos")) {
      const status = type === "delay" ? "delayed" : "emergency"
      const vehicleRef = doc(db, "vehicles", selectedVehicle.id)
      updateDoc(vehicleRef, { status }).catch(e => console.error("Status update fail:", e))
      
      // Also notify parents
      if (type === "sos") {
        sendParentAlerts("sos", undefined, "emergency")
      } else if (type === "delay") {
        sendParentAlerts("delay", undefined, "warning", message)
      }
    }
  }, [resolvedOrgId, realName, driverPhone, profile?.phone, selectedVehicle, currentRoute, sendParentAlerts])

  // 1. Fetch driver info
  const fetchDriverInfo = useCallback(async () => {
    if (!resolvedOrgId || !profile?.phone || !db) return 
    
    setIsVerifying(true)
    try {
      const q = query(
        collection(db, "drivers"), 
        where("organization_id", "==", resolvedOrgId)
      )
      const snap = await getDocs(q)
      const drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      const userPhoneDigits = normalize(profile.phone)
      const currentDriver = drivers.find((d: any) => normalize(d.phone) === userPhoneDigits || d.phone === profile.phone)
      
      if (currentDriver) {
        setRealName(currentDriver.name)
        setDriverId(currentDriver.id)
        setDriverPhone(currentDriver.phone || profile.phone || "")
        setDriverPhoto(currentDriver.photo_url || "")
        
        const targetVehId = currentDriver.vehicle_id || currentDriver.vehicle
        if (targetVehId && targetVehId !== "Unassigned") {
          setAssignedVehicleId(targetVehId)
        }

        localStorage.setItem("transify_driver_name", currentDriver.name)
        localStorage.setItem("transify_driver_id", currentDriver.id)
        localStorage.setItem("transify_driver_phone", currentDriver.phone || profile.phone || "")
        localStorage.setItem("transify_driver_photo", currentDriver.photo_url || "")
        if (targetVehId) localStorage.setItem("transify_driver_assigned_veh_id", targetVehId)
      }
    } catch (e) { console.error("Failed to fetch driver info:", e) }
    finally { setIsVerifying(false) }
  }, [resolvedOrgId, profile?.phone])
  
  const fetchVehicles = useCallback(async () => {
    if (!resolvedOrgId || !db) return
    try {
      const q = query(
        collection(db, "vehicles"), 
        where("organization_id", "==", resolvedOrgId)
      )
      const snap = await getDocs(q)
      const vehicles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      
      setVehicles(vehicles)
      localStorage.setItem("transify_driver_vehicles", JSON.stringify(vehicles))
      
      if (vehicles.length === 1) {
        setSelectedVehicle(vehicles[0])
        localStorage.setItem("transify_driver_selected_vehicle", JSON.stringify(vehicles[0]))
      }
    } catch (e) { console.error("Failed to fetch vehicles:", e) }
  }, [resolvedOrgId])

  // 3. Real-time route listener (Firestore onSnapshot)
  useEffect(() => {
    if (!resolvedOrgId || !selectedVehicle || !db) return
    const ids = [...new Set([selectedVehicle.id, selectedVehicle.plate_number].filter(Boolean))]
    const q = query(collection(db, "routes"), where("organization_id", "==", resolvedOrgId), where("vehicle_id", "in", ids))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routeDoc = snapshot.docs[0]
        if (routeDoc) {
          const route = routeDoc.data()
          const fullRoute = { id: routeDoc.id, ...route }
          setCurrentRoute(fullRoute)
          localStorage.setItem("transify_driver_current_route", JSON.stringify(fullRoute))

          const baseStops = [
            { name: route.start_point, lat: route.start_lat ?? null, lng: route.start_lng ?? null },
            ...(route.stops || []).map((s: any) => (
              typeof s === 'string' 
                ? { name: s, lat: null, lng: null } 
                : { name: s.name, lat: s.lat ?? null, lng: s.lng ?? null }
            )),
            { name: route.end_point, lat: route.end_lat ?? null, lng: route.end_lng ?? null }
          ]
          
          let finalStops = baseStops
          // If from-school, reverse the entire sequence
          if (tripDirection === "from-school") {
            finalStops = [...baseStops].reverse()
          }
          
          setDynamicStops(finalStops)
          localStorage.setItem("transify_driver_dynamic_stops", JSON.stringify(finalStops))
        }
      }, (err) => console.error("Route listener error:", err))
    return () => unsubscribe()
  }, [resolvedOrgId, selectedVehicle?.id, selectedVehicle?.plate_number, tripDirection])

  // 4. Trigger initial fetches
  useEffect(() => {
    if (resolvedOrgId) {
      fetchVehicles()
    }
  }, [resolvedOrgId, fetchVehicles])

  useEffect(() => {
    if (resolvedOrgId && profile?.phone) {
      fetchDriverInfo()
    }
  }, [resolvedOrgId, profile?.phone, fetchDriverInfo])

  // 5. Automatic Vehicle Assignment from Driver Data
  useEffect(() => {
    if (vehicles.length > 0 && assignedVehicleId && !selectedVehicle) {
      const assignedVeh = vehicles.find((v: any) => 
        v.id === assignedVehicleId || 
        v.plate_number === assignedVehicleId || 
        normalize(v.plate_number) === normalize(assignedVehicleId)
      )
      if (assignedVeh) {
        setSelectedVehicle(assignedVeh)
        setShowVehiclePicker(false)
      }
    }
  }, [vehicles, assignedVehicleId, selectedVehicle])

  // 3b. Geocode stops for deviation checking
  useEffect(() => {
    if (!isLoaded || dynamicStops.length === 0) return
    
    const geocodeAll = async () => {
      const geocoder = new window.google.maps.Geocoder()
      const coords = await Promise.all(dynamicStops.map(s => 
        new Promise<{ lat: number; lng: number } | null>((resolve) => {
          geocoder.geocode({ address: s.name, componentRestrictions: { country: "IN" } }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              resolve({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() })
            } else resolve(null)
          })
        })
      ))
      setGeocodedStops(coords)
    }
    geocodeAll()
  }, [isLoaded, dynamicStops])

  const currentStops = dynamicStops.map((s, i) => ({
    ...s,
    status: (tripState === "completed" ? "completed" : i < currentStopIndex ? "completed" : i === currentStopIndex ? "current" : "upcoming") as "completed" | "current" | "upcoming"
  }))
  const completedStops = currentStopIndex
  const totalStops = currentStops.length

  // 4b. Route Deviation Monitoring
  useEffect(() => {
    if (tripState !== "in-progress" || !location || geocodedStops.length === 0 || deviationAlertSent) {
      if (tripState === "in-progress" && geocodedStops.length === 0 && !deviationAlertSent) {
        console.warn("Deviation monitoring active but no geocoded stops found.")
      }
      return
    }

    // Simple check: is the driver within a reasonable distance (2.5km) of ANY of the stops?
    // Increased threshold to 2.5km to avoid false positives between distant stops
    const isNearAnyStop = geocodedStops.some(stop => {
      if (!stop) return false
      const dist = calcDistanceKm(location.latitude, location.longitude, stop.lat, stop.lng)
      return dist < 2.5 
    })

    if (!isNearAnyStop) {
      console.log("⚠️ Route deviation detected! Vehicle is far from any planned stop.")
      setDeviationAlertSent(true)
      notifyAdmin("route_deviation", "⚠️ Route Deviation Alert", 
        `Vehicle ${selectedVehicle?.plate_number} has deviated from the assigned route!`,
        { latitude: location.latitude, longitude: location.longitude }
      )
    }

    // --- PROXIMITY ALERT LOGIC ---
    // If not at stop, check distance to the NEXT stop (indexed by currentStopIndex)
    const nextStop = geocodedStops[currentStopIndex]
    if (!isAtStop && nextStop) {
      const dist = calcDistanceKm(location.latitude, location.longitude, nextStop.lat, nextStop.lng)
      
      // ~1.7km is roughly 5 mins at 20km/h
      const PROXIMITY_THRESHOLD_KM = 1.7 

      if (dist < PROXIMITY_THRESHOLD_KM && !proximityAlertsSent.current.has(currentStopIndex)) {
        const stopName = dynamicStops[currentStopIndex]?.name || "Upcoming Stop"
        console.log(`🔔 Sending proximity alert for stop: ${stopName}`)
        
        notifyAdmin("proximity", "🚌 Vehicle Approaching", 
          `Vehicle ${selectedVehicle?.plate_number} is about 5 minutes away from ${stopName}`,
          { 
            stop_index: currentStopIndex, 
            stop_name: stopName,
            eta_minutes: 5,
            proximity_alert: true 
          }
        )
        proximityAlertsSent.current.add(currentStopIndex)
      }
    }
  }, [tripState, location, geocodedStops, deviationAlertSent, notifyAdmin, selectedVehicle, isAtStop, currentStopIndex, dynamicStops])

  // Reset deviation state when trip ends or starts
  useEffect(() => {
    if (tripState === "not-started") {
      setDeviationAlertSent(false)
      proximityAlertsSent.current.clear()
    }
  }, [tripState])

  // 4c. Sync Progress to Firestore
  useEffect(() => {
    if (tripState !== "in-progress" || !selectedVehicle?.id || !db) return

    const total = dynamicStops.length
    const current = currentStopIndex
    
    // Progress calculation: increments when arriving at each stop
    // (current + 1 / total) when at stop, (current / total) when moving
    const progress = total > 0 
      ? Math.min(100, Math.round(((current + (isAtStop ? 1 : 0)) / total) * 100))
      : 0

    const syncProgress = async () => {
      try {
        await updateDoc(doc(db, "vehicles", selectedVehicle.id), {
          progress: progress,
          current_stop: isAtStop 
            ? `At: ${dynamicStops[current]?.name || "Stop"}` 
            : `Next: ${dynamicStops[current]?.name || "Moving"}`,
          current_stop_index: current,
          is_at_stop: isAtStop,
          total_stops: total,
          last_progress_update: new Date().toISOString()
        })
      } catch (err) {
        console.error("Failed to sync progress:", err)
      }
    }

    syncProgress()
  }, [currentStopIndex, dynamicStops, selectedVehicle?.id, tripState, isAtStop])

  // 4d. Automatic Stop detection (Geofencing)
  useEffect(() => {
    if (tripState !== "in-progress" || !location || !dynamicStops.length || !db) return

    const currentStop = dynamicStops[currentStopIndex]
    const geocodedStop = geocodedStops[currentStopIndex]
    const stopLat = currentStop?.lat || geocodedStop?.lat
    const stopLng = currentStop?.lng || geocodedStop?.lng

    if (stopLat != null && stopLng != null) {
      const dist = calcDistanceKm(location.latitude, location.longitude, stopLat, stopLng)
      
      // If within 100 meters and not already marked as arrived at this specific stop
      if (dist < 0.1 && !isAtStop && lastAutoStopRef.current !== currentStopIndex) {
        lastAutoStopRef.current = currentStopIndex
        setIsAtStop(true)
        console.log(`📍 Automatically reached stop: ${currentStop.name}`)
        sendParentAlerts("stop_reached")
        if (currentStopIndex + 1 < dynamicStops.length) {
          sendParentAlerts("approaching", currentStopIndex + 1)
        }
      }
      // Departure detection: If we were at stop and now moved away > 200m
      if (dist > 0.2 && isAtStop) {
        setIsAtStop(false)
        console.log(`🚌 Automatically departed from stop: ${currentStop.name}`)
        sendParentAlerts("student_reached")
        sendParentAlerts("stop_departed")
      }
    }
  }, [location, currentStopIndex, dynamicStops, tripState, isAtStop, sendParentAlerts, geocodedStops])


  // GPS warmup — silently pre-acquire fix when component mounts so trip start is instant
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => { /* warm up GPS chip — discard result */ },
      () => { /* ignore warmup error */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const handleStartTrip = async () => {
    if (!selectedVehicle) { alert("Please select a vehicle before starting the trip."); setShowVehiclePicker(true); return }
    if (!db) return
    setTripState("in-progress")
    setCurrentStopIndex(0)
    setIsAtStop(true)
    lastAutoStopRef.current = -1
    
    if (driverId) {
      updateDoc(doc(db, "drivers", driverId), { status: "on-duty" }).catch(console.error)
    }

    if (selectedVehicle?.id) {
      updateDoc(doc(db, "vehicles", selectedVehicle.id), { 
        status: "on_duty",
        progress: 0,
        current_stop: dynamicStops[0]?.name || "Starting",
        current_stop_index: 0,
        is_at_stop: true,
        direction: tripDirection,
      }).catch(console.error)
    }

    // ── Write trip_sessions document so parent trips screen can show history ──
    try {
      const tripRef = await addDoc(collection(db, "trips"), {
        route_name: currentRoute?.route_name || "—",
        route_id: currentRoute?.id || "",
        vehicle_id: selectedVehicle?.id || "",
        vehicle_plate: selectedVehicle?.plate_number || "",
        driver_id: driverId,
        driver_name: realName,
        direction: tripDirection,
        status: "in-progress",
        started_at: serverTimestamp(),
        organization_id: resolvedOrgId,
        stops: dynamicStops.map((s: any) => s.name),
      })
      activeTripDocId.current = tripRef.id
    } catch (e) {
      console.error("trip_sessions write error:", e)
    }

    notifyAdmin("trip_start", "🚌 Trip Started",
      `Vehicle ${selectedVehicle?.plate_number} started the trip on route ${currentRoute?.route_name || "—"} (${tripDirection === 'to-school' ? 'To School' : 'From School'}).`)
    sendParentAlerts("trip_started")
  }

  const handleEndTrip = async () => {
    if (!db) return
    setTripState("completed")
    
    if (driverId) {
      updateDoc(doc(db, "drivers", driverId), { status: "off-duty" }).catch(console.error)
    }

    if (selectedVehicle?.id) {
      updateDoc(doc(db, "vehicles", selectedVehicle.id), { 
        status: "off_duty",
        progress: 0,
        current_stop: "" 
      }).catch(console.error)
    }

    // ── Update the trips doc with ended_at + completed status ──
    if (activeTripDocId.current) {
      updateDoc(doc(db, "trips", activeTripDocId.current), {
        status: "completed",
        ended_at: serverTimestamp(),
      }).catch(console.error)
      activeTripDocId.current = null
    }

    notifyAdmin("trip_end", "🏁 Trip Ended",
      `Vehicle ${selectedVehicle?.plate_number} completed the trip on route ${currentRoute?.route_name || "—"}.`)
    sendParentAlerts("trip_end")
  }

  // ── Auto-advance stop on geofence ────────────────────────────────────────
  // (Only works when stop geocoords are available; otherwise manual fallback remains)
  // For now stops don't have lat/lng from DB so we don't auto-advance automatically.
  // When the driver physically arrives, they can tap "Arrived" (manual fallback).
  // The "Depart Stop" button is removed — progress is: Arrived → auto move to next stop.
  const handleArrived = () => {
    sendParentAlerts("stop_reached")
    
    // If this is the final stop and it's morning trip to school, send "Reached School" alert
    if (currentStopIndex === totalStops - 1 && tripDirection === "to-school") {
      sendParentAlerts("reached_school")
    }

    if (currentStopIndex + 1 < totalStops) {
      sendParentAlerts("approaching", currentStopIndex + 1)
    }

    if (currentStopIndex < totalStops - 1) {
      const departingIdx = currentStopIndex // Store current index before advancing
      // Small timeout before "departure" to ensure "arrived" is seen first if they manual advance quickly
      setTimeout(() => {
        sendParentAlerts("student_reached", departingIdx)
        sendParentAlerts("stop_departed", departingIdx)
      }, 1000)
      
      const nextIdx = currentStopIndex + 1
      setCurrentStopIndex(nextIdx)
      setIsAtStop(false)
    } else {
      handleEndTrip()
    }
  }

  const userName = isVerifying ? "..." : (realName || "Not Found")
  const initials = userName === "..." ? "??" : (userName || "").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const vehicleType = selectedVehicle?.type || "bus"

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      <StickyHeader title="Driver Dashboard" />
      {/* Driver Info Card */}
      <div className="mx-4 mt-4 rounded-2xl bg-primary p-5 shadow-lg text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 overflow-hidden shrink-0 ring-4 ring-white/10">
            {driverPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driverPhoto} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-black mb-0.5">{isVerifying ? "Verifying..." : "Authorized Driver"}</p>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {userName}
              {isVerifying && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              {realName && !isVerifying && <CheckCircle2 className="h-4 w-4 text-white fill-white/20" />}
            </h1>
          </div>
          {tripState === "in-progress" && (
            <button
              onClick={() => setShowDelayReport(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30 px-3.5 text-[11px] font-bold text-orange-200 transition-colors active:bg-orange-500/30"
            >
              <Clock className="h-4 w-4" /> Delay
            </button>
          )}
        </div>

        {/* Vehicle & Route Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 border border-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Bus className="h-5 w-5 text-white/80" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-none mb-1">Bus ID</span>
              <span className="text-sm font-bold text-white truncate">{selectedVehicle?.plate_number || "None"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 border border-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Route className="h-5 w-5 text-white/80" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-none mb-1">Route</span>
              <span className="text-sm font-bold text-white truncate">{currentRoute?.route_name || "None"}</span>
            </div>
          </div>
        </div>

        {/* Direction Toggle */}
        {tripState === "not-started" && (
          <div className="mt-5 flex rounded-xl bg-black/20 p-1">
            <button
              onClick={() => setTripDirection("to-school")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                tripDirection === "to-school" ? "bg-white text-primary shadow-sm scale-100" : "text-white/40 hover:text-white/60"
              )}
            >
              To School
            </button>
            <button
              onClick={() => setTripDirection("from-school")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                tripDirection === "from-school" ? "bg-white text-primary shadow-sm scale-100" : "text-white/40 hover:text-white/60"
              )}
            >
              From School
            </button>
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
          <LiveMap
            organizationId={resolvedOrgId}
            routeStops={dynamicStops}
            showDirections={dynamicStops.length > 1}
            vehicleMeta={selectedVehicle ? {
              [selectedVehicle.id || selectedVehicle.plate_number]: {
                type: vehicleType,
                plate_number: selectedVehicle.plate_number
              }
            } : {}}
            filterToMeta={true}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-card/50">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Live Route Map</span>
          <div className="flex items-center gap-1.5">
            <VehicleMapIcon type={vehicleType} />
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
        <button onClick={() => { logoutMock("driver"); router.push("/category") }}
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
