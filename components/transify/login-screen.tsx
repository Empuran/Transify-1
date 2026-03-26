"use client"

import { useState, useEffect } from "react"
import { Bus, ArrowRight, Phone, Mail, CheckCircle2, User, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { OrgCategory } from "./category-selection"
import { cn } from "@/lib/utils"
import { StickyHeader } from "./sticky-header"
import { auth, db, RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { toast } from "sonner"

export type UserRole = "admin" | "parent" | "driver"

interface LoginScreenProps {
  onLogin: (role: UserRole, phone: string, name?: string) => void
  assignedRole?: UserRole
  orgCategory?: OrgCategory
}

type Step = "phone" | "phone-otp" | "name" | "email" | "email-otp"

const isAdmin = (role: UserRole) => role === "admin"
const isCorporate = (cat?: OrgCategory) => cat === "corporate"

export function LoginScreen({ onLogin, assignedRole = "parent", orgCategory }: LoginScreenProps) {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const router = useRouter()
  const [phoneOtp, setPhoneOtp] = useState("")
  const [emailOtp, setEmailOtp] = useState("")
  const [parentName, setParentName] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)

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

  useEffect(() => {
    if (assignedRole === "driver" && typeof window !== "undefined") {
      // Initialize invisible recaptcha for drivers
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log("Recaptcha verified")
          }
        });
      }
    }
  }, [assignedRole]);

  const handleSendPhoneOtp = async () => {
    if (!phone.trim()) return
    if (!db) {
      toast.error("Connecting to server... Please wait.")
      return
    }
    setLoading(true)
    console.log("[OTP] Starting OTP process for:", phone);

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        toast.error("Process is taking longer than expected. Please check your internet or Firebase authorized domains.");
      }
    }, 15000);

    try {
        if (assignedRole === "driver") {
          console.log("[OTP] Step 1: Checking registration (Direct Firestore)...");
          
          // Ensure authenticated (anonymously) for Firebase Client SDK logic
          if (!auth.currentUser) {
            await signInAnonymously(auth)
          }

          // Normalize phone for comparison (Matching API logic)
        const normalizedInput = phone.replace(/\s+/g, "").replace(/-/g, "");
        const digits = normalizedInput.replace(/^\+91/, "").replace(/^0/, "");
        const phoneVariants = [
            `+91${digits}`,
            `+91 ${digits}`,
            digits,
            `0${digits}`,
            normalizedInput,
            phone.trim()
        ];

        const driversRef = collection(db, "drivers");
        const q = query(driversRef, where("phone", "in", phoneVariants), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log(`[Driver Auth] No driver found for variants:`, phoneVariants);
          toast.error("This phone number is not registered as a driver. Please contact your administrator.");
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const driverData = snapshot.docs[0].data();
        console.log(`[Driver Auth] Found driver:`, { name: driverData.name, id: snapshot.docs[0].id });
      }
   console.log("[OTP] Step 2: Formatting phone for Firebase...");
        let phoneForFirebase = phone.trim();
        if (!phoneForFirebase.startsWith("+")) {
          const digits = phoneForFirebase.replace(/\D/g, "");
          phoneForFirebase = digits.length === 10 ? `+91${digits}` : `+${digits}`;
        }
        // Ensure NO spaces for Firebase
        phoneForFirebase = phoneForFirebase.replace(/\s/g, "");
        console.log("[OTP] Step 2 Finished: Formatted as:", phoneForFirebase);

        console.log("[OTP] Step 3: Getting Recaptcha verifier...");
        const appVerifier = (window as any).recaptchaVerifier;
        if (!appVerifier) {
          console.error("[OTP] RECAPTCHA MISSING!");
          throw new Error("Recaptcha verifier not initialized. Please refresh the page.");
        }
        
        console.log("[OTP] Step 4: Calling signInWithPhoneNumber...");
        const confirmation = await signInWithPhoneNumber(auth, phoneForFirebase, appVerifier);
        console.log("[OTP] Step 4 Finished: Firebase confirmation obtained");
        setConfirmationResult(confirmation);
        toast.success("Verification code sent to your phone");

      console.log("[OTP] Final Step: Setting UI to phone-otp...");
      setStep("phone-otp")
    } catch (error: any) {
      console.error("[OTP] Error occurred:", error);
      toast.error(error.message || "Failed to send OTP. Check console for details.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false)
    }
  }

  const handleVerifyPhoneOtp = async () => {
    if (admin) {
      setStep("email")
    } else if (assignedRole === "driver") {
      if (!confirmationResult) return;
      setLoading(true);
      try {
        await confirmationResult.confirm(phoneOtp);
        onLogin(assignedRole, phone);
        router.push("/driver");
      } catch (error: any) {
        console.error("OTP verification failed:", error);
        toast.error("Invalid verification code. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Check if we have a stored name for this phone number (parents)
      const storedName = typeof window !== "undefined"
        ? localStorage.getItem(`transify_parent_name_${phone.replace(/\s+/g, "")}`)
        : null
      if (storedName) {
        // Returning parent - skip name entry
        onLogin(assignedRole, phone, storedName)
        router.push("/parent");
      } else {
        // First-time parent - ask for name
        setStep("name")
      }
    }
  }

  const handleSaveName = () => {
    if (!parentName.trim()) return
    // Persist name for future logins
    if (typeof window !== "undefined") {
      localStorage.setItem(`transify_parent_name_${phone.replace(/\s+/g, "")}`, parentName.trim())
    }
    onLogin(assignedRole, phone, parentName.trim())
    router.push("/parent")
  }

  const handleSendEmailOtp = () => {
    if (!email.trim()) return
    setStep("email-otp")
  }

  const handleVerifyEmailOtp = () => {
    onLogin(assignedRole, phone)
  }

  const screenTitle = assignedRole === "admin" ? "Admin Login" : 
                       assignedRole === "driver" ? "Driver Login" : "Parent Login"

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <StickyHeader title={screenTitle} />

      <div className="flex flex-1 flex-col items-center justify-center px-6">

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
                disabled={!phone.trim() || loading}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>
          )}

          {/* Recaptcha container always present but hidden when not needed */}
          <div id="recaptcha-container" className={cn(step !== "phone" && "hidden")}></div>

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
                disabled={phoneOtp.length < 6 || loading}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {admin ? "Verify & Continue to Email" : "Verify & Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
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

          {/* ── Step: Name (First-time parents) ── */}
          {step === "name" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Welcome! 👋</h2>
                <p className="text-sm text-muted-foreground">What should we call you? This will be your display name.</p>
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. Priya Menon"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  className="h-12 rounded-xl border-border bg-card pl-10 text-foreground"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleSaveName}
                disabled={!parentName.trim()}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">Your name is saved locally, so you won't be asked again.</p>
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
