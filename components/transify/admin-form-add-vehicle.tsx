"use client"

import { useState, useEffect } from "react"
import { X, Bus, Users, Hash, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AddVehicleFormProps {
    initialData?: any
    onClose: () => void
    onSave: (data: VehicleData) => void
}

export interface VehicleData {
    plateNumber: string
    type: string
    capacity: string
    driverName: string
    fuelType: string
}

const vehicleTypes = ["School Bus", "Mini Bus", "Van", "Car", "Shuttle"]
const fuelTypes = ["Diesel", "Petrol", "CNG", "Electric", "Hybrid"]

export function AddVehicleForm({ onClose, onSave, initialData }: AddVehicleFormProps) {
    const [data, setData] = useState<VehicleData & { driverId?: string }>({
        plateNumber: initialData?.plate_number || initialData?.plateNumber || "",
        type: initialData?.type || "",
        capacity: initialData?.capacity || "",
        driverName: initialData?.driver_name || initialData?.driverName || "",
        fuelType: initialData?.fuel_type || initialData?.fuelType || "",
        driverId: initialData?.driver_id || "",
    })
    const [showType, setShowType] = useState(false)
    const [showFuel, setShowFuel] = useState(false)
    const [showDriver, setShowDriver] = useState(false)
    const [saved, setSaved] = useState(false)
    const [driverOptions, setDriverOptions] = useState<{ name: string, id: string }[]>([{ name: "Unassigned", id: "" }])

    // Fetch real drivers from Firestore
    useEffect(() => {
        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id
        if (!orgId) return
        fetch(`/api/drivers/list?organization_id=${orgId}`)
            .then(r => r.json())
            .then(d => {
                if (d.drivers) {
                    const options = d.drivers.map((dr: any) => ({ name: dr.name, id: dr.id }))
                    setDriverOptions([...options, { name: "Unassigned", id: "" }])
                }
            }).catch(() => { })
    }, [])

    const isValid = data.plateNumber.trim() && data.type && data.capacity.trim()

    const handleSave = async () => {
        if (!isValid) return

        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id

        if (!orgId) { alert("Organization not found. Please log in again."); return }

        try {
            const endpoint = initialData ? "/api/vehicles/update" : "/api/vehicles/add"
            const payload = initialData
                ? { ...data, vehicle_id: initialData.id, organization_id: orgId, admin_id: adminData?.user_id, admin_email: adminData?.email }
                : { ...data, organization_id: orgId, admin_id: adminData?.user_id, admin_email: adminData?.email }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            setSaved(true)
            setTimeout(() => { onSave(data as any); onClose() }, 800)
        } catch (err: any) {
            alert(err.message || `Failed to ${initialData ? "update" : "add"} vehicle`)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl">
                <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />

                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Bus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">{initialData ? "Edit Vehicle" : "Add Vehicle"}</h2>
                            <p className="text-xs text-muted-foreground">{initialData ? "Update vehicle details" : "Register a new vehicle"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex flex-col gap-4 px-5 pb-8">
                    {/* Plate Number */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Number Plate</label>
                        <div className="relative">
                            <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="e.g. KA-01-AB-1234"
                                value={data.plateNumber}
                                onChange={(e) => setData({ ...data, plateNumber: e.target.value.toUpperCase() })}
                                className="h-12 rounded-xl bg-background pl-10 font-mono tracking-widest"
                            />
                        </div>
                    </div>

                    {/* Type & Fuel */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Vehicle Type</label>
                            <button onClick={() => setShowType(!showType)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3">
                                <span className={cn("text-sm", data.type ? "text-foreground" : "text-muted-foreground")}>{data.type || "Select"}</span>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showType && "rotate-180")} />
                            </button>
                            {showType && (
                                <div className="mt-1 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-md z-10">
                                    {vehicleTypes.map((t) => (
                                        <button key={t} onClick={() => { setData({ ...data, type: t }); setShowType(false) }}
                                            className={cn("rounded-lg px-3 py-2 text-sm text-left transition-colors", data.type === t ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Fuel Type</label>
                            <button onClick={() => setShowFuel(!showFuel)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3">
                                <span className={cn("text-sm", data.fuelType ? "text-foreground" : "text-muted-foreground")}>{data.fuelType || "Select"}</span>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showFuel && "rotate-180")} />
                            </button>
                            {showFuel && (
                                <div className="mt-1 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-md z-10">
                                    {fuelTypes.map((f) => (
                                        <button key={f} onClick={() => { setData({ ...data, fuelType: f }); setShowFuel(false) }}
                                            className={cn("rounded-lg px-3 py-2 text-sm text-left transition-colors", data.fuelType === f ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Capacity */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Seating Capacity</label>
                        <div className="relative">
                            <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="number"
                                placeholder="e.g. 40"
                                value={data.capacity}
                                onChange={(e) => setData({ ...data, capacity: e.target.value })}
                                className="h-12 rounded-xl bg-background pl-10"
                            />
                        </div>
                    </div>

                    {/* Assign Driver */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Assign Driver (optional)</label>
                        <button onClick={() => setShowDriver(!showDriver)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                            <span className={cn("text-sm", data.driverName ? "text-foreground" : "text-muted-foreground")}>{data.driverName || "Select driver"}</span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showDriver && "rotate-180")} />
                        </button>
                        {showDriver && (
                            <div className="mt-1 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-md max-h-48 overflow-y-auto">
                                {driverOptions.map((d: { name: string, id: string }) => (
                                    <button 
                                        key={`${d.id}-${d.name}`} 
                                        onClick={() => { setData({ ...data, driverName: d.name, driverId: d.id }); setShowDriver(false) }}
                                        className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors", data.driverId === d.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}
                                    >
                                        {data.driverId === d.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={cn("h-14 rounded-xl font-bold text-base mt-1 transition-all", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}
                    >
                        {saved ? (
                            <><Check className="mr-2 h-5 w-5" />{initialData ? "Vehicle Updated!" : "Vehicle Added!"}</>
                        ) : (
                            initialData ? "Update Vehicle" : "Save Vehicle"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
