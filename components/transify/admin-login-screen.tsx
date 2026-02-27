"use client"

import { useState } from "react"
import {
    Bus, ArrowRight, Mail, CheckCircle2, Loader2, Shield,
    AlertCircle, Building2, GraduationCap, Sparkles, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"
import type { AdminSession } from "@/hooks/use-auth"

interface Organization {
    id: string
    name: string
    code: string
    category: "school" | "corporate"
    address?: string
    member_count: number
}

interface AdminLoginScreenProps {
    organization: Organization
    onLoginSuccess: (customToken: string, adminData: AdminSession) => void
    onBack: () => void
}

type Step = "email" | "otp" | "name"

export function AdminLoginScreen({ organization, onLoginSuccess, onBack }: AdminLoginScreenProps) {
    const [step, setStep] = useState<Step>("email")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [devOtp, setDevOtp] = useState<string | null>(null)
    const [fullName, setFullName] = useState("")
    const [pendingToken, setPendingToken] = useState<string | null>(null)
    const [pendingAdminData, setPendingAdminData] = useState<AdminSession | null>(null)

    const CategoryIcon = organization.category === "school" ? GraduationCap : Building2

    // ── Send OTP ────────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        if (!email.includes("@")) return
        setLoading(true)
        setError(null)
        setDevOtp(null)

        try {
            const res = await fetch("/api/admin/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    organization_id: organization.id,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to send OTP")
            }

            // In dev mode, the OTP is returned for testing
            if (data._dev_otp) {
                setDevOtp(data._dev_otp)
            }

            setStep("otp")
        } catch (err: any) {
            setError(err.message || "Failed to send verification code")
        } finally {
            setLoading(false)
        }
    }

    // ── Verify OTP ──────────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        if (otp.length < 6) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/admin/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    otp,
                    organization_id: organization.id,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Verification failed")
            }

            const adminData: AdminSession = {
                user_id: data.admin.user_id,
                email: data.admin.email,
                name: data.admin.name,
                role: data.admin.role,
                organization_id: data.admin.organization_id,
                organization_name: organization.name,
                organization_category: organization.category,
            }

            // First-time login — show name form
            if (data.is_first_login) {
                setPendingToken(data.customToken)
                setPendingAdminData(adminData)
                setStep("name")
                return
            }

            onLoginSuccess(data.customToken, adminData)
        } catch (err: any) {
            setError(err.message || "Verification failed")
        } finally {
            setLoading(false)
        }
    }

    // ── Save Name (first-time login) ────────────────────────────────────
    const handleSaveName = async () => {
        if (!fullName.trim() || !pendingToken || !pendingAdminData) return
        setLoading(true)

        try {
            await fetch("/api/admin/accept-invite", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase(), name: fullName.trim() }),
            })

            // Update admin data with new name and proceed
            const updatedData = { ...pendingAdminData, name: fullName.trim() }
            onLoginSuccess(pendingToken, updatedData)
        } catch {
            // Still proceed even if name save fails
            onLoginSuccess(pendingToken, pendingAdminData)
        } finally {
            setLoading(false)
        }
    }

    // ── Resend OTP ──────────────────────────────────────────────────────
    const handleResend = async () => {
        setOtp("")
        setError(null)
        setLoading(true)

        try {
            const res = await fetch("/api/admin/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    organization_id: organization.id,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            if (data._dev_otp) setDevOtp(data._dev_otp)
        } catch (err: any) {
            setError(err.message || "Failed to resend")
        } finally {
            setLoading(false)
        }
    }

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
                        <p className="text-sm text-muted-foreground">Admin Authentication</p>
                    </div>
                </div>

                {/* Organization Context */}
                <div className="mb-6 w-full max-w-sm rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{organization.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{organization.code}</p>
                        </div>
                        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Change
                        </button>
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-8 flex items-center gap-2">
                    {[
                        { id: "email" as Step, label: "Email" },
                        { id: "otp" as Step, label: "Verify OTP" },
                    ].map((s, i) => {
                        const stepIdx = ["email", "otp"].indexOf(step)
                        return (
                            <div key={s.id} className="flex items-center gap-2">
                                <div className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                                    i < stepIdx ? "bg-success text-success-foreground" :
                                        i === stepIdx ? "bg-primary text-primary-foreground" :
                                            "bg-muted text-muted-foreground"
                                )}>
                                    {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={cn("text-xs", i === stepIdx ? "text-foreground font-semibold" : "text-muted-foreground")}>
                                    {s.label}
                                </span>
                                {i < 1 && <div className={cn("h-px w-6 rounded-full", i < stepIdx ? "bg-success" : "bg-muted")} />}
                            </div>
                        )
                    })}
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 w-full max-w-sm flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-xs text-destructive">{error}</p>
                    </div>
                )}

                {/* Form */}
                <div className="w-full max-w-sm">
                    {/* ── Step: Email ── */}
                    {step === "email" && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-semibold text-foreground">Enter your admin email</h2>
                                <p className="text-sm text-muted-foreground">
                                    {"We'll send a verification code to your email"}
                                </p>
                            </div>

                            {/* Security Badge */}
                            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-xs text-primary/80">
                                    Only pre-authorized admin emails can sign in. No public registration available.
                                </p>
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder={organization.category === "corporate" ? "you@company.com" : "admin@school.edu.in"}
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground"
                                />
                            </div>

                            <Button
                                onClick={handleSendOtp}
                                disabled={!email.includes("@") || loading}
                                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                ) : (
                                    <>Send Verification Code <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* ── Step: OTP ── */}
                    {step === "otp" && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
                                <p className="text-sm text-muted-foreground">
                                    {"6-digit code sent to "}
                                    <span className="font-medium text-foreground">{email}</span>
                                </p>
                            </div>

                            {/* Dev OTP Display */}
                            {devOtp && (
                                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                    <div>
                                        <p className="text-xs font-semibold text-warning">Development Mode</p>
                                        <p className="text-xs text-warning/80">Your OTP: <span className="font-mono font-bold">{devOtp}</span></p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-center">
                                <InputOTP maxLength={6} value={otp} onChange={(v) => { setOtp(v); setError(null) }}>
                                    <InputOTPGroup>
                                        {[0, 1, 2, 3, 4, 5].map(i => (
                                            <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            <Button
                                onClick={handleVerifyOtp}
                                disabled={otp.length < 6 || loading}
                                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                                ) : (
                                    <>Verify & Access Dashboard <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>

                            <div className="flex items-center justify-between">
                                <button onClick={() => { setStep("email"); setOtp(""); setError(null); setDevOtp(null) }}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    Change email
                                </button>
                                <button onClick={handleResend} disabled={loading}
                                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                                    Resend code
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step: Name (first-time) ── */}
                    {step === "name" && (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                                    <CheckCircle2 className="h-7 w-7 text-success" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-semibold text-foreground">Welcome to Transify!</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Set your display name for the admin dashboard
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground"
                                    autoFocus
                                />
                            </div>

                            <p className="text-[10px] text-center text-muted-foreground">
                                This name will appear on your admin dashboard profile
                            </p>

                            <Button
                                onClick={handleSaveName}
                                disabled={!fullName.trim() || loading}
                                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <>Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-8 text-center">
                <p className="text-xs text-muted-foreground">
                    {"By continuing, you agree to our "}
                    <span className="text-primary underline">Terms of Service</span>
                    {" and "}
                    <span className="text-primary underline">Privacy Policy</span>
                </p>
            </div>
        </div>
    )
}
