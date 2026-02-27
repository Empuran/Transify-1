"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AdminLoginScreen } from "@/components/transify/admin-login-screen"
import { useAuth, type AdminSession } from "@/hooks/use-auth"
import {
    Bus, ArrowRight, Loader2, Search, Hash, QrCode,
    CheckCircle2, Building2, GraduationCap, MapPin, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Organization {
    id: string
    name: string
    code: string
    category: "school" | "corporate"
    address?: string
    member_count: number
}

function AdminLoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { loginAdmin } = useAuth()

    const category = (searchParams.get("category") as "school" | "corporate") || "school"

    const [step, setStep] = useState<"org" | "auth">("org")
    const [verifiedOrg, setVerifiedOrg] = useState<Organization | null>(null)

    // Org verification state
    const [orgCode, setOrgCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const CategoryIcon = category === "school" ? GraduationCap : Building2

    const handleVerifyOrg = async () => {
        if (!orgCode.trim()) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/org/lookup?code=${encodeURIComponent(orgCode.trim().toUpperCase())}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Organization not found")
            }

            setVerifiedOrg(data as Organization)
            setStep("auth")
        } catch (err: any) {
            setError(err.message || "Failed to verify organization")
        } finally {
            setLoading(false)
        }
    }

    const handleLoginSuccess = async (customToken: string, adminData: AdminSession) => {
        try {
            await loginAdmin(customToken, adminData)
            router.push("/admin")
        } catch (error) {
            console.error("Login failed:", error)
        }
    }

    if (step === "auth" && verifiedOrg) {
        return (
            <AdminLoginScreen
                organization={verifiedOrg}
                onLoginSuccess={handleLoginSuccess}
                onBack={() => setStep("org")}
            />
        )
    }

    // Org verification screen (blue theme, consistent with admin-login-screen)
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="flex flex-1 flex-col items-center justify-center px-6">
                {/* Logo */}
                <div className="mb-6 flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                        <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Transify</h1>
                        <p className="text-sm text-muted-foreground">Admin Access</p>
                    </div>
                </div>

                {/* Verified result */}
                {verifiedOrg ? (
                    <div className="mb-6 w-full max-w-sm rounded-2xl border-2 border-success/30 bg-success/5 p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-1">Organization Verified</p>
                                <p className="text-sm font-bold text-foreground">{verifiedOrg.name}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{verifiedOrg.code}</p>
                                {verifiedOrg.address && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{verifiedOrg.address}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">{verifiedOrg.member_count} members</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Category badge */}
                <div className="mb-6 w-full max-w-sm rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p>
                            <p className="text-sm font-semibold text-foreground">
                                {category === "school" ? "School / College" : "Corporate / Organization"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Org code input */}
                {!verifiedOrg && (
                    <div className="w-full max-w-sm flex flex-col gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground mb-1">Enter Organization Code</h2>
                            <p className="text-sm text-muted-foreground">Enter your organization code to verify and continue</p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                                <p className="text-xs text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="relative">
                            <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="e.g. DPS-BLR-001"
                                value={orgCode}
                                onChange={(e) => { setOrgCode(e.target.value.toUpperCase()); setError(null) }}
                                onKeyDown={(e) => e.key === "Enter" && handleVerifyOrg()}
                                className="h-12 rounded-xl border-border bg-card pl-10 text-foreground font-mono uppercase"
                            />
                        </div>

                        <Button
                            onClick={handleVerifyOrg}
                            disabled={!orgCode.trim() || loading}
                            className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                            ) : (
                                <>Verify Organization <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </div>
                )}

                {/* Continue button when verified */}
                {verifiedOrg && (
                    <div className="w-full max-w-sm">
                        <Button
                            onClick={() => setStep("auth")}
                            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                        >
                            Continue to Admin Login <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <button
                            onClick={() => { setVerifiedOrg(null); setOrgCode(""); setError(null) }}
                            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                        >
                            Choose a different organization
                        </button>
                    </div>
                )}
            </div>

            {/* Back link */}
            <div className="px-6 pb-8 text-center">
                <button
                    onClick={() => router.push("/category")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    ← Back to category selection
                </button>
            </div>
        </div>
    )
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-dvh items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <AdminLoginContent />
        </Suspense>
    )
}
