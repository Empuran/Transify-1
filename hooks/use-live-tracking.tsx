import { useState, useEffect, useRef } from "react"
import { doc, setDoc, addDoc, collection, serverTimestamp, deleteField } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface LocationUpdate {
    latitude: number
    longitude: number
    heading: number | null
    speed: number | null
    timestamp: number
}

// Custom hook to handle high-frequency geolocation tracking
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
        let initialTimeoutId: NodeJS.Timeout

        const processLocation = (position: GeolocationPosition) => {
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
        }

        const startTracking = async () => {
            if (!navigator.geolocation) {
                setError("Geolocation is not supported by your browser/phone")
                return
            }

            // PHASE 1: Try to aggressively get the current position IMMEDIATELY
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    processLocation(pos)
                    startWatcher()
                },
                (err) => {
                    console.warn("Fast GPS lock failed, falling back to watchPosition...", err.message)
                    startWatcher()
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
            )

            // Make sure we start the watcher even if getCurrentPosition somehow hangs forever
            initialTimeoutId = setTimeout(() => {
                if (!watchId) startWatcher()
            }, 16000)
        }

        const startWatcher = () => {
            if (watchId) return // Already started
            
            watchId = navigator.geolocation.watchPosition(
                processLocation,
                (err) => {
                    setError(err.message)
                    console.error("Geolocation error:", err)
                    // If high accuracy times out, try low accuracy
                    if (err.code === err.TIMEOUT) {
                        console.log("High accuracy timeout, falling back network-based location...")
                        navigator.geolocation.clearWatch(watchId)
                        watchId = navigator.geolocation.watchPosition(
                            processLocation,
                            (e) => setError("Fallback failed: " + e.message),
                            { enableHighAccuracy: false, maximumAge: 30000, timeout: 60000 }
                        )
                    }
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 60000, // Very long timeout for mobile GPS chip
                }
            )
        }

        if (isActive && vehicleId) {
            // Immediately clear old lat/lng before we start tracking
            setDoc(doc(db, "live_locations", vehicleId), {
                latitude: deleteField(),
                longitude: deleteField(),
                status: "active",
                speed: 0,
                last_updated: new Date().toISOString(),
            }, { merge: true }).catch(() => { })
            
            startTracking()
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId)
            }
            if (initialTimeoutId) {
                clearTimeout(initialTimeoutId)
            }
            if (vehicleId) {
                setDoc(doc(db, "live_locations", vehicleId), {
                    status: "inactive",
                    speed: 0,
                    latitude: deleteField(),  // REMOVE THE STALE LOCATION WHEN INACTIVE
                    longitude: deleteField(), // REMOVE THE STALE LOCATION WHEN INACTIVE
                    last_updated: new Date().toISOString(),
                }, { merge: true }).catch(() => { })

                // Also reset speed in vehicles collection
                setDoc(doc(db, "vehicles", vehicleId), {
                    speed: 0,
                }, { merge: true }).catch(() => { })
            }
        }
    }, [isActive, vehicleId, organizationId])

    return { location, error }
}
