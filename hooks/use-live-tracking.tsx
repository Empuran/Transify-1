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
                    const speedKmh = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0
                    const newLoc: LocationUpdate = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        heading: position.coords.heading,
                        speed: speedKmh,
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

                        // 3. Update last position heartbeat and cached speed for list views
                        await setDoc(doc(db, "vehicles", vehicleId), {
                            speed: newLoc.speed,
                            last_position_update: new Date().toISOString(),
                        }, { merge: true })
                    } catch (err: any) {
                        console.error("Failed to push location:", err)
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
