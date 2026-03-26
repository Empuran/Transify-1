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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction } from "firebase/firestore"
import { db, auth, signInAnonymously } from "@/lib/firebase"
import { type AdminSession } from "@/hooks/use-auth"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

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
    onLoginSuccess: (customToken: string | null, adminData: AdminSession) => void
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
    const [pendingAdminData, setPendingAdminData] = useState<AdminSession | null>(null)
    const router = useRouter()

    const CategoryIcon = organization.category === "school" ? GraduationCap : Building2

    // ── Send OTP ────────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        if (!email.includes("@")) return
        if (!db) {
            setError("Connecting to server... Please wait.")
            return
        }
        setDevOtp(null)
        setLoading(true)

        try {
            // 0. Ensure authenticated (anonymously) for Firebase Client SDK logic
            if (!auth.currentUser) {
                await signInAnonymously(auth)
            }

            // 1. Check if authorized
            const q = query(
                collection(db, "admin_users"),
                where("email", "==", email.toLowerCase()),
                where("organization_id", "==", organization.id)
            )
            const userSnap = await getDocs(q)
            
            if (userSnap.empty) {
                throw new Error("This email is not authorized for this organization. Only invited admins can sign in.")
            }

            const adminUser = userSnap.docs[0].data()
            if (adminUser.status === "DISABLED") {
                throw new Error("Your account has been disabled. Contact the organization administrator.")
            }

            // 2. Generate OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

            // 3. Store OTP
            await setDoc(doc(db, "otp_codes", email.toLowerCase()), {
                otp: otpCode,
                email: email.toLowerCase(),
                organization_id: organization.id,
                expires_at: expiresAt,
                created_at: new Date().toISOString(),
                used: false,
            })

            // 4. Show code in UI (since no email server in static APK)
            setDevOtp(otpCode)
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
        if (!db) {
            setError("Connecting to server... Please wait.")
            return
        }
        setLoading(true)
        setError(null)

        try {
            // 1. Get OTP and mark as used atomically
            const data = await runTransaction(db, async (transaction) => {
                const otpDocRef = doc(db, "otp_codes", email.toLowerCase())
                const otpDoc = await transaction.get(otpDocRef)
                
                if (!otpDoc.exists()) throw new Error("Verification code expired or invalid")
                const d = otpDoc.data()
                
                if (d.otp !== otp) throw new Error("Invalid verification code")
                const expiresAt = d.expires_at ? new Date(d.expires_at) : new Date(0)
                if (expiresAt < new Date()) throw new Error("Verification code has expired")
                
                const now = new Date().getTime()
                const usedAt = d.used_at ? new Date(d.used_at).getTime() : 0
                const isRecentlyUsed = d.used && (now - usedAt < 10000) // 10s grace
                
                if (d.used && !isRecentlyUsed) {
                    throw new Error("Verification code already used")
                }
                
                transaction.update(otpDocRef, { 
                    used: true,
                    used_at: new Date().toISOString()
                })
                
                return d
            })

            // 2. Get Admin User
            const q = query(
                collection(db, "admin_users"),
                where("email", "==", email.toLowerCase()),
                where("organization_id", "==", organization.id)
            )
            const userSnap = await getDocs(q)
            if (userSnap.empty) throw new Error("Admin record not found")
            
            const adminDoc = userSnap.docs[0]
            const adminUser = adminDoc.data()

            const adminData: AdminSession = {
                user_id: adminDoc.id,
                email: adminUser.email,
                name: adminUser.name,
                role: adminUser.role,
                organization_id: adminUser.organization_id,
                organization_name: organization.name,
                organization_category: organization.category,
            }

            // First-time login — status is INVITED or name is not set
            const hasNoName = !adminUser.name || (adminUser.email && adminUser.name === adminUser.email.split("@")[0])
            if (adminUser.status === "INVITED" || hasNoName) {
                setPendingAdminData(adminData)
                setStep("name")
                return
            }

            onLoginSuccess(null, adminData)
        } catch (err: any) {
            setError(err.message || "Verification failed")
        } finally {
            setLoading(false)
        }
    }

    // ── Save Name (first-time login) ────────────────────────────────────
    const handleSaveName = async () => {
        if (!fullName.trim() || !pendingAdminData) return
        if (!db) {
            setError("Connecting to server... Please wait.")
            return
        }
        setLoading(true)

        try {
            // Update the admin_user doc
            await updateDoc(doc(db, "admin_users", pendingAdminData.user_id), {
                name: fullName.trim(),
                status: "ACTIVE",
                updated_at: new Date().toISOString()
            })

            // Update admin data with new name and proceed
            const updatedData = { ...pendingAdminData, name: fullName.trim() }
            onLoginSuccess(null, updatedData)
        } catch (err: any) {
            console.error("Save name failed:", err)
            // Still proceed even if name save fails
            onLoginSuccess(null, pendingAdminData)
        } finally {
            setLoading(false)
        }
    }

    // ── Resend OTP ──────────────────────────────────────────────────────
    const handleResend = async () => {
        setOtp("")
        await handleSendOtp()
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <button
                onClick={() => onBack()}
                className="absolute left-6 top-8 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 lg:left-12 lg:top-12 z-50"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
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
