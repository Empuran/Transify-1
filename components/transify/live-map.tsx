"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const containerStyle = { width: "100%", height: "100%", borderRadius: "0.75rem" };

const defaultCenter = { lat: 12.9716, lng: 77.5946 };

// ── Vehicle type → emoji character used as Google Maps marker label ─────────
function getVehicleEmoji(type: string = ""): string {
    const t = type.toLowerCase();
    if (t.includes("car")) return "🚗";
    if (t.includes("bike") || t.includes("scooter") || t.includes("motorbike") || t.includes("two")) return "🏍";
    if (t.includes("truck") || t.includes("lorry")) return "🚛";
    if (t.includes("van") || t.includes("mini") || t.includes("shuttle")) return "🚐";
    if (t.includes("auto") || t.includes("rickshaw")) return "🛺";
    return "🚌"; // default bus
}

// ── Build a data-URI SVG marker for the vehicle (lightweight, no external URL) ─
function makeSvgMarkerUrl(type: string = "", status: string = "on-time"): string {
    const t = type.toLowerCase();
    const statusColor = status === "emergency" ? "#ef4444" : status === "delayed" ? "#f59e0b" : "#22c55e";

    let vehicleSvg = "";
    if (t.includes("car")) {
        vehicleSvg = `<rect x="4" y="12" width="36" height="16" rx="4" fill="#3b82f6"/>
<rect x="8" y="5" width="28" height="13" rx="3" fill="#60a5fa"/>
<rect x="10" y="7" width="8" height="8" rx="1" fill="#bfdbfe"/>
<rect x="26" y="7" width="8" height="8" rx="1" fill="#bfdbfe"/>
<circle cx="11" cy="29" r="5" fill="#1e293b"/><circle cx="11" cy="29" r="3" fill="#475569"/>
<circle cx="33" cy="29" r="5" fill="#1e293b"/><circle cx="33" cy="29" r="3" fill="#475569"/>`;
    } else if (t.includes("bike") || t.includes("scooter") || t.includes("motorbike") || t.includes("two")) {
        vehicleSvg = `<circle cx="10" cy="26" r="7" stroke="#3b82f6" stroke-width="3" fill="none"/>
<circle cx="34" cy="26" r="7" stroke="#3b82f6" stroke-width="3" fill="none"/>
<path d="M10 26 L22 14 L34 26" stroke="#3b82f6" stroke-width="3" fill="none"/>
<path d="M22 14 L25 6" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round"/>
<rect x="16" y="11" width="9" height="6" rx="2" fill="#60a5fa"/>`;
    } else if (t.includes("truck") || t.includes("lorry")) {
        vehicleSvg = `<rect x="2" y="8" width="40" height="20" rx="3" fill="#3b82f6"/>
<rect x="2" y="8" width="14" height="20" rx="3" fill="#1d4ed8"/>
<rect x="4" y="10" width="10" height="11" rx="1" fill="#bfdbfe"/>
<circle cx="10" cy="30" r="5" fill="#1e293b"/><circle cx="10" cy="30" r="3" fill="#475569"/>
<circle cx="36" cy="30" r="5" fill="#1e293b"/><circle cx="36" cy="30" r="3" fill="#475569"/>`;
    } else if (t.includes("van") || t.includes("mini") || t.includes("shuttle")) {
        vehicleSvg = `<rect x="2" y="8" width="40" height="20" rx="3" fill="#3b82f6"/>
<rect x="6" y="10" width="8" height="8" rx="1" fill="#bfdbfe"/>
<rect x="18" y="10" width="8" height="8" rx="1" fill="#bfdbfe"/>
<rect x="30" y="10" width="8" height="8" rx="1" fill="#bfdbfe"/>
<circle cx="10" cy="30" r="5" fill="#1e293b"/><circle cx="10" cy="30" r="3" fill="#475569"/>
<circle cx="34" cy="30" r="5" fill="#1e293b"/><circle cx="34" cy="30" r="3" fill="#475569"/>`;
    } else {
        // Default bus
        vehicleSvg = `<rect x="2" y="4" width="40" height="24" rx="4" fill="#3b82f6"/>
<rect x="5" y="7" width="9" height="8" rx="1" fill="#bfdbfe"/>
<rect x="17" y="7" width="9" height="8" rx="1" fill="#bfdbfe"/>
<rect x="29" y="7" width="9" height="8" rx="1" fill="#bfdbfe"/>
<rect x="2" y="22" width="40" height="4" fill="#2563eb"/>
<circle cx="10" cy="31" r="5" fill="#1e293b"/><circle cx="10" cy="31" r="3" fill="#475569"/>
<circle cx="34" cy="31" r="5" fill="#1e293b"/><circle cx="34" cy="31" r="3" fill="#475569"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 40" width="44" height="40">
${vehicleSvg}
<circle cx="38" cy="6" r="6" fill="${statusColor}" stroke="white" stroke-width="1.5"/>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface VehicleLocation {
    id: string;
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
    status: string;
    vehicle_type?: string;
    plate_number?: string;
}

interface RouteStop {
    label: string;     // A, B, C...
    name: string;
    lat?: number;
    lng?: number;
    position?: { lat: number; lng: number };
}

interface HistoryPoint { lat: number; lng: number }

interface LiveMapProps {
    organizationId?: string;
    /** Extra vehicle metadata (type, plate_number) keyed by vehicle ID */
    vehicleMeta?: Record<string, { type?: string; plate_number?: string }>;
    /** Route stops to show as labelled markers */
    routeStops?: RouteStop[];
}

export function LiveMap({ organizationId, vehicleMeta = {}, routeStops = [] }: LiveMapProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
    const [historyByVehicle, setHistoryByVehicle] = useState<Record<string, HistoryPoint[]>>({});

    // ── Subscribe to live_locations ─────────────────────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, "live_locations"),
            where("status", "==", "active")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const active: VehicleLocation[] = [];
            snapshot.forEach((doc) => {
                const d = doc.data();
                if (organizationId && d.organization_id && d.organization_id !== organizationId) return;
                active.push({
                    id: doc.id,
                    latitude: d.latitude,
                    longitude: d.longitude,
                    heading: d.heading,
                    speed: d.speed,
                    timestamp: d.timestamp,
                    status: d.status,
                    vehicle_type: d.vehicle_type,
                    plate_number: d.plate_number,
                });
            });
            setVehicles(active);
        }, (err) => console.error("LiveMap Firestore error:", err));
        return () => unsubscribe();
    }, [organizationId]);

    // ── For each active vehicle, subscribe to route_history ─────────────────
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
                    if (d.latitude && d.longitude) points.push({ lat: d.latitude, lng: d.longitude });
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
                <p className="text-destructive font-medium text-sm">Failed to load Google Maps. Check your API key.</p>
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

    // Stop label alphabet
    const STOP_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={vehicles.length > 0 ? 15 : 12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{ disableDefaultUI: true, zoomControl: true, mapTypeControl: false, fullscreenControl: true }}
        >
            {/* ── Vehicle markers ─────────────────────────────────────── */}
            {vehicles.map((v) => {
                const meta = vehicleMeta[v.id] || {};
                const vType = v.vehicle_type || meta.type || "bus";
                const vStatus = v.status || "on-time";
                const markerUrl = makeSvgMarkerUrl(vType, vStatus);
                const label = meta.plate_number || v.plate_number || v.id.slice(0, 6);

                return (
                    <div key={v.id}>
                        {/* Route trail Polyline */}
                        {historyByVehicle[v.id] && historyByVehicle[v.id].length > 1 && (
                            <Polyline
                                path={historyByVehicle[v.id]}
                                options={{ strokeColor: "#2563EB", strokeOpacity: 0.9, strokeWeight: 5, geodesic: true }}
                            />
                        )}
                        {/* Trip start dot */}
                        {historyByVehicle[v.id] && historyByVehicle[v.id].length > 0 && (
                            <Marker
                                position={historyByVehicle[v.id][0]}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 7,
                                    fillColor: "#22c55e",
                                    fillOpacity: 1,
                                    strokeColor: "#fff",
                                    strokeWeight: 2,
                                }}
                                title="Trip Start"
                            />
                        )}
                        {/* Current vehicle position with type-based SVG icon */}
                        <Marker
                            position={{ lat: v.latitude, lng: v.longitude }}
                            icon={{
                                url: markerUrl,
                                scaledSize: new window.google.maps.Size(52, 48),
                                anchor: new window.google.maps.Point(26, 24),
                            }}
                            label={{
                                text: label,
                                color: "#1e293b",
                                fontSize: "9px",
                                fontWeight: "bold",
                                className: "gmaps-plate-label",
                            }}
                            title={`${label} — ${vType}`}
                        />
                    </div>
                );
            })}

            {/* ── Route Stop markers (A, B, C…) ───────────────────────── */}
            {routeStops.map((stop, i) => {
                const pos = stop.position || (stop.lat && stop.lng ? { lat: stop.lat, lng: stop.lng } : null);
                if (!pos) return null;
                const letter = stop.label || STOP_LABELS[i] || String(i + 1);
                return (
                    <Marker
                        key={`stop-${i}`}
                        position={pos}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 14,
                            fillColor: "#6366f1",
                            fillOpacity: 1,
                            strokeColor: "#fff",
                            strokeWeight: 2,
                        }}
                        label={{
                            text: letter,
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "bold",
                        }}
                        title={stop.name}
                    />
                );
            })}
        </GoogleMap>
    );
}
