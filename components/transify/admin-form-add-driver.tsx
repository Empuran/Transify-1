"use client"

import { useState, useEffect } from "react"
import { X, User, Phone, CreditCard, Bus, Building2, Check, ChevronDown, Home, Camera, Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/utils"

interface AddDriverFormProps {
    initialData?: any
    onClose: () => void
    onSave: (data: DriverData) => void
}

export interface DriverData {
    name: string
    phone: string
    licenseNumber: string
    vehicleId: string
    organization: string
    licenseType: string
    address?: string
    photo_url?: string
    join_date?: string
}

const licenseTypes = ["LMV", "HMV", "HTV", "PSV", "HPMV"]

export function AddDriverForm({ onClose, onSave, initialData }: AddDriverFormProps) {
    const [data, setData] = useState<DriverData>({
        name: initialData?.name || "",
        phone: initialData?.phone || "",
        licenseNumber: initialData?.license_number || initialData?.licenseNumber || "",
        vehicleId: initialData?.vehicle_id || initialData?.vehicleId || "",
        organization: initialData?.organization || "",
        licenseType: initialData?.license_type || initialData?.licenseType || "",
        address: initialData?.address || "",
        photo_url: initialData?.photo_url || "",
        join_date: initialData?.join_date || "",
    })
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [showVehicle, setShowVehicle] = useState(false)
    const [showLicense, setShowLicense] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(false)
    const [vehicleOptions, setVehicleOptions] = useState<string[]>(["Unassigned"])
    const isInactive = initialData?.lifecycle_status === "INACTIVE"

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

    const isValid = data.name.trim() && data.phone.trim() && data.licenseNumber.trim() && data.licenseType

    const handleSave = async () => {
        if (!isValid) return
        setLoading(true)

        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id

        if (!orgId) {
            alert("Organization not found. Please log in again.")
            setLoading(false)
            return
        }

        try {
            let finalPhotoUrl = data.photo_url;
            if (photoFile) {
                finalPhotoUrl = await compressImage(photoFile, 500, 500, 0.6);
            }

            const endpoint = initialData ? "/api/drivers/update" : "/api/drivers/add"
            const payload = initialData
                ? { ...data, photo_url: finalPhotoUrl, driver_id: initialData.id, organization_id: orgId, admin_id: adminData?.user_id, admin_email: adminData?.email }
                : { ...data, photo_url: finalPhotoUrl, organization_id: orgId, admin_id: adminData?.user_id, admin_email: adminData?.email }

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
            alert(err.message || `Failed to ${initialData ? "update" : "add"} driver`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl max-h-[92dvh] overflow-y-auto">
                <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10">
                            <User className="h-5 w-5 text-teal" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">{initialData ? "Edit Driver" : "Add Driver"}</h2>
                            <p className="text-xs text-muted-foreground">{initialData ? "Update driver details" : "Onboard a new driver"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex flex-col gap-4 px-5 pb-8">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="e.g. Rajesh Kumar" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="+91 98765 43210" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* License */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">License No.</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="DL-0123..." value={data.licenseNumber} onChange={(e) => setData({ ...data, licenseNumber: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">License Type</label>
                            <button onClick={() => setShowLicense(!showLicense)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3">
                                <span className={cn("text-sm", data.licenseType ? "text-foreground" : "text-muted-foreground")}>{data.licenseType || "Type"}</span>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showLicense && "rotate-180")} />
                            </button>
                            {showLicense && (
                                <div className="absolute mt-14 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-2 shadow-md z-10">
                                    {licenseTypes.map((t) => (
                                        <button key={t} onClick={() => { setData({ ...data, licenseType: t }); setShowLicense(false) }}
                                            className={cn("rounded-lg py-2 text-xs font-medium transition-colors", data.licenseType === t ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                            <span>Assign Vehicle</span>
                            {isInactive && <span className="text-[10px] text-destructive font-bold uppercase tracking-tighter">Inactive Driver</span>}
                        </label>
                        <button 
                            onClick={() => !isInactive && setShowVehicle(!showVehicle)} 
                            disabled={isInactive}
                            className={cn(
                                "flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5 transition-colors",
                                isInactive ? "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/30" : "hover:border-primary/30"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Bus className="h-4 w-4 text-muted-foreground" />
                                <span className={cn("text-sm", data.vehicleId ? "text-foreground" : "text-muted-foreground")}>
                                    {isInactive ? "Restore driver status to assign" : (data.vehicleId || "Select vehicle (optional)")}
                                </span>
                            </div>
                            {!isInactive && <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showVehicle && "rotate-180")} />}
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

                    {/* Address */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Address</label>
                        <div className="relative">
                            <Home className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Street, City, State" value={data.address || ""} onChange={(e) => setData({ ...data, address: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* Photo URL & Join Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                                <span>Photo</span>
                                {data.photo_url && !photoFile && <span className="text-[10px] text-success font-bold">Uploaded</span>}
                            </label>
                            <div className="flex gap-2">
                                {(photoFile || data.photo_url) && (
                                    <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-border bg-muted">
                                        <img src={photoFile ? URL.createObjectURL(photoFile) : data.photo_url} alt="Photo" className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <div className="relative flex-1">
                                    <Camera className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className={cn("h-12 rounded-xl bg-background pt-3 file:hidden", (photoFile || data.photo_url) ? "pl-9 text-[10px]" : "pl-10 text-xs")} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Join Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="date" value={data.join_date || ""} onChange={(e) => setData({ ...data, join_date: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                            </div>
                        </div>
                    </div>

                    {/* Organization */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Organization</label>
                        <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Delhi Public School" value={data.organization} onChange={(e) => setData({ ...data, organization: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={!isValid || loading || saved}
                        className={cn("h-14 rounded-xl font-bold text-base mt-1 transition-all", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}>
                        {saved ? (
                            <><Check className="mr-2 h-5 w-5" />{initialData ? "Driver Updated!" : "Driver Added!"}</>
                        ) : loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            initialData ? "Update Driver" : "Save Driver"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
