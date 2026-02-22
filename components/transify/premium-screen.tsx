"use client"

import { useState, useEffect } from "react"
import {
  X,
  Check,
  Sparkles,
  BarChart3,
  Shield,
  Clock,
  Users,
  Video,
  FileText,
  Zap,
  CreditCard,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PremiumScreenProps {
  onClose: () => void
  onSubscribe: () => void
}

type PaymentStep = "plan" | "method" | "upi" | "card" | "processing" | "success"
type PaymentMethod = "upi" | "card"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "",
    features: ["Live tracking", "Basic alerts", "Single child", "Trip history (7 days)"],
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    price: "299",
    period: "/mo",
    popular: true,
    features: [
      "Everything in Free",
      "Unlimited children",
      "AI delay prediction",
      "Route replay",
      "Driver scores",
      "Monthly reports",
      "Priority SOS",
      "Ad-free",
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    price: "2,499",
    period: "/yr",
    savings: "Save 30%",
    features: [
      "Everything in Monthly",
      "Early arrival alerts",
      "Multi-guardian access",
      "CCTV add-on eligible",
      "Priority support",
    ],
  },
]

const premiumFeatures = [
  { icon: BarChart3, label: "Route Replay & Analytics" },
  { icon: Sparkles, label: "AI Delay Prediction" },
  { icon: Shield, label: "Priority Emergency Escalation" },
  { icon: Clock, label: "Early Arrival Alerts" },
  { icon: Users, label: "Multi-Guardian Access" },
  { icon: Video, label: "CCTV Live View Add-on" },
  { icon: FileText, label: "Monthly Transport Reports" },
  { icon: Zap, label: "Ad-Free Experience" },
]

export function PremiumScreen({ onClose, onSubscribe }: PremiumScreenProps) {
  const [step, setStep] = useState<PaymentStep>("plan")
  const [selectedPlanId, setSelectedPlanId] = useState("monthly")
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  // UPI State
  const [upiId, setUpiId] = useState("")

  // Card State
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[1]

  const handleSubscribeClick = () => {
    setStep("method")
  }

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setStep(method)
  }

  const handlePaymentSubmit = () => {
    setStep("processing")
    // Simulate API call
    setTimeout(() => {
      setStep("success")
    }, 2500)
  }

  const handleSuccessFinish = () => {
    onSubscribe()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md px-5 py-4">
        <div className="flex items-center gap-2">
          {step !== "plan" && step !== "success" && step !== "processing" && (
            <button
              onClick={() => {
                if (step === "method") setStep("plan")
                else if (step === "upi" || step === "card") setStep("method")
              }}
              className="mr-1"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          <h1 className="text-lg font-bold text-foreground">
            {step === "plan" ? "Upgrade Project" :
              step === "method" ? "Select Payment" :
                step === "upi" ? "UPI Payment" :
                  step === "card" ? "Card Payment" :
                    step === "processing" ? "Security Check" :
                      "Subscription Active"}
          </h1>
        </div>
        {step !== "processing" && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10">
        {/* Step: Plan Selection */}
        {step === "plan" && (
          <>
            {/* Hero */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15">
                <Sparkles className="h-8 w-8 text-gold" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-center text-balance">
                Unlock the full power of Transify
              </h2>
            </div>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-3">
              {premiumFeatures.map((feat, i) => {
                const Icon = feat.icon
                return (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
                    <Icon className="h-4 w-4 shrink-0 text-gold" />
                    <span className="text-xs font-medium text-foreground">{feat.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Plan Selector */}
            <div className="flex flex-col gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "relative flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-all",
                    selectedPlanId === plan.id
                      ? "border-gold bg-gold/5 shadow-sm"
                      : "border-border bg-card"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground text-center">
                      POPULAR
                    </span>
                  )}
                  {plan.savings && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground text-center">
                      {plan.savings}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {"₹"}{plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                  <div className="flex flex-col gap-1">
                    {plan.features.map((feat, j) => (
                      <div key={j} className="flex items-center gap-2 text-left">
                        <Check className="h-3 w-3 shrink-0 text-success" />
                        <span className="text-xs text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleSubscribeClick}
              disabled={selectedPlanId === "free"}
              className="h-14 rounded-xl bg-highlight text-highlight-foreground font-bold text-base hover:bg-highlight/90"
            >
              {selectedPlanId === "free" ? "Current Plan" : `Continue to Pay ₹${selectedPlan.price}`}
            </Button>
          </>
        )}

        {/* Step: Payment Method Selection */}
        {step === "method" && (
          <div className="flex flex-col gap-6 pt-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Secure Checkout</h2>
              <p className="text-sm text-muted-foreground">Select your preferred payment method</p>
            </div>

            <div className="rounded-2xl bg-muted/50 p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-muted-foreground">Amount to pay</span>
                <span className="text-lg font-bold text-foreground">₹{selectedPlan.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Plan</span>
                <span className="text-sm font-semibold text-foreground">{selectedPlan.name}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleMethodSelect("upi")}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-foreground">UPI / Google Pay / PhonePe</span>
                  <span className="text-xs text-muted-foreground text-left">Quick & secure mobile payments</span>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleMethodSelect("card")}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-foreground">Credit / Debit Card</span>
                  <span className="text-xs text-muted-foreground text-left">Supports Visa, Mastercard, RuPay</span>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-4">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">256-bit Secure Encryption</span>
            </div>
          </div>
        )}

        {/* Step: UPI Payment */}
        {step === "upi" && (
          <div className="flex flex-col gap-6 pt-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Pay using UPI</h2>

            {/* Mock QR Code */}
            <div className="mx-auto flex aspect-square w-48 items-center justify-center rounded-2xl border-4 border-muted bg-white shadow-inner">
              <div className="grid grid-cols-4 gap-1 p-4 opacity-70">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className={cn("h-8 w-8 rounded-sm", (i % 3 === 0 || i % 7 === 0) ? "bg-black" : "bg-muted")} />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Scan QR code using any UPI app</p>

            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-border" />
              <span className="text-xs font-bold text-muted-foreground uppercase">OR</span>
              <div className="h-[1px] flex-1 bg-border" />
            </div>

            <div className="flex flex-col gap-3 text-left">
              <label className="text-sm font-semibold text-foreground">Enter UPI ID</label>
              <Input
                placeholder="username@bank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="h-12 rounded-xl bg-card"
              />
            </div>

            <Button
              onClick={handlePaymentSubmit}
              disabled={!upiId && !upiId.includes("@")}
              className="h-14 rounded-xl bg-highlight text-highlight-foreground font-bold text-base mt-2"
            >
              Pay Securely
            </Button>
          </div>
        )}

        {/* Step: Card Payment */}
        {step === "card" && (
          <div className="flex flex-col gap-6 pt-4">
            <h2 className="text-xl font-bold text-foreground text-center">Card Details</h2>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="h-12 rounded-xl bg-card pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Expiry Date</label>
                  <Input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="h-12 rounded-xl bg-card"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">CVV</label>
                  <Input
                    type="password"
                    placeholder="***"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="h-12 rounded-xl bg-card"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handlePaymentSubmit}
              disabled={cardNumber.length < 12 || expiry.length < 4 || cvv.length < 3}
              className="h-14 rounded-xl bg-highlight text-highlight-foreground font-bold text-base mt-4"
            >
              Pay Securely
            </Button>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-foreground">Processing Payment</h2>
              <p className="text-sm text-muted-foreground">Please do not close the app or press back</p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 text-center animate-in scale-in duration-500">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-14 w-14" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-foreground">Subscription Activated!</h2>
              <p className="text-sm text-muted-foreground">
                Welcome to Transify Premium. All features are now unlocked for you.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-6 w-full max-w-[280px]">
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Order Summary</p>
              <div className="flex justify-between text-sm mb-1">
                <span>Plan</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Validity</span>
                <span className="font-semibold">{selectedPlan.id === "yearly" ? "12 Months" : "1 Month"}</span>
              </div>
            </div>
            <Button
              onClick={handleSuccessFinish}
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base mt-4 shadow-lg shadow-primary/10"
            >
              Start Exploring
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
