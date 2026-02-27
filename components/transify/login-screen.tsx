"use client"

import { useState } from "react"
import { Bus, ArrowRight, Phone, Mail, CheckCircle2, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { OrgCategory } from "./category-selection"
import { cn } from "@/lib/utils"

export type UserRole = "admin" | "parent" | "driver"

interface LoginScreenProps {
  onLogin: (role: UserRole) => void
  assignedRole?: UserRole
  orgCategory?: OrgCategory
}

type Step = "phone" | "phone-otp" | "email" | "email-otp"

const isAdmin = (role: UserRole) => role === "admin"
const isCorporate = (cat?: OrgCategory) => cat === "corporate"

export function LoginScreen({ onLogin, assignedRole = "parent", orgCategory }: LoginScreenProps) {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [phoneOtp, setPhoneOtp] = useState("")
  const [emailOtp, setEmailOtp] = useState("")

  const admin = isAdmin(assignedRole)

  // Email placeholder hint based on org type
  const emailPlaceholder = admin
    ? isCorporate(orgCategory)
      ? "you@company.com (organisation email)"
      : "admin@school.edu.in (organisation email)"
    : "you@gmail.com (personal email)"

  const emailHint = admin
    ? "Use your organisation email address"
    : "Use your personal email address"

  // Step labels for progress indicator
  const steps: { id: Step; label: string }[] = admin
    ? [
      { id: "phone", label: "Phone" },
      { id: "phone-otp", label: "Phone OTP" },
      { id: "email", label: "Email" },
      { id: "email-otp", label: "Email OTP" },
    ]
    : [
      { id: "phone", label: "Phone" },
      { id: "phone-otp", label: "OTP" },
    ]

  const currentStepIdx = steps.findIndex(s => s.id === step)

  const handleSendPhoneOtp = () => {
    if (!phone.trim()) return
    setStep("phone-otp")
  }

  const handleVerifyPhoneOtp = () => {
    if (admin) {
      setStep("email")
    } else {
      onLogin(assignedRole)
    }
  }

  const handleSendEmailOtp = () => {
    if (!email.trim()) return
    setStep("email-otp")
  }

  const handleVerifyEmailOtp = () => {
    onLogin(assignedRole)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transify</h1>
            <p className="text-sm text-muted-foreground">Intelligent Transport. Simplified.</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                i < currentStepIdx ? "bg-success text-success-foreground" :
                  i === currentStepIdx ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
              )}>
                {i < currentStepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:block", i === currentStepIdx ? "text-foreground font-semibold" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={cn("h-px w-6 rounded-full", i < currentStepIdx ? "bg-success" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="w-full max-w-sm">
          {/* ── Step: Phone ── */}
          {step === "phone" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Enter your phone number</h2>
                <p className="text-sm text-muted-foreground">{"We'll send a one-time code via SMS"}</p>
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pl-10 text-foreground"
                />
              </div>
              <Button
                onClick={handleSendPhoneOtp}
                disabled={!phone.trim()}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                Send OTP <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── Step: Phone OTP ── */}
          {step === "phone-otp" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Verify phone number</h2>
                <p className="text-sm text-muted-foreground">
                  {"6-digit code sent to "}
                  <span className="font-medium text-foreground">{phone}</span>
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyPhoneOtp}
                disabled={phoneOtp.length < 4}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {admin ? "Verify & Continue to Email" : "Verify & Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep("phone")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Change number
                </button>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Email (Admin only) ── */}
          {step === "email" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Verify your email</h2>
                <p className="text-sm text-muted-foreground">{emailHint}</p>
              </div>
              {/* Info badge */}
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-primary/80">
                  {admin && isCorporate(orgCategory)
                    ? "Admins must use a corporate/company email to verify identity."
                    : "Admins must use their organisation email (e.g. school domain) to verify identity."}
                </p>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pl-10 text-foreground"
                />
              </div>
              <Button
                onClick={handleSendEmailOtp}
                disabled={!email.includes("@")}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                Send Email OTP <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button onClick={() => setStep("phone-otp")} className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            </div>
          )}

          {/* ── Step: Email OTP (Admin only) ── */}
          {step === "email-otp" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  {"6-digit code sent to "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyEmailOtp}
                disabled={emailOtp.length < 4}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                Verify & Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Change email
                </button>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Resend code
                </button>
              </div>
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
