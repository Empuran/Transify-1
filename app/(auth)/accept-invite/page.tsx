"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function AcceptInviteContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const token = searchParams.get("token")
    const email = searchParams.get("email")

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "already_active" | "name_input">("idle")
    const [message, setMessage] = useState("")
    const [fullName, setFullName] = useState("")
    const [savingName, setSavingName] = useState(false)

    useEffect(() => {
        if (token && email && status === "idle") {
            acceptInvite()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, email])

    const acceptInvite = async () => {
        if (!token || !email) return
        setStatus("loading")
        setMessage("")

        try {
            const res = await fetch("/api/admin/accept-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, email }),
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus("error")
                setMessage(data.error || "Failed to accept invitation")
                return
            }

            if (data.already_active) {
                setStatus("already_active")
                setMessage(data.message)
            } else {
                // Show name input step
                setStatus("name_input")
                setMessage(data.message || "Invitation accepted!")
            }
        } catch (err: any) {
            setStatus("error")
            setMessage(err.message || "Something went wrong")
        }
    }

    const handleSaveName = async () => {
        if (!fullName.trim() || !email) return
        setSavingName(true)

        try {
            const res = await fetch("/api/admin/accept-invite", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name: fullName.trim() }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to save name")
            }

            setStatus("success")
        } catch (err: any) {
            // Even if name save fails, let them proceed
            setStatus("success")
        } finally {
            setSavingName(false)
        }
    }

    const goToLogin = () => {
        router.push("/admin-login?category=school")
    }

    if (!token || !email) {
        return (
            <div className="rounded-2xl border border-destructive/20 bg-card p-8 shadow-xl text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h1 className="text-xl font-bold text-foreground mb-2">Invalid Link</h1>
                <p className="text-sm text-muted-foreground">
                    This invite link is missing required parameters. Please check the link in your email.
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border bg-card p-8 shadow-xl">
            {/* Loading */}
            {status === "loading" && (
                <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Accepting your invitation...</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                </div>
            )}

            {/* Name Input (one-time, after accepting) */}
            {status === "name_input" && (
                <div className="flex flex-col items-center gap-5 py-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground">Invitation Accepted! 🎉</h2>
                        <p className="text-sm text-muted-foreground mt-2">One last step — enter your display name</p>
                        <p className="text-xs text-muted-foreground mt-1">{email}</p>
                    </div>

                    <div className="w-full space-y-3">
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                className="h-12 rounded-xl border-border bg-background pl-10 text-foreground"
                                autoFocus
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                            This name will be displayed on the admin dashboard
                        </p>
                    </div>

                    <Button
                        onClick={handleSaveName}
                        disabled={!fullName.trim() || savingName}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm gap-2"
                    >
                        {savingName ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                            <>Continue to Login <ArrowRight className="h-4 w-4" /></>
                        )}
                    </Button>
                </div>
            )}

            {/* Success (after name saved) */}
            {(status === "success" || status === "already_active") && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground">
                            {status === "already_active" ? "Already Active!" : `Welcome, ${fullName || "Admin"}! 🎉`}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            {status === "already_active" ? message : "Your account is ready. Log in to access the admin dashboard."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{email}</p>
                    </div>

                    <div className="w-full rounded-xl bg-primary/5 border border-primary/20 p-4 mt-2">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">Ready to log in</p>
                                <p className="text-xs text-muted-foreground">Use your email to receive an OTP and access the dashboard</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={goToLogin}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm gap-2 mt-2"
                    >
                        Go to Admin Login <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Error */}
            {status === "error" && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground">Invitation Failed</h2>
                        <p className="text-sm text-destructive mt-2">{message}</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => { setStatus("idle"); acceptInvite() }}
                        className="rounded-xl mt-2"
                    >
                        Try Again
                    </Button>
                </div>
            )}

            {/* Idle */}
            {status === "idle" && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <ShieldCheck className="h-12 w-12 text-primary" />
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-foreground">Accept Invitation</h2>
                        <p className="text-sm text-muted-foreground mt-2">You've been invited to join as an admin</p>
                        <p className="text-xs text-muted-foreground mt-1">{email}</p>
                    </div>
                    <Button
                        onClick={acceptInvite}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
                    >
                        Accept & Continue
                    </Button>
                </div>
            )}
        </div>
    )
}

export default function AcceptInvitePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white text-2xl mb-3 shadow-lg">
                        🚌
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Transify</h1>
                    <p className="text-sm text-muted-foreground mt-1">Admin Invitation</p>
                </div>
                <Suspense fallback={
                    <div className="rounded-2xl border bg-card p-8 shadow-xl flex flex-col items-center gap-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                }>
                    <AcceptInviteContent />
                </Suspense>
            </div>
        </div>
    )
}
