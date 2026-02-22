"use client"

import { useState } from "react"
import {
  Bus,
  ArrowRight,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export type UserRole = "admin" | "parent" | "driver"

interface LoginScreenProps {
  onLogin: (role: UserRole) => void
  assignedRole?: UserRole
}

export function LoginScreen({ onLogin, assignedRole = "parent" }: LoginScreenProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Transify
            </h1>
            <p className="text-sm text-muted-foreground">
              Intelligent Transport. Simplified.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm">
          {/* Step: Phone Number */}
          {step === "phone" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Enter your phone number
                </h2>
                <p className="text-sm text-muted-foreground">
                  {"We'll send you a one-time verification code"}
                </p>
              </div>

              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Button
                onClick={() => setStep("otp")}
                className="h-12 rounded-xl bg-highlight text-highlight-foreground font-semibold hover:bg-highlight/90"
              >
                Send OTP
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step: OTP Verification */}
          {step === "otp" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Verify OTP
                </h2>
                <p className="text-sm text-muted-foreground">
                  {"Enter the 6-digit code sent to "}
                  <span className="font-medium text-foreground">
                    {phone || "+91 98765 43210"}
                  </span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    <InputOTPSlot index={1} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    <InputOTPSlot index={2} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    <InputOTPSlot index={3} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    <InputOTPSlot index={4} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                    <InputOTPSlot index={5} className="h-12 w-11 rounded-xl border-border bg-card text-foreground" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={() => onLogin(assignedRole)}
                className="h-12 rounded-xl bg-highlight text-highlight-foreground font-semibold hover:bg-highlight/90"
              >
                Verify & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep("phone")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change number
                </button>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Resend OTP
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
