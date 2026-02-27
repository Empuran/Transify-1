"use client"

import { useState } from "react"
import {
    Bus, ArrowRight, Search, QrCode, Hash, X, ChevronRight,
    Building2, CheckCircle2, Loader2, GraduationCap, AlertCircle,
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

interface OrgConnectScreenProps {
    category: "school" | "corporate"
    onOrgVerified: (org: Organization) => void
    onBack: () => void
}

type OrgMethod = "code" | "search" | "qr"

export function OrgConnectScreen({ category, onOrgVerified, onBack }: OrgConnectScreenProps) {
    const [orgMethod, setOrgMethod] = useState<OrgMethod>("code")
    const [orgCode, setOrgCode] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchResults, setSearchResults] = useState<Organization[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [verifiedOrg, setVerifiedOrg] = useState<Organization | null>(null)

    const categoryLabel = category === "school" ? "School / College" : "Corporate / Organization"
    const CategoryIcon = category === "school" ? GraduationCap : Building2

    // ── Verify Org by Code ──────────────────────────────────────────────
    const handleVerifyCode = async () => {
        if (orgCode.length < 3) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/org/lookup?code=${encodeURIComponent(orgCode)}`)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Organization not found")
            }
            const org = await res.json() as Organization
            setVerifiedOrg(org)
        } catch (err: any) {
            setError(err.message || "Unable to verify organization")
        } finally {
            setLoading(false)
        }
    }

    // ── Search Orgs ─────────────────────────────────────────────────────
    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            setSearchResults([])
            return
        }
        setSearchLoading(true)
        try {
            const res = await fetch(`/api/org/lookup?search=${encodeURIComponent(query)}`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data.organizations || [])
            }
        } catch {
            setSearchResults([])
        } finally {
            setSearchLoading(false)
        }
    }

    // ── QR Scan (simulate) ─────────────────────────────────────────────
    const handleQrScan = async (code: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/org/lookup?code=${encodeURIComponent(code)}`)
            if (!res.ok) throw new Error("Organization not found")
            const org = await res.json() as Organization
            setVerifiedOrg(org)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Verified State ─────────────────────────────────────────────────
    if (verifiedOrg) {
        return (
            <div className="flex min-h-dvh flex-col bg-background">
                <div className="flex flex-1 flex-col px-6">
                    <div className="flex flex-col items-center gap-3 pt-16 pb-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                            <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transify</h1>
                            <p className="text-sm text-muted-foreground">Admin Access</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        {/* Verified Org Card */}
                        <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                                    <CheckCircle2 className="h-6 w-6 text-success" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-success">Organization Verified</p>
                                    <h3 className="mt-1 text-lg font-bold text-foreground">{verifiedOrg.name}</h3>
                                    <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                                        <span className="font-mono">{verifiedOrg.code}</span>
                                        {verifiedOrg.address && <span>{verifiedOrg.address}</span>}
                                        <span>{verifiedOrg.member_count.toLocaleString()} members</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Category Badge */}
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <CategoryIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Category</p>
                                <p className="text-sm font-semibold text-foreground">{categoryLabel}</p>
                            </div>
                        </div>

                        <Button
                            onClick={() => onOrgVerified(verifiedOrg)}
                            className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                        >
                            Continue to Admin Login
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>

                        <button
                            onClick={() => { setVerifiedOrg(null); setOrgCode(""); setError(null) }}
                            className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Choose a different organization
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="flex flex-1 flex-col px-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3 pt-16 pb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                        <Bus className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Transify</h1>
                        <p className="text-sm text-muted-foreground">Admin Access</p>
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={onBack}
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

                    {/* Category Badge */}
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                        <CategoryIcon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">{categoryLabel}</span>
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
                                    onClick={() => { setOrgMethod(method.id); setError(null) }}
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

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                            <p className="text-xs text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Organization Code Entry */}
                    {orgMethod === "code" && (
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="e.g. DPS-BLR-001"
                                    value={orgCode}
                                    onChange={(e) => { setOrgCode(e.target.value.toUpperCase()); setError(null) }}
                                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground font-mono tracking-wider"
                                />
                            </div>
                            <Button
                                onClick={handleVerifyCode}
                                disabled={orgCode.length < 3 || loading}
                                className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                                ) : (
                                    <>Verify Organization <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
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
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="h-12 rounded-xl border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(""); setSearchResults([]) }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                )}
                            </div>

                            {searchLoading && (
                                <div className="flex items-center justify-center gap-2 py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Searching...</span>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
                                    {searchResults.map((org) => (
                                        <button
                                            key={org.id}
                                            onClick={() => setVerifiedOrg(org)}
                                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted active:bg-accent"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                {org.category === "school"
                                                    ? <GraduationCap className="h-4 w-4 text-primary" />
                                                    : <Building2 className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">{org.name}</span>
                                                <span className="text-xs font-mono text-muted-foreground">{org.code}</span>
                                            </div>
                                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchQuery.length > 1 && !searchLoading && searchResults.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-8">
                                    <Search className="h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">No organizations found</p>
                                    <p className="text-xs text-muted-foreground/70">Try a different search term or enter the code directly</p>
                                </div>
                            )}

                            {searchQuery.length <= 1 && !searchLoading && (
                                <div className="flex flex-col items-center gap-2 py-6">
                                    <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QR Scanner */}
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
                                onClick={() => handleQrScan("DPS-BLR-001")}
                                variant="outline"
                                disabled={loading}
                                className="h-10 rounded-xl text-sm"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Simulate QR Scan
                            </Button>
                        </div>
                    )}
                </div>
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
