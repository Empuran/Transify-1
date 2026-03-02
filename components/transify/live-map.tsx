"use client";

import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const containerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "0.75rem"
};

// Bangalore default center
const defaultCenter = {
    lat: 12.9716,
    lng: 77.5946,
};

interface VehicleLocation {
    id: string;
    latitude: number;
    longitude: number;
    heading: number | null;
    timestamp: number;
    status: string;
}

interface HistoryPoint {
    lat: number;
    lng: number;
}

interface LiveMapProps {
    organizationId?: string;
}

export function LiveMap({ organizationId }: LiveMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
    // historyByVehicle stores the full path for each vehicleId
    const [historyByVehicle, setHistoryByVehicle] = useState<Record<string, HistoryPoint[]>>({});

    // ── Subscribe to live_locations (current marker positions) ──────────
    useEffect(() => {
        let q = query(
            collection(db, "live_locations"),
            where("status", "==", "active")
        );

        // If organizationId is provided, further filter the results
        // Note: This requires the driver to include organization_id in their push
        if (organizationId) {
            // q = query(q, where("organization_id", "==", organizationId));
            // For now, if organization_id isn't in the push yet, we filter in memory or keep it global
            // But let's assume we WANT it filtered.
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const active: VehicleLocation[] = [];
            snapshot.forEach((doc) => {
                const d = doc.data();
                // Client-side filtering as fallback if organization_id isn't in the document yet
                if (organizationId && d.organization_id && d.organization_id !== organizationId) {
                    return;
                }
                active.push({
                    id: doc.id,
                    latitude: d.latitude,
                    longitude: d.longitude,
                    heading: d.heading,
                    timestamp: d.timestamp,
                    status: d.status,
                });
            });
            setVehicles(active);
        }, (err) => console.error("LiveMap Firestore error:", err));

        return () => unsubscribe();
    }, [organizationId]);

    // ── For each active vehicle, subscribe to its route_history ────────
    useEffect(() => {
        if (vehicles.length === 0) return;

        const unsubscribers: (() => void)[] = [];

        vehicles.forEach((vehicle) => {
            const historyRef = collection(db, "live_locations", vehicle.id, "route_history");
            const q = query(historyRef, orderBy("recorded_at", "asc"));

            const unsub = onSnapshot(q, (snapshot) => {
                const points: HistoryPoint[] = [];
                snapshot.forEach((doc) => {
                    const d = doc.data();
                    if (d.latitude && d.longitude) {
                        points.push({ lat: d.latitude, lng: d.longitude });
                    }
                });
                setHistoryByVehicle((prev) => ({ ...prev, [vehicle.id]: points }));
            }, (err) => console.error(`Route history error for ${vehicle.id}:`, err));

            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach((u) => u());
    }, [vehicles]);

    const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
    const onUnmount = useCallback(() => setMap(null), []);

    if (loadError) {
        return (
            <div className="flex w-full h-full items-center justify-center bg-muted/20 rounded-xl border border-border">
                <p className="text-destructive font-medium text-sm">
                    Failed to load Google Maps. Check your API key.
                </p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex w-full h-full items-center justify-center bg-muted/20 rounded-xl border border-border">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const center = vehicles.length > 0
        ? { lat: vehicles[0].latitude, lng: vehicles[0].longitude }
        : defaultCenter;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={vehicles.length > 0 ? 15 : 12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeControl: false,
                fullscreenControl: true,
            }}
        >
            {vehicles.map((v) => (
                <>
                    {/* ── Full route trail as a blue Polyline ── */}
                    {historyByVehicle[v.id] && historyByVehicle[v.id].length > 1 && (
                        <Polyline
                            key={`trail-${v.id}`}
                            path={historyByVehicle[v.id]}
                            options={{
                                strokeColor: "#2563EB",    // Transify blue
                                strokeOpacity: 0.9,
                                strokeWeight: 5,
                                geodesic: true,
                            }}
                        />
                    )}

                    {/* ── Start point marker (where trip began) ── */}
                    {historyByVehicle[v.id] && historyByVehicle[v.id].length > 0 && (
                        <Marker
                            key={`start-${v.id}`}
                            position={historyByVehicle[v.id][0]}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 7,
                                fillColor: "#22c55e",   // green start dot
                                fillOpacity: 1,
                                strokeColor: "#fff",
                                strokeWeight: 2,
                            }}
                            title="Trip Start"
                        />
                    )}

                    {/* ── Current live vehicle marker (bus icon) ── */}
                    <Marker
                        key={`vehicle-${v.id}`}
                        position={{ lat: v.latitude, lng: v.longitude }}
                        icon={{
                            url: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
                            scaledSize: new window.google.maps.Size(44, 44),
                            anchor: new window.google.maps.Point(22, 22),
                        }}
                        title={v.id}
                    />
                </>
            ))}
        </GoogleMap>
    );
}
