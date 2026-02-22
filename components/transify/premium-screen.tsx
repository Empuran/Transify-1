"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PremiumScreenProps {
  onClose: () => void
  onSubscribe: () => void
}

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
  const [selectedPlan, setSelectedPlan] = useState("monthly")

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md px-5 py-4">
        <h1 className="text-lg font-bold text-foreground">Upgrade to Premium</h1>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15">
            <Sparkles className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center text-balance">
            Unlock the full power of Transify
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Get advanced analytics, AI predictions, and priority safety features.
          </p>
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
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative flex flex-col gap-2 rounded-2xl border-2 p-4 transition-all",
                selectedPlan === plan.id
                  ? "border-gold bg-gold/5 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                  POPULAR
                </span>
              )}
              {plan.savings && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-bold text-success-foreground">
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
                  <div key={j} className="flex items-center gap-2">
                    <Check className="h-3 w-3 shrink-0 text-success" />
                    <span className="text-xs text-muted-foreground">{feat}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={onSubscribe}
          disabled={selectedPlan === "free"}
          className="h-14 rounded-xl bg-highlight text-highlight-foreground font-bold text-base hover:bg-highlight/90"
        >
          {selectedPlan === "free" ? "Current Plan" : "Subscribe Now"}
        </Button>
      </div>
    </div>
  )
}
