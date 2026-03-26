"use client"

import { useState, useEffect } from "react"
import { X, Bus, Users, Hash, Check, ChevronDown, Calendar, Shield, Wrench, Cpu, MapPin, Route, Camera, AlertOctagon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { clientAuditLog } from "@/lib/audit-logger-client"

interface AddVehicleFormProps {
    initialData?: any
    onClose: () => void
    onSave: (data: any) => void
}

export interface VehicleData {
    plateNumber: string
    type: string
    capacity: string
    driverName: string
    driverId: string
    driver_phone?: string
    driver_photo?: string
    fuelType: string
    // Lifecycle & Details
    brand_model: string
    year: string
    backup_driver_id: string
    backup_driver_name: string
    // Compliance
    rc_expiry: string
    insurance_expiry: string
    puc_expiry: string
    fitness_expiry: string
    permit_expiry: string
    // Maintenance
    last_service_date: string
    next_service_due_date: string
    odometer: string
    // Devices
    gps_device_id: string
    rfid_device_id: string
    camera_installed: boolean
    panic_button_available: boolean
    // Assignment
    route_id: string
    route_name: string
}

const vehicleTypes = ["School Bus", "Mini Bus", "Van", "Car", "Shuttle"]
const fuelTypes = ["Diesel", "Petrol", "CNG", "Electric", "Hybrid"]

export function AddVehicleForm({ onClose, onSave, initialData }: AddVehicleFormProps) {
    const [data, setData] = useState<VehicleData>({
        plateNumber: initialData?.plate_number || initialData?.plateNumber || "",
        type: initialData?.type || "",
        capacity: initialData?.capacity || "",
        driverName: initialData?.driver_name || initialData?.driverName || "",
        driverId: initialData?.driver_id || "",
        driver_phone: initialData?.driver_phone || "",
        driver_photo: initialData?.driver_photo || "",
        fuelType: initialData?.fuel_type || initialData?.fuelType || "",
        brand_model: initialData?.brand_model || "",
        year: initialData?.year || "",
        backup_driver_id: initialData?.backup_driver_id || "",
        backup_driver_name: initialData?.backup_driver_name || "",
        rc_expiry: initialData?.rc_expiry || "",
        insurance_expiry: initialData?.insurance_expiry || "",
        puc_expiry: initialData?.puc_expiry || "",
        fitness_expiry: initialData?.fitness_expiry || "",
        permit_expiry: initialData?.permit_expiry || "",
        last_service_date: initialData?.last_service_date || "",
        next_service_due_date: initialData?.next_service_due_date || "",
        odometer: initialData?.odometer || "",
        gps_device_id: initialData?.gps_device_id || "",
        rfid_device_id: initialData?.rfid_device_id || "",
        camera_installed: initialData?.camera_installed || false,
        panic_button_available: initialData?.panic_button_available || false,
        route_id: initialData?.route_id || "",
        route_name: initialData?.route_name || initialData?.route || "",
    })

    const [activeSection, setActiveSection] = useState<string | null>(null)
    const [showType, setShowType] = useState(false)
    const [showFuel, setShowFuel] = useState(false)
    const [showDriver, setShowDriver] = useState(false)
    const [showBackupDriver, setShowBackupDriver] = useState(false)
    const [showRoute, setShowRoute] = useState(false)
    const [saved, setSaved] = useState(false)
    
    const [driverOptions, setDriverOptions] = useState<{ name: string, id: string, photo_url?: string, phone?: string }[]>([{ name: "Unassigned", id: "" }])
    const [routeOptions, setRouteOptions] = useState<{ name: string, id: string }[]>([{ name: "Unassigned", id: "" }])

    useEffect(() => {
        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id
        if (!orgId) return

        const fetchData = async () => {
            try {
                // Fetch Drivers
                const dQ = query(collection(db, "drivers"), where("organization_id", "==", orgId), where("lifecycle_status", "==", "ACTIVE"))
                const dSnap = await getDocs(dQ)
                const dOptions = dSnap.docs.map(doc => {
                    const d = doc.data()
                    return { name: d.name, id: doc.id, photo_url: d.photo_url, phone: d.phone || d.phone_number || "" }
                })
                setDriverOptions([...dOptions, { name: "Unassigned", id: "" }])

                // Fetch Routes
                const rQ = query(collection(db, "routes"), where("organization_id", "==", orgId))
                const rSnap = await getDocs(rQ)
                const rOptions = rSnap.docs.map(doc => ({ name: doc.data().route_name, id: doc.id }))
                setRouteOptions([...rOptions, { name: "Unassigned", id: "" }])
            } catch (err) {
                console.error("Failed to fetch drivers/routes:", err)
            }
        }
        fetchData()
    }, [])

    const isValid = data.plateNumber.trim() && data.type && data.capacity.trim()

    const handleSave = async () => {
        if (!isValid) return

        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id

        if (!orgId) { alert("Organization not found. Please log in again."); return }

        try {
            const vehiclePayload = {
                ...data,
                organization_id: orgId,
                updated_at: serverTimestamp(),
                plate_number: data.plateNumber, // Sync fields
                fuel_type: data.fuelType
            }

            if (initialData) {
                await updateDoc(doc(db, "vehicles", initialData.id), vehiclePayload)
                await clientAuditLog(orgId, adminData.user_id, adminData.email, "VEHICLE_UPDATE", `Updated vehicle ${data.plateNumber}`)
            } else {
                await addDoc(collection(db, "vehicles"), {
                    ...vehiclePayload,
                    created_at: serverTimestamp()
                })
                await clientAuditLog(orgId, adminData.user_id, adminData.email, "VEHICLE_ADD", `Registered new vehicle ${data.plateNumber}`)
            }

            setSaved(true)
            setTimeout(() => { onSave(data); onClose() }, 800)
        } catch (err: any) {
            alert(err.message || `Failed to ${initialData ? "update" : "add"} vehicle`)
        }
    }

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section)
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-lg animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl flex flex-col max-h-[90vh]">
                <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted shrink-0" />

                <div className="flex items-center justify-between px-6 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Bus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">{initialData ? "Edit Vehicle" : "Add Vehicle"}</h2>
                            <p className="text-xs text-muted-foreground">{initialData ? "Update vehicle details & compliance" : "Register a new vehicle with lifecycle data"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6 scrollbar-hide">
                    {/* Basic Details Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Bus className="h-3.5 w-3.5" /> Basic Details
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Plate Number</label>
                                <Input
                                    placeholder="KA-01-AB-1234"
                                    value={data.plateNumber}
                                    onChange={(e) => setData({ ...data, plateNumber: e.target.value.toUpperCase() })}
                                    className="h-11 rounded-xl bg-background font-mono text-sm tracking-wider"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs font-semibold text-foreground">Vehicle Type</label>
                                <button onClick={() => setShowType(!showType)} className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-3">
                                    <span className={cn("text-xs", data.type ? "text-foreground font-medium" : "text-muted-foreground")}>{data.type || "Select"}</span>
                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showType && "rotate-180")} />
                                </button>
                                {showType && (
                                    <div className="absolute top-full left-0 right-0 z-[80] mt-1 flex flex-col gap-1 rounded-xl border border-border bg-card p-2 shadow-xl">
                                        {vehicleTypes.map((t) => (
                                            <button key={t} onClick={() => { setData({ ...data, type: t }); setShowType(false) }}
                                                className={cn("rounded-lg px-3 py-2 text-xs text-left transition-colors", data.type === t ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Brand / Model</label>
                                <Input
                                    placeholder="e.g. Tata Marcopolo"
                                    value={data.brand_model}
                                    onChange={(e) => setData({ ...data, brand_model: e.target.value })}
                                    className="h-11 rounded-xl bg-background text-xs"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Year of Mfg</label>
                                <Input
                                    type="number"
                                    placeholder="2022"
                                    value={data.year}
                                    onChange={(e) => setData({ ...data, year: e.target.value })}
                                    className="h-11 rounded-xl bg-background text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Seating Capacity</label>
                                <Input
                                    type="number"
                                    placeholder="40"
                                    value={data.capacity}
                                    onChange={(e) => setData({ ...data, capacity: e.target.value })}
                                    className="h-11 rounded-xl bg-background text-xs"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs font-semibold text-foreground">Fuel Type</label>
                                <button onClick={() => setShowFuel(!showFuel)} className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-3">
                                    <span className={cn("text-xs", data.fuelType ? "text-foreground font-medium" : "text-muted-foreground")}>{data.fuelType || "Select"}</span>
                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showFuel && "rotate-180")} />
                                </button>
                                {showFuel && (
                                    <div className="absolute top-full left-0 right-0 z-[80] mt-1 flex flex-col gap-1 rounded-xl border border-border bg-card p-2 shadow-xl">
                                        {fuelTypes.map((f) => (
                                            <button key={f} onClick={() => { setData({ ...data, fuelType: f }); setShowFuel(false) }}
                                                className={cn("rounded-lg px-3 py-2 text-xs text-left transition-colors", data.fuelType === f ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Assignment Section */}
                    <SectionToggle title="Driver & Route Assignment" icon={<MapPin className="h-3.5 w-3.5" />} isOpen={activeSection === "assignment"} onClick={() => toggleSection("assignment")}>
                        <div className="space-y-4 pt-2 pb-1">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Primary Driver</label>
                                <SelectButton value={data.driverName} placeholder="Assign primary driver" onClick={() => setShowDriver(!showDriver)} isOpen={showDriver}>
                                    {driverOptions.map(d => (
                                        <button key={d.id} onClick={() => { setData({ ...data, driverName: d.name, driverId: d.id, driver_photo: d.photo_url, driver_phone: d.phone }); setShowDriver(false) }}
                                            className={cn("px-3 py-2 text-xs text-left hover:bg-muted rounded-lg flex items-center gap-2", data.driverId === d.id && "bg-primary/10 text-primary")}>
                                            {d.photo_url && (
                                                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-border">
                                                    <img src={d.photo_url} alt={d.name} className="h-full w-full object-cover" />
                                                </div>
                                            )}
                                            {d.name}
                                        </button>
                                    ))}
                                </SelectButton>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Backup Driver (optional)</label>
                                <SelectButton value={data.backup_driver_name} placeholder="Assign backup driver" onClick={() => setShowBackupDriver(!showBackupDriver)} isOpen={showBackupDriver}>
                                    {driverOptions.map(d => (
                                        <button key={d.id} onClick={() => { setData({ ...data, backup_driver_name: d.name, backup_driver_id: d.id }); setShowBackupDriver(false) }}
                                            className={cn("px-3 py-2 text-xs text-left hover:bg-muted rounded-lg", data.backup_driver_id === d.id && "bg-primary/10 text-primary")}>{d.name}</button>
                                    ))}
                                </SelectButton>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Assigned Route (optional)</label>
                                <SelectButton value={data.route_name} placeholder="Assign route" onClick={() => setShowRoute(!showRoute)} isOpen={showRoute}>
                                    {routeOptions.map(r => (
                                        <button key={r.id} onClick={() => { setData({ ...data, route_name: r.name, route_id: r.id }); setShowRoute(false) }}
                                            className={cn("px-3 py-2 text-xs text-left hover:bg-muted rounded-lg", data.route_id === r.id && "bg-primary/10 text-primary")}>{r.name}</button>
                                    ))}
                                </SelectButton>
                            </div>
                        </div>
                    </SectionToggle>

                    {/* Compliance Section */}
                    <SectionToggle title="Compliance & Legal Details" icon={<Shield className="h-3.5 w-3.5" />} isOpen={activeSection === "compliance"} onClick={() => toggleSection("compliance")}>
                        <div className="grid grid-cols-1 gap-4 pt-2 pb-1">
                            <ExpiryInput label="RC Expiry Date" value={data.rc_expiry} onChange={v => setData({...data, rc_expiry: v})} />
                            <ExpiryInput label="Insurance Expiry Date" value={data.insurance_expiry} onChange={v => setData({...data, insurance_expiry: v})} />
                            <ExpiryInput label="Pollution (PUC) Expiry" value={data.puc_expiry} onChange={v => setData({...data, puc_expiry: v})} />
                            <div className="grid grid-cols-2 gap-3">
                                <ExpiryInput label="Fitness Expiry" value={data.fitness_expiry} onChange={v => setData({...data, fitness_expiry: v})} />
                                <ExpiryInput label="Permit Expiry" value={data.permit_expiry} onChange={v => setData({...data, permit_expiry: v})} />
                            </div>
                        </div>
                    </SectionToggle>

                    {/* Maintenance Section */}
                    <SectionToggle title="Maintenance Tracking" icon={<Wrench className="h-3.5 w-3.5" />} isOpen={activeSection === "maintenance"} onClick={() => toggleSection("maintenance")}>
                        <div className="space-y-4 pt-2 pb-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-foreground">Last Service</label>
                                    <Input type="date" value={data.last_service_date} onChange={e => setData({...data, last_service_date: e.target.value})} className="h-11 rounded-xl text-xs" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-foreground">Next Service Due</label>
                                    <Input type="date" value={data.next_service_due_date} onChange={e => setData({...data, next_service_due_date: e.target.value})} className="h-11 rounded-xl text-xs border-primary/20 bg-primary/5" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Current Odometer Reading (km)</label>
                                <Input type="number" placeholder="e.g. 45000" value={data.odometer} onChange={e => setData({...data, odometer: e.target.value})} className="h-11 rounded-xl text-sm" />
                            </div>
                        </div>
                    </SectionToggle>

                    {/* Devices Section */}
                    <SectionToggle title="Device & Safety Integration" icon={<Cpu className="h-3.5 w-3.5" />} isOpen={activeSection === "devices"} onClick={() => toggleSection("devices")}>
                        <div className="space-y-4 pt-2 pb-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-foreground">GPS Device ID</label>
                                    <Input placeholder="GPS-XXXXX" value={data.gps_device_id} onChange={e => setData({...data, gps_device_id: e.target.value})} className="h-11 rounded-xl text-xs" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-foreground">RFID Device ID</label>
                                    <Input placeholder="RFID-XXXXX" value={data.rfid_device_id} onChange={e => setData({...data, rfid_device_id: e.target.value})} className="h-11 rounded-xl text-xs" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div onClick={() => setData({...data, camera_installed: !data.camera_installed})} className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors shadow-sm", data.camera_installed ? "bg-primary border-primary" : "border-border bg-background")}>
                                        {data.camera_installed && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">Camera Installed</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div onClick={() => setData({...data, panic_button_available: !data.panic_button_available})} className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors shadow-sm", data.panic_button_available ? "bg-destructive border-destructive" : "border-border bg-background")}>
                                        {data.panic_button_available && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertOctagon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">Panic Button</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </SectionToggle>
                </div>

                <div className="p-6 border-t border-border bg-card shrink-0">
                    <Button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={cn("h-14 w-full rounded-2xl font-bold text-base transition-all shadow-lg active:scale-[0.98]", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}
                    >
                        {saved ? (
                            <><Check className="mr-2 h-5 w-5" />{initialData ? "Vehicle Updated!" : "Vehicle Added!"}</>
                        ) : (
                            initialData ? "Update Vehicle" : "Register Vehicle"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}

function SectionToggle({ title, icon, isOpen, onClick, children }: any) {
    return (
        <div className="flex flex-col">
            <button onClick={onClick} className="flex items-center justify-between py-2 group">
                <div className="flex items-center gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {icon}
                    </div>
                    <span className={cn("text-sm font-bold transition-colors", isOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{title}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && <div className="pl-10">{children}</div>}
        </div>
    )
}

function SelectButton({ value, placeholder, onClick, isOpen, children }: any) {
    return (
        <div className="relative">
            <button onClick={onClick} className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3 transition-colors hover:border-primary/30">
                <span className={cn("text-xs truncate", value ? "text-foreground font-medium" : "text-muted-foreground")}>{value || placeholder}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-[80] mt-1 flex flex-col gap-1 rounded-xl border border-border bg-card p-2 shadow-2xl max-h-48 overflow-y-auto">
                    {children}
                </div>
            )}
        </div>
    )
}

function ExpiryInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    const isWarn = value && (new Date(value).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 && (new Date(value).getTime() - Date.now()) > 0
    const isExpired = value && (new Date(value).getTime() - Date.now()) <= 0
    
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{label}</span>
                {isExpired && <span className="text-[10px] text-destructive animate-pulse font-bold tracking-tight">EXPIRED</span>}
                {isWarn && !isExpired && <span className="text-[10px] text-warning font-bold tracking-tight">EXPIRING SOON</span>}
            </label>
            <div className="relative">
                <Calendar className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isExpired ? "text-destructive" : isWarn ? "text-warning" : "text-muted-foreground text-opacity-50")} />
                <Input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn("h-11 rounded-xl bg-background pl-10 text-xs transition-colors", 
                        isExpired ? "border-destructive/40 bg-destructive/5 text-destructive" : 
                        isWarn ? "border-warning/40 bg-warning/5 text-warning" : ""
                    )}
                />
            </div>
        </div>
    )
}
