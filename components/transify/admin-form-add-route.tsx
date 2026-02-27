"use client"

import { useState } from "react"
import { X, MapPin, Route, Bus, Plus, Trash2, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AddRouteFormProps {
    onClose: () => void
    onSave: (data: RouteData) => void
}

export interface RouteData {
    routeName: string
    startPoint: string
    endPoint: string
    stops: string[]
    vehicleId: string
}

const vehicleOptions = ["KA-01-AB-1234", "KA-05-CD-5678", "KA-09-EF-9012", "KA-12-GH-3456", "Unassigned"]

export function AddRouteForm({ onClose, onSave }: AddRouteFormProps) {
    const [data, setData] = useState<RouteData>({
        routeName: "", startPoint: "", endPoint: "", stops: [""], vehicleId: "",
    })
    const [showVehicle, setShowVehicle] = useState(false)
    const [saved, setSaved] = useState(false)

    const isValid = data.routeName.trim() && data.startPoint.trim() && data.endPoint.trim()

    const addStop = () => setData({ ...data, stops: [...data.stops, ""] })
    const removeStop = (i: number) => setData({ ...data, stops: data.stops.filter((_, idx) => idx !== i) })
    const updateStop = (i: number, val: string) => {
        const updated = [...data.stops]
        updated[i] = val
        setData({ ...data, stops: updated })
    }

    const handleSave = () => {
        if (!isValid) return
        setSaved(true)
        setTimeout(() => { onSave({ ...data, stops: data.stops.filter(s => s.trim()) }); onClose() }, 800)
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
                                <h2 className="text-base font-bold text-foreground">Add Route</h2>
                                <p className="text-xs text-muted-foreground">Create a new route</p>
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
                            <Input placeholder="e.g. Route A12" value={data.routeName} onChange={(e) => setData({ ...data, routeName: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* Start & End */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Start Point</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-success" />
                                <Input placeholder="Depot / Origin" value={data.startPoint} onChange={(e) => setData({ ...data, startPoint: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">End Point</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                                <Input placeholder="School / Office" value={data.endPoint} onChange={(e) => setData({ ...data, endPoint: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
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
                                    <Input
                                        placeholder={`Stop ${i + 1} name`}
                                        value={stop}
                                        onChange={(e) => updateStop(i, e.target.value)}
                                        className="h-10 flex-1 rounded-xl bg-background text-sm"
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
                                    <button key={v} onClick={() => { setData({ ...data, vehicleId: v }); setShowVehicle(false) }}
                                        className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors", data.vehicleId === v ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                        {data.vehicleId === v && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        {v}
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
                        {saved ? <><Check className="mr-2 h-5 w-5" />Route Created!</> : "Save Route"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
