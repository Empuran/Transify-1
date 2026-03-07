"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, MapPin, Route, Bus, Plus, Trash2, Check, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useJsApiLoader } from "@react-google-maps/api"

const LIBRARIES: ("places")[] = ["places"]

interface AddRouteFormProps {
    initialData?: any
    onClose: () => void
    onSave: (data: RouteData) => void
}

export interface RouteData {
    routeName: string
    startPoint: string
    endPoint: string
    stops: string[]
    vehicleId: string
    distance_km?: string
}

// vehicleOptions is now fetched dynamically from Firestore

// ── PlacesInput: Input with Google Places Autocomplete ────────────────
function PlacesInput({ value, onChange, placeholder, className, isLoaded }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string; isLoaded: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

    useEffect(() => {
        if (!isLoaded || !inputRef.current || autocompleteRef.current) return
        const ac = new google.maps.places.Autocomplete(inputRef.current, {
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "in" },
        })
        ac.addListener("place_changed", () => {
            const place = ac.getPlace()
            // Try to get the most descriptive name (usually combining name and address)
            const inputVal = inputRef.current?.value
            if (inputVal) {
                onChange(inputVal)
            } else if (place?.formatted_address) {
                onChange(place.formatted_address)
            } else if (place?.name) {
                onChange(place.name)
            }
        })
        autocompleteRef.current = ac
    }, [isLoaded, onChange])

    return (
        <input
            ref={inputRef}
            placeholder={placeholder}
            defaultValue={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
        />
    )
}

export function AddRouteForm({ onClose, onSave, initialData }: AddRouteFormProps) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    })

    const [data, setData] = useState<RouteData>({
        routeName: initialData?.route_name || "",
        startPoint: initialData?.start_point || "",
        endPoint: initialData?.end_point || "",
        stops: initialData?.stops || [""],
        vehicleId: initialData?.vehicle_id || "",
        distance_km: initialData?.distance_km || "0",
    })
    const [showVehicle, setShowVehicle] = useState(false)
    const [saved, setSaved] = useState(false)
    const [calculating, setCalculating] = useState(false)
    const [vehicleOptions, setVehicleOptions] = useState<string[]>(["Unassigned"])

    // Fetch real vehicles from Firestore
    useEffect(() => {
        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id
        if (!orgId) return
        fetch(`/api/vehicles/list?organization_id=${orgId}`)
            .then(r => r.json())
            .then(d => {
                if (d.vehicles) {
                    const plates = d.vehicles.map((v: any) => v.plate_number || v.id)
                    setVehicleOptions([...plates, "Unassigned"])
                }
            }).catch(() => { })
    }, [])

    const isValid = data.routeName.trim() && data.startPoint.trim() && data.endPoint.trim()

    const addStop = () => setData(prev => ({ ...prev, stops: [...prev.stops, ""] }))
    const removeStop = (i: number) => setData(prev => ({ ...prev, stops: prev.stops.filter((_, idx) => idx !== i) }))
    const updateStop = (i: number, val: string) => {
        setData(prev => {
            const updated = [...prev.stops]
            updated[i] = val
            return { ...prev, stops: updated }
        })
    }

    // ── Distance Calculation Logic ───────────────────────────────────────────
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isLoaded && data.startPoint && data.endPoint) {
                calculateDistance()
            }
        }, 1000)
        return () => clearTimeout(timeoutId)
    }, [data.startPoint, data.endPoint, data.stops, isLoaded])

    const calculateDistance = async () => {
        if (!window.google) return
        setCalculating(true)
        try {
            const validStops = data.stops.filter(s => s.trim())
            const service = new window.google.maps.DirectionsService()

            // Calculate the continuous driving route
            const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
                service.route({
                    origin: data.startPoint,
                    destination: data.endPoint,
                    waypoints: validStops.map(s => ({ location: s, stopover: true })),
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === "OK" && result) resolve(result)
                    else reject(status)
                })
            })

            if (response && response.routes && response.routes[0]) {
                const totalMeters = response.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0)
                const km = (totalMeters / 1000).toFixed(1)
                setData(prev => ({ ...prev, distance_km: km }))
            }
        } catch (e) {
            console.error("Distance calc failed:", e)
        } finally {
            setCalculating(false)
        }
    }

    const handleSave = async () => {
        if (!isValid) return

        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id

        if (!orgId) { alert("Organization not found. Please log in again."); return }

        try {
            const endpoint = initialData ? "/api/routes/update" : "/api/routes/add"
            const payload = initialData
                ? { ...data, route_id: initialData.id, organization_id: orgId, stops: data.stops.filter(s => s.trim()), admin_id: adminData?.user_id, admin_email: adminData?.email }
                : { ...data, stops: data.stops.filter(s => s.trim()), organization_id: orgId, admin_id: adminData?.user_id, admin_email: adminData?.email }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            setSaved(true)
            setTimeout(() => { onSave(data); onClose() }, 800)
        } catch (err: any) {
            alert(err.message || `Failed to ${initialData ? "update" : "create"} route`)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl max-h-[90dvh] overflow-y-auto">
                <div className="sticky top-0 bg-card pt-3 pb-2 px-5 z-10">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                                <Route className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground">{initialData ? "Edit Route" : "Add Route"}</h2>
                                <p className="text-xs text-muted-foreground">{initialData ? "Update route details" : "Create a new route"}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 px-5 pb-8">
                    {/* Route Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Route Name</label>
                        <div className="relative">
                            <Route className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="e.g. Route A12" value={data.routeName} onChange={(e) => setData(prev => ({ ...prev, routeName: e.target.value }))} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* Start & End */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Start Point</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-success z-10" />
                                <PlacesInput isLoaded={isLoaded} placeholder="Depot / Origin" value={data.startPoint} onChange={(v) => setData(prev => ({ ...prev, startPoint: v }))} className="pl-9" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">End Point</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive z-10" />
                                <PlacesInput isLoaded={isLoaded} placeholder="School / Office" value={data.endPoint} onChange={(v) => setData(prev => ({ ...prev, endPoint: v }))} className="pl-9" />
                            </div>
                        </div>
                    </div>

                    {/* Stops */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">Pickup Stops</label>
                            <button onClick={addStop} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                                <Plus className="h-3 w-3" /> Add Stop
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {data.stops.map((stop, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 text-[10px] font-bold text-primary">
                                        {i + 1}
                                    </div>
                                    <PlacesInput
                                        isLoaded={isLoaded}
                                        placeholder={`Stop ${i + 1} name`}
                                        value={stop}
                                        onChange={(v) => updateStop(i, v)}
                                        className="flex-1"
                                    />
                                    {data.stops.length > 1 && (
                                        <button onClick={() => removeStop(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-colors hover:bg-destructive/20">
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vehicle Assignment */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Assign Vehicle (optional)</label>
                        <button onClick={() => setShowVehicle(!showVehicle)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                            <div className="flex items-center gap-2">
                                <Bus className="h-4 w-4 text-muted-foreground" />
                                <span className={cn("text-sm", data.vehicleId ? "text-foreground" : "text-muted-foreground")}>{data.vehicleId || "Select vehicle"}</span>
                            </div>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showVehicle && "rotate-180")} />
                        </button>
                        {showVehicle && (
                            <div className="mt-1 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-md">
                                {vehicleOptions.map((v) => (
                                    <button key={v} onClick={() => { setData(prev => ({ ...prev, vehicleId: v })); setShowVehicle(false) }}
                                        className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors", data.vehicleId === v ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                        {data.vehicleId === v && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Distance Display */}
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border/50">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Calculated Distance</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-foreground">{data.distance_km || "0"}</span>
                                <span className="text-sm font-bold text-muted-foreground">km</span>
                            </div>
                        </div>
                        {calculating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Route className="h-5 w-5 text-primary" />
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={!isValid || calculating}
                        className={cn("h-14 rounded-xl font-bold text-base mt-1 transition-all", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}
                    >
                        {saved ? (
                            <><Check className="mr-2 h-5 w-5" />{initialData ? "Route Updated!" : "Route Created!"}</>
                        ) : (
                            initialData ? "Update Route" : "Save Route"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
