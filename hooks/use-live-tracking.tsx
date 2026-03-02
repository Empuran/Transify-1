import { useState, useEffect } from "react"
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

    useEffect(() => {
        let watchId: number

        const startTracking = async () => {
            if (!navigator.geolocation) {
                setError("Geolocation is not supported by your browser/phone")
                return
            }

            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const newLoc: LocationUpdate = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        heading: position.coords.heading,   // direction 0-360°
                        speed: position.coords.speed,       // m/s
                        timestamp: position.timestamp,
                    }

                    setLocation(newLoc)

                    try {
                        // 1. Update current live position (single doc — always latest)
                        await setDoc(doc(db, "live_locations", vehicleId), {
                            ...newLoc,
                            organization_id: organizationId,
                            last_updated: new Date().toISOString(),
                            status: "active",
                        }, { merge: true })

                        // 2. Append to route history subcollection (one doc per point — full path)
                        await addDoc(collection(db, "live_locations", vehicleId, "route_history"), {
                            latitude: newLoc.latitude,
                            longitude: newLoc.longitude,
                            heading: newLoc.heading,
                            speed: newLoc.speed,
                            timestamp: newLoc.timestamp,
                            recorded_at: serverTimestamp(),
                        })

                        // 3. Sync status back to main vehicles collection
                        // This ensures Admin Dashboard filters (StatusBadge) show the vehicle as active
                        await setDoc(doc(db, "vehicles", vehicleId), {
                            status: "on-time",
                            organization_id: organizationId, // Keep sync for safety
                            last_position_update: new Date().toISOString(),
                        }, { merge: true })
                    } catch (err: any) {
                        console.error("Failed to push location:", err)
                        // Note: Offline queue (IndexedDB) will be added in the Capacitor native phase
                    }
                },
                (err) => {
                    setError(err.message)
                    console.error("Geolocation error:", err)
                },
                {
                    enableHighAccuracy: true,   // Uses GPS chip, not WiFi/cell tower triangulation
                    maximumAge: 0,              // Never use a cached position
                    timeout: 10000,             // Give 10s to get a fix (more lenient on low signal)
                }
            )
        }

        if (isActive && vehicleId) {
            startTracking()
        }

        // On trip end: mark vehicle as inactive
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId)
            }
            if (isActive && vehicleId) {
                setDoc(doc(db, "live_locations", vehicleId), {
                    status: "inactive",
                    last_updated: new Date().toISOString(),
                }, { merge: true }).catch(() => { })

                // Mark vehicle as off-duty in main collection
                setDoc(doc(db, "vehicles", vehicleId), {
                    status: "off-duty",
                }, { merge: true }).catch(() => { })
            }
        }
    }, [isActive, vehicleId])

    return { location, error }
}
