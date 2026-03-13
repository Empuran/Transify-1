import { useState, useEffect, useRef } from "react"
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface LocationUpdate {
    latitude: number
    longitude: number
    heading: number | null
    speed: number | null
    timestamp: number
}

// Custom hook to handle high-frequency geolocation tracking
// Writes current position to live_locations/{vehicleId} (upserted)
// Appends each point to live_locations/{vehicleId}/route_history (history log)
export function useLiveTracking(vehicleId: string, isActive: boolean, organizationId?: string) {
    const [location, setLocation] = useState<LocationUpdate | null>(null)
    const [error, setError] = useState<string | null>(null)
    
    // Quota optimization refs
    const lastWriteRef = useRef({ live: 0, heartbeat: 0 })
    const lastLoggedLoc = useRef<{ lat: number; lng: number } | null>(null)

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371 // km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    useEffect(() => {
        let watchId: number

        const startTracking = async () => {
            if (!navigator.geolocation) {
                setError("Geolocation is not supported by your browser/phone")
                return
            }

            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const speedKmh = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0
                    const newLoc: LocationUpdate = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        heading: position.coords.heading,
                        speed: speedKmh,
                        timestamp: position.timestamp,
                    }

                    setLocation(newLoc)

                    const now = Date.now()
                    // 1. Throttle live position (single doc) — every 2 seconds
                    if (!lastWriteRef.current.live || now - lastWriteRef.current.live > 2000) {
                        setDoc(doc(db, "live_locations", vehicleId), {
                            ...newLoc,
                            organization_id: organizationId,
                            last_updated: new Date().toISOString(),
                            status: "active",
                        }, { merge: true }).catch(() => { })
                        lastWriteRef.current.live = now
                    }

                    // 2. Append to history — only if moved > 20m from last logged point
                    const distMoved = lastLoggedLoc.current 
                        ? haversine(newLoc.latitude, newLoc.longitude, lastLoggedLoc.current.lat, lastLoggedLoc.current.lng)
                        : 999
                    
                    if (distMoved > 0.02) {
                        addDoc(collection(db, "live_locations", vehicleId, "route_history"), {
                            ...newLoc,
                            recorded_at: serverTimestamp(),
                        }).catch(() => { })
                        lastLoggedLoc.current = { lat: newLoc.latitude, lng: newLoc.longitude }
                    }

                    // 3. Heartbeat (vehicles doc) — every 5 seconds
                    if (!lastWriteRef.current.heartbeat || now - lastWriteRef.current.heartbeat > 5000) {
                        setDoc(doc(db, "vehicles", vehicleId), {
                            speed: newLoc.speed,
                            last_position_update: new Date().toISOString(),
                        }, { merge: true }).catch(() => { })
                        lastWriteRef.current.heartbeat = now
                    }
                },
                (err) => {
                    setError(err.message)
                    console.error("Geolocation error:", err)
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000,
                }
            )
        }

        if (isActive && vehicleId) {
            startTracking()
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId)
            }
            if (vehicleId) {
                setDoc(doc(db, "live_locations", vehicleId), {
                    status: "inactive",
                    speed: 0,
                    last_updated: new Date().toISOString(),
                }, { merge: true }).catch(() => { })

                // Also reset speed in vehicles collection
                setDoc(doc(db, "vehicles", vehicleId), {
                    speed: 0,
                }, { merge: true }).catch(() => { })
            }
        }
    }, [isActive, vehicleId])

    return { location, error }
}
