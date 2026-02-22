"use client"

import { useState } from "react"
import {
  Bus,
  GraduationCap,
  Building2,
  Users,
  Truck,
  ArrowRight,
  Search,
  QrCode,
  Hash,
  X,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type OrgCategory = "school" | "corporate" | "parent" | "driver"

interface CategorySelectionScreenProps {
  onContinue: (category: OrgCategory, orgCode: string) => void
}

const categories: {
  id: OrgCategory
  label: string
  description: string
  icon: typeof Bus
}[] = [
  {
    id: "school",
    label: "School / College",
    description: "Educational institution transport",
    icon: GraduationCap,
  },
  {
    id: "corporate",
    label: "Corporate / Organization",
    description: "Employee shuttle management",
    icon: Building2,
  },
  {
    id: "parent",
    label: "Parent / Guardian",
    description: "Track your child's transport",
    icon: Users,
  },
  {
    id: "driver",
    label: "Driver",
    description: "Manage trips and routes",
    icon: Truck,
  },
]

const sampleOrgs = [
  { code: "DPS-BLR-001", name: "Delhi Public School, Bangalore" },
  { code: "INT-ACD-042", name: "International Academy, Indiranagar" },
  { code: "TCS-BLR-105", name: "TCS Bangalore Campus" },
  { code: "INF-ECY-200", name: "Infosys Electronic City" },
]

type OrgStep = "category" | "organization"
type OrgMethod = "code" | "search" | "qr"

export function CategorySelectionScreen({ onContinue }: CategorySelectionScreenProps) {
  const [step, setStep] = useState<OrgStep>("category")
  const [selectedCategory, setSelectedCategory] = useState<OrgCategory | null>(null)
  const [orgMethod, setOrgMethod] = useState<OrgMethod>("code")
  const [orgCode, setOrgCode] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showQrScanner, setShowQrScanner] = useState(false)

  const filteredOrgs = searchQuery.length > 1
    ? sampleOrgs.filter(
        (o) =>
          o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 flex-col px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 pt-16 pb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome to Transify
            </h1>
            <p className="text-sm text-muted-foreground">
              Intelligent Transport. Simplified.
            </p>
          </div>
        </div>

        {/* Step: Category Selection */}
        {step === "category" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">
                How are you using Transify?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select your category to get started
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isSelected
                          ? "bg-highlight text-highlight-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-foreground">
                        {cat.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cat.description}
                      </span>
                    </div>
                    <div className="ml-auto">
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <Button
              onClick={() => selectedCategory && setStep("organization")}
              disabled={!selectedCategory}
              className="h-12 rounded-xl bg-highlight text-highlight-foreground font-semibold hover:bg-highlight/90"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Organization Identification */}
        {step === "organization" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setStep("category")}
                className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
                Back
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                Connect to your organization
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your organization code, search, or scan a QR code
              </p>
            </div>

            {/* Method Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {[
                { id: "code" as OrgMethod, label: "Org Code", icon: Hash },
                { id: "search" as OrgMethod, label: "Search", icon: Search },
                { id: "qr" as OrgMethod, label: "Scan QR", icon: QrCode },
              ].map((method) => {
                const MIcon = method.icon
                return (
                  <button
                    key={method.id}
                    onClick={() => setOrgMethod(method.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all",
                      orgMethod === method.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MIcon className="h-3.5 w-3.5" />
                    {method.label}
                  </button>
                )
              })}
            </div>

            {/* Organization Code Entry */}
            {orgMethod === "code" && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. DPS-BLR-001"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground font-mono tracking-wider"
                  />
                </div>
                <Button
                  onClick={() =>
                    selectedCategory && onContinue(selectedCategory, orgCode || "DPS-BLR-001")
                  }
                  disabled={orgCode.length < 3}
                  className="h-12 rounded-xl bg-highlight text-highlight-foreground font-semibold hover:bg-highlight/90"
                >
                  Verify & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Organization Search */}
            {orgMethod === "search" && (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {filteredOrgs.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
                    {filteredOrgs.map((org) => (
                      <button
                        key={org.code}
                        onClick={() =>
                          selectedCategory && onContinue(selectedCategory, org.code)
                        }
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted active:bg-accent"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {org.name}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {org.code}
                          </span>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length > 1 && filteredOrgs.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No organizations found
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Try a different search term or enter the code directly
                    </p>
                  </div>
                )}

                {searchQuery.length <= 1 && (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* QR Scanner Placeholder */}
            {orgMethod === "qr" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="absolute inset-4 rounded-xl border-2 border-primary/20" />
                  <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-primary rounded-tl-md" />
                  <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-primary rounded-tr-md" />
                  <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
                  <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-md" />
                  <QrCode className="h-12 w-12 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Point your camera at the organization QR code
                </p>
                <Button
                  onClick={() =>
                    selectedCategory && onContinue(selectedCategory, "DPS-BLR-001")
                  }
                  variant="outline"
                  className="h-10 rounded-xl text-sm"
                >
                  Simulate QR Scan
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 pt-4 text-center">
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
