"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, GraduationCap, Phone, Hash, Route, Building2, ChevronDown, Check, User, Briefcase, Bus, MapPin, Loader2, Home, Camera, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { clientAuditLog } from "@/lib/audit-logger-client"

interface AddStudentFormProps {
    initialData?: any
    onClose: () => void
    onSave: (data: StudentData) => void
    isCorporate?: boolean
}

export interface StudentData {
    name: string
    grade: string
    memberId: string
    parentPhone: string
    route: string
    route_id?: string
    vehicle_id: string
    organization: string
    boarding_point?: { name: string; lat: number; lng: number } | null
    dropoff_point?: { name: string; lat: number; lng: number } | null
    section?: string
    address?: string
    photo_url?: string
    join_date?: string
}

const gradeOptions = [
  "Play School", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
]
const deptOptions = ["Engineering", "Design", "Marketing", "HR", "Finance", "Operations", "Legal", "Sales"]

interface RouteStop { name: string; lat: number; lng: number }
interface RouteOption { name: string; stops: RouteStop[]; id?: string }

export function AddStudentForm({ onClose, onSave, isCorporate = false, initialData }: AddStudentFormProps) {
    const [data, setData] = useState<StudentData>({
        name: initialData?.name || "",
        grade: initialData?.grade || initialData?.dept || initialData?.department || "",
        section: initialData?.section || "",
        memberId: initialData?.memberId || initialData?.student_id || "",
        parentPhone: initialData?.parent_phone || initialData?.student_phone || initialData?.phone || "",
        route: initialData?.route || initialData?.route_name || "Unassigned",
        route_id: initialData?.route_id || "",
        vehicle_id: initialData?.vehicle_id || "Unassigned",
        organization: initialData?.organization || "",
        boarding_point: initialData?.boarding_point || null,
        dropoff_point: initialData?.dropoff_point || null,
        address: initialData?.address || "",
        photo_url: initialData?.photo_url || "",
        join_date: initialData?.join_date || "",
    })
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [showGrade, setShowGrade] = useState(false)
    const [showRoute, setShowRoute] = useState(false)
    const [showVehicle, setShowVehicle] = useState(false)
    const [showSection, setShowSection] = useState(false)
    const [showBoarding, setShowBoarding] = useState(false)
    const [showDropoff, setShowDropoff] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(false)
    const [routeOptions, setRouteOptions] = useState<RouteOption[]>([])
    const [vehicleOptions, setVehicleOptions] = useState<{ id: string; plate: string }[]>([])

    // Stops from selected route
    const [boardingStops, setBoardingStops] = useState<RouteStop[]>([])

    // Fetch real routes and vehicles from Firestore
    useEffect(() => {
        const session = typeof window !== "undefined" ? sessionStorage.getItem("transify_admin_session") : null
        const adminData = session ? JSON.parse(session) : null
        const orgId = adminData?.organization_id
        if (!orgId) return

        const fetchData = async () => {
            try {
                // Fetch Routes
                const rQ = query(collection(db, "routes"), where("organization_id", "==", orgId))
                const rSnap = await getDocs(rQ)
                const mapped: RouteOption[] = rSnap.docs.map(doc => {
                    const ro = doc.data()
                    const stops: RouteStop[] = []
                    if (ro.start_point) {
                        stops.push({
                            name: (ro.start_point as string).split(",")[0].trim(),
                            lat: ro.start_lat || 0,
                            lng: ro.start_lng || 0,
                        })
                    }
                    if (Array.isArray(ro.stops)) {
                        ro.stops.forEach((s: any) => {
                            stops.push({
                                name: typeof s === "string" ? s.split(",")[0].trim() : (s.name || "Stop").split(",")[0].trim(),
                                lat: s.lat || 0,
                                lng: s.lng || 0,
                            })
                        })
                    }
                    if (ro.end_point) {
                        stops.push({
                            name: (ro.end_point as string).split(",")[0].trim(),
                            lat: ro.end_lat || 0,
                            lng: ro.end_lng || 0,
                        })
                    }
                    return { name: ro.route_name, stops, id: doc.id }
                })
                setRouteOptions(mapped)

                // Fetch Vehicles
                const vQ = query(collection(db, "vehicles"), where("organization_id", "==", orgId))
                const vSnap = await getDocs(vQ)
                const vMap = vSnap.docs.map(doc => ({ id: doc.id, plate: doc.data().plate_number || doc.id }))
                setVehicleOptions([{ id: "Unassigned", plate: "Unassigned" }, ...vMap])
            } catch (err) {
                console.error("Failed to fetch routes/vehicles:", err)
            }
        }
        fetchData()
    }, [isCorporate])

    // When route changes, update boarding stop options
    useEffect(() => {
        const routeObj = routeOptions.find(r => r.name === data.route)
        setBoardingStops(routeObj?.stops || [])
        // Clear points if route changed and old points no longer valid
        if (routeObj) {
            if (data.boarding_point && !routeObj.stops.some(s => s.name === data.boarding_point?.name)) {
                setData(prev => ({ ...prev, boarding_point: null }))
            }
            if (data.dropoff_point && !routeObj.stops.some(s => s.name === data.dropoff_point?.name)) {
                setData(prev => ({ ...prev, dropoff_point: null }))
            }
        }
    }, [data.route, routeOptions])

    const isValid = data.name.trim() && (initialData?.id ? data.memberId.trim() : true) && data.parentPhone.trim() && data.route

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

            const studentPayload = {
                ...data,
                photo_url: finalPhotoUrl,
                organization_id: orgId,
                updated_at: serverTimestamp()
            }

            if (initialData?.id) {
                await updateDoc(doc(db, "students", initialData.id), studentPayload)
                await clientAuditLog(orgId, adminData.user_id, adminData.email, "STUDENT_UPDATE", `Updated ${isCorporate ? "employee" : "student"} ${data.name}`)
            } else {
                await addDoc(collection(db, "students"), {
                    ...studentPayload,
                    created_at: serverTimestamp()
                })
                await clientAuditLog(orgId, adminData.user_id, adminData.email, "STUDENT_ADD", `Added new ${isCorporate ? "employee" : "student"} ${data.name}`)
            }

            setSaved(true)
            setTimeout(() => { onSave(data); onClose() }, 1500)
        } catch (err: any) {
            alert(err.message || `Failed to ${initialData ? "update" : "add"} member`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl max-h-[92dvh] overflow-y-auto">
                {/* Handle */}
                <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            {isCorporate ? <Briefcase className="h-5 w-5 text-primary" /> : <GraduationCap className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">{isCorporate ? "Add Employee" : "Add Student"}</h2>
                            <p className="text-xs text-muted-foreground">Register a new member</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-4 px-5 pb-8">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="e.g. Arya Sharma" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="h-12 rounded-xl bg-background pl-10" />
                        </div>
                    </div>

                    {/* Grade / Department Picker */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">{isCorporate ? "Department" : "Class / Grade"}</label>
                        <div className={cn("grid gap-2", isCorporate ? "grid-cols-1" : (data.grade === "Play School" ? "grid-cols-1" : "grid-cols-2"))}>
                            <button onClick={() => setShowGrade(!showGrade)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                                <span className={cn("text-sm", data.grade ? "text-foreground" : "text-muted-foreground")}>{isCorporate ? (data.grade || "Select department") : (data.grade || "Select class")}</span>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showGrade && "rotate-180")} />
                            </button>
                            {!isCorporate && data.grade !== "Play School" && (
                                <button onClick={() => setShowSection(!showSection)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                                    <span className={cn("text-sm", data.section ? "text-foreground" : "text-muted-foreground")}>{data.section ? `Section ${data.section}` : "Section"}</span>
                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showSection && "rotate-180")} />
                                </button>
                            )}
                        </div>
                        {showGrade && (
                            <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-2 shadow-md">
                                {(isCorporate ? deptOptions : gradeOptions).map((g) => (
                                    <button key={g} onClick={() => { setData({ ...data, grade: g, section: g === "Play School" ? "" : data.section }); setShowGrade(false) }}
                                        className={cn("rounded-lg py-2 text-xs font-medium transition-colors", data.grade === g ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>{g}</button>
                                ))}
                            </div>
                        )}
                        {!isCorporate && data.grade !== "Play School" && showSection && (
                            <div className="mt-1 grid grid-cols-7 gap-1 rounded-xl border border-border bg-background p-2 shadow-md">
                                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((s) => (
                                    <button key={s} onClick={() => { setData({ ...data, section: s }); setShowSection(false) }}
                                        className={cn("rounded-lg py-2 text-xs font-bold transition-colors", data.section === s ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>{s}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Member ID & Parent Phone */}
                    <div className={cn("grid gap-3", initialData?.id ? "grid-cols-2" : "grid-cols-1")}>
                        {!!initialData?.id && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-foreground">Member ID</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input placeholder="MBR-001" value={data.memberId} onChange={(e) => setData({ ...data, memberId: e.target.value })} className="h-12 rounded-xl bg-background pl-9 pr-10" />
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">{isCorporate ? "Employee Phone" : "Parent Phone"}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="+91 98765..." value={data.parentPhone} onChange={(e) => setData({ ...data, parentPhone: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
                            </div>
                        </div>
                    </div>

                    {/* Route & Vehicle */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Assign Route</label>
                            <button onClick={() => { setShowRoute(!showRoute); setShowVehicle(false); setShowBoarding(false) }} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Route className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className={cn("text-xs truncate", data.route ? "text-foreground" : "text-muted-foreground")}>{data.route || "Select route"}</span>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", showRoute && "rotate-180")} />
                            </button>
                            {showRoute && (
                                <div className="absolute z-10 mt-20 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl max-h-40 overflow-y-auto min-w-[160px]">
                                    {routeOptions.map((r) => (
                                        <button key={r.name} onClick={() => { setData({ ...data, route: r.name, route_id: r.id || "", boarding_point: null }); setShowRoute(false) }}
                                            className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-left transition-colors", data.route === r.name ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                            {data.route === r.name && <Check className="h-3 w-3 shrink-0" />}
                                            {r.name}
                                        </button>
                                    ))}
                                    <button onClick={() => { setData({ ...data, route: "Unassigned", boarding_point: null }); setShowRoute(false) }}
                                        className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-left transition-colors", data.route === "Unassigned" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                        Unassigned
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Assign Vehicle</label>
                            <button onClick={() => { setShowVehicle(!showVehicle); setShowRoute(false); setShowBoarding(false) }} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Bus className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className={cn("text-xs truncate", data.vehicle_id ? "text-foreground" : "text-muted-foreground")}>
                                        {vehicleOptions.find(v => v.id === data.vehicle_id)?.plate || "Select vehicle"}
                                    </span>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", showVehicle && "rotate-180")} />
                            </button>
                            {showVehicle && (
                                <div className="absolute z-10 mt-20 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl max-h-40 overflow-y-auto min-w-[160px]">
                                    {vehicleOptions.map((v) => (
                                        <button key={v.id} onClick={() => { setData({ ...data, vehicle_id: v.id }); setShowVehicle(false) }}
                                            className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-left transition-colors", data.vehicle_id === v.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                            {data.vehicle_id === v.id && <Check className="h-3 w-3 shrink-0" />}
                                            {v.plate}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {boardingStops.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {/* Boarding Point */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Boarding Point</label>
                                <button
                                    onClick={() => { setShowBoarding(!showBoarding); setShowDropoff(false); setShowRoute(false); setShowVehicle(false) }}
                                    className={cn(
                                        "flex h-12 items-center justify-between rounded-xl border bg-background px-3 transition-colors",
                                        data.boarding_point ? "border-primary/50" : "border-border"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 overflow-hidden text-left">
                                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className={cn("text-[10px] truncate leading-tight", data.boarding_point ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {data.boarding_point?.name || "Select boarding"}
                                        </span>
                                    </div>
                                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", showBoarding && "rotate-180")} />
                                </button>
                                {showBoarding && (
                                    <div className="absolute z-20 mt-16 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl max-h-48 overflow-y-auto min-w-[160px]">
                                        {boardingStops.map((stop, i) => (
                                            <button key={i} onClick={() => { setData({ ...data, boarding_point: stop }); setShowBoarding(false) }}
                                                className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-left transition-colors", data.boarding_point?.name === stop.name ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                                {stop.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Drop-off Point */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">Drop-off Point</label>
                                <button
                                    onClick={() => { setShowDropoff(!showDropoff); setShowBoarding(false); setShowRoute(false); setShowVehicle(false) }}
                                    className={cn(
                                        "flex h-12 items-center justify-between rounded-xl border bg-background px-3 transition-colors",
                                        data.dropoff_point ? "border-primary/50" : "border-border"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 overflow-hidden text-left">
                                        <MapPin className="h-3.5 w-3.5 text-success shrink-0" />
                                        <span className={cn("text-[10px] truncate leading-tight", data.dropoff_point ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {data.dropoff_point?.name || "Select drop-off"}
                                        </span>
                                    </div>
                                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", showDropoff && "rotate-180")} />
                                </button>
                                {showDropoff && (
                                    <div className="absolute z-20 mt-16 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-xl max-h-48 overflow-y-auto min-w-[160px]">
                                        {boardingStops.map((stop, i) => (
                                            <button key={i} onClick={() => { setData({ ...data, dropoff_point: stop }); setShowDropoff(false) }}
                                                className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-left transition-colors", data.dropoff_point?.name === stop.name ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                                {stop.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={!isValid || loading || saved}
                        className={cn("h-14 rounded-xl font-bold text-base mt-1 transition-all", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}
                    >
                        {saved ? (
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5" />
                                {isCorporate ? "Employee Added!" : "Student Added!"}
                            </div>
                        ) : loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            initialData?.id ? "Update Member" : (isCorporate ? "Save Employee" : "Save Student")
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
