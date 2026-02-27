"use client"

import { useState } from "react"
import { X, GraduationCap, Phone, Hash, Route, Building2, ChevronDown, Check, User, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AddStudentFormProps {
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
    organization: string
}

const gradeOptions = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Year 1", "Year 2", "Year 3", "Year 4"]
const deptOptions = ["Engineering", "Design", "Marketing", "HR", "Finance", "Operations", "Legal", "Sales"]
const routeOptions = ["Route A12 – Koramangala", "Route B5 – Indiranagar", "Route C3 – HSR Layout", "Route D7 – Whitefield", "Route E1 – Jayanagar"]

export function AddStudentForm({ onClose, onSave, isCorporate = false }: AddStudentFormProps) {
    const [data, setData] = useState<StudentData>({
        name: "", grade: "", memberId: "", parentPhone: "", route: "", organization: "",
    })
    const [showGrade, setShowGrade] = useState(false)
    const [showRoute, setShowRoute] = useState(false)
    const [saved, setSaved] = useState(false)

    const isValid = data.name.trim() && data.grade && data.memberId.trim() && data.parentPhone.trim() && data.route

    const handleSave = () => {
        if (!isValid) return
        setSaved(true)
        setTimeout(() => {
            onSave(data)
            onClose()
        }, 800)
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md animate-in slide-in-from-bottom duration-300 rounded-t-3xl bg-card shadow-2xl">
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
                        <button onClick={() => setShowGrade(!showGrade)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                            <span className={cn("text-sm", data.grade ? "text-foreground" : "text-muted-foreground")}>{data.grade || (isCorporate ? "Select department" : "Select grade")}</span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showGrade && "rotate-180")} />
                        </button>
                        {showGrade && (
                            <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-2 shadow-md">
                                {(isCorporate ? deptOptions : gradeOptions).map((g) => (
                                    <button key={g} onClick={() => { setData({ ...data, grade: g }); setShowGrade(false) }}
                                        className={cn("rounded-lg py-2 text-xs font-medium transition-colors", data.grade === g ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>{g}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Member ID & Parent Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">Member ID</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="MBR-001" value={data.memberId} onChange={(e) => setData({ ...data, memberId: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-foreground">{isCorporate ? "Employee Phone" : "Parent Phone"}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="+91 98765..." value={data.parentPhone} onChange={(e) => setData({ ...data, parentPhone: e.target.value })} className="h-12 rounded-xl bg-background pl-9" />
                            </div>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-foreground">Assign Route</label>
                        <button onClick={() => setShowRoute(!showRoute)} className="flex h-12 items-center justify-between rounded-xl border border-border bg-background px-3.5">
                            <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-muted-foreground" />
                                <span className={cn("text-sm", data.route ? "text-foreground" : "text-muted-foreground")}>{data.route || "Select route"}</span>
                            </div>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showRoute && "rotate-180")} />
                        </button>
                        {showRoute && (
                            <div className="mt-1 flex flex-col gap-1 rounded-xl border border-border bg-background p-2 shadow-md">
                                {routeOptions.map((r) => (
                                    <button key={r} onClick={() => { setData({ ...data, route: r }); setShowRoute(false) }}
                                        className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors", data.route === r ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground")}>
                                        {data.route === r && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
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
                        disabled={!isValid}
                        className={cn("h-14 rounded-xl font-bold text-base mt-1 transition-all", saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground")}
                    >
                        {saved ? <><Check className="mr-2 h-5 w-5" />{isCorporate ? "Employee Added!" : "Student Added!"}</> : isCorporate ? "Save Employee" : "Save Student"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
