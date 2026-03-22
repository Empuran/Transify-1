"use client"

import { useState } from "react"
import { X, AlertTriangle, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STUDENT_REASONS = [
    "Transferred to another school",
    "Graduated",
    "Relocated",
    "Discontinued studies",
    "Medical reasons",
    "Financial reasons",
    "Disciplinary reasons",
    "Transport no longer required",
    "Other",
]

const DRIVER_REASONS = [
    "Resigned",
    "Terminated",
    "Retired",
    "Contract ended",
    "Medical reasons",
    "Relocated",
    "Performance issues",
    "Role change",
    "Other",
]

interface RemovalReasonModalProps {
    entityType: "student" | "driver"
    entityName: string
    onConfirm: (reason: string) => void
    onCancel: () => void
    isLoading?: boolean
}

export function RemovalReasonModal({ entityType, entityName, onConfirm, onCancel, isLoading }: RemovalReasonModalProps) {
    const [selectedReason, setSelectedReason] = useState("")
    const [otherText, setOtherText] = useState("")
    const [showDropdown, setShowDropdown] = useState(false)

    const reasons = entityType === "student" ? STUDENT_REASONS : DRIVER_REASONS
    const finalReason = selectedReason === "Other" ? otherText.trim() : selectedReason
    const isValid = selectedReason && (selectedReason !== "Other" || otherText.trim().length > 0)

    const handleConfirm = () => {
        if (!isValid) return
        onConfirm(finalReason)
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 bg-destructive/10 px-5 py-4 border-b border-border">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
                        <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-foreground">Remove {entityType === "student" ? "Student" : "Driver"}</h2>
                        <p className="text-xs text-muted-foreground truncate">{entityName}</p>
                    </div>
                    <button onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex flex-col gap-4 p-5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        This {entityType} will be marked as <span className="font-semibold text-destructive">inactive</span>. Their data will be preserved for records. Please select a removal reason.
                    </p>

                    {/* Reason Dropdown */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground">Removal Reason <span className="text-destructive">*</span></label>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className={cn(
                                "flex h-11 items-center justify-between rounded-xl border bg-background px-3.5 transition-colors",
                                selectedReason ? "border-primary/50" : "border-border"
                            )}
                        >
                            <span className={cn("text-sm", selectedReason ? "text-foreground" : "text-muted-foreground")}>
                                {selectedReason || "Select reason..."}
                            </span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showDropdown && "rotate-180")} />
                        </button>
                        {showDropdown && (
                            <div className="flex flex-col rounded-xl border border-border bg-background shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                {reasons.map((r) => (
                                    <button key={r} onClick={() => { setSelectedReason(r); setShowDropdown(false) }}
                                        className={cn("flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-muted", selectedReason === r && "bg-primary/10 text-primary font-semibold")}>
                                        {selectedReason === r && <Check className="h-3 w-3 shrink-0" />}
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* "Other" text input */}
                    {selectedReason === "Other" && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground">Please specify <span className="text-destructive">*</span></label>
                            <textarea
                                value={otherText}
                                onChange={(e) => setOtherText(e.target.value)}
                                placeholder="Describe the reason..."
                                rows={3}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-1">
                        <Button variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-xl font-semibold" disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} disabled={!isValid || isLoading}
                            className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90">
                            {isLoading ? (
                                <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Removing…</span>
                            ) : "Confirm Remove"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
