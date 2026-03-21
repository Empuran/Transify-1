"use client"

import { useState, useEffect, useCallback } from "react"
import {
    UserPlus, Shield, ShieldCheck, Trash2, Loader2,
    Mail, Clock, CheckCircle2, AlertCircle, Search,
    ChevronDown, X, RefreshCw, Copy, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { AdminRole, AdminStatus } from "@/lib/rbac"
import { hasPermission, canManageAdmins } from "@/lib/rbac"
import type { AdminSession } from "@/hooks/use-auth"

interface AdminUserData {
    user_id: string
    email: string
    name: string
    organization_id: string
    role: AdminRole
    status: AdminStatus
    created_at: string
    last_active?: string
    invite_expires_at?: string
}

interface AuditLogData {
    id: string
    action: string
    entity_type: string
    entity_id: string
    admin_name?: string
    admin_email: string
    details: string
    timestamp: string
}

interface AdminManagementProps {
    adminSession: AdminSession
}

export function AdminManagement({ adminSession }: AdminManagementProps) {
    const [admins, setAdmins] = useState<AdminUserData[]>([])
    const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Invite form state
    const [showInviteForm, setShowInviteForm] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<AdminRole>("ADMIN")
    const [inviting, setInviting] = useState(false)
    const [inviteAcceptUrl, setInviteAcceptUrl] = useState<string | null>(null)

    // Search + filters
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState<"all" | AdminRole>("all")

    // Confirm actions
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Tab
    const [activeTab, setActiveTab] = useState<"admins" | "audit">("admins")

    // Ownership Transfer
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [transferTargetId, setTransferTargetId] = useState<string>("")
    const [pendingAction, setPendingAction] = useState<{ type: 'remove' | 'role', userId: string, newRole?: AdminRole } | null>(null)

    // Log Filtering & Pagination
    const [logStartDate, setLogStartDate] = useState("")
    const [logEndDate, setLogEndDate] = useState("")
    const [currentLogPage, setCurrentLogPage] = useState(1)
    const logsPerPage = 10

    const isSuperAdmin = adminSession.role === "SUPER_ADMIN"
    const activeAdmins = admins.filter(a => a.status === "ACTIVE")
    const pendingInvites = admins.filter(a => a.status === "INVITED")
    const superAdminCount = activeAdmins.filter(a => a.role === "SUPER_ADMIN").length

    // ── Fetch Data ──────────────────────────────────────────────────────
    const fetchAdmins = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/list?organization_id=${adminSession.organization_id}`)
            if (res.ok) {
                const data = await res.json()
                setAdmins(data.admins || [])
            }
        } catch (err) {
            console.error("Failed to fetch admins:", err)
        }
    }, [adminSession.organization_id])

    const fetchAuditLogs = useCallback(async () => {
        try {
            const orgId = adminSession.organization_id
            let url = `/api/admin/audit-logs?organization_id=${orgId}&limit=100`
            if (logStartDate) url += `&start_date=${logStartDate}`
            if (logEndDate) url += `&end_date=${logEndDate}`

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setAuditLogs(data.logs || [])
            }
        } catch (err) {
            console.error("Failed to fetch audit logs:", err)
        }
    }, [adminSession.organization_id, logStartDate, logEndDate])

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchAdmins(), fetchAuditLogs()])
            setLoading(false)
        }
        loadData()
    }, [fetchAdmins, fetchAuditLogs])

    // ── Toast helper ────────────────────────────────────────────────────
    const showSuccess = (msg: string) => {
        setSuccessMsg(msg)
        setTimeout(() => setSuccessMsg(null), 4000)
    }

    // ── Invite Admin ────────────────────────────────────────────────────
    const handleInvite = async () => {
        if (!inviteEmail.includes("@") || inviting) return
        setInviting(true)
        setError(null)
        setInviteAcceptUrl(null)

        try {
            const res = await fetch("/api/admin/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail.toLowerCase(),
                    role: inviteRole,
                    organization_id: adminSession.organization_id,
                    invited_by_user_id: adminSession.user_id,
                    base_url: typeof window !== "undefined" ? window.location.origin : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            // Store the accept URL so admin can copy it manually
            if (data.accept_url) setInviteAcceptUrl(data.accept_url)

            showSuccess(`Invite sent to ${inviteEmail}`)
            setInviteEmail("")
            setShowInviteForm(false)
            await Promise.all([fetchAdmins(), fetchAuditLogs()])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setInviting(false)
        }
    }

    // ── Remove Admin ────────────────────────────────────────────────────
    const handleRemove = async (userId: string) => {
        // Enforce transfer if only one super admin
        if (userId === adminSession.user_id && isSuperAdmin && superAdminCount === 1) {
            setPendingAction({ type: 'remove', userId })
            setShowTransferModal(true)
            return
        }

        setActionLoading(userId)
        setError(null)

        try {
            const res = await fetch("/api/admin/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    removed_by_user_id: adminSession.user_id,
                    organization_id: adminSession.organization_id,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            showSuccess(data.message)
            setConfirmRemove(null)
            await Promise.all([fetchAdmins(), fetchAuditLogs()])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setActionLoading(null)
        }
    }

    // ── Change Role ─────────────────────────────────────────────────────
    const handleChangeRole = async (userId: string, newRole: AdminRole) => {
        // Enforce transfer if downgrading the only super admin
        if (userId === adminSession.user_id && isSuperAdmin && superAdminCount === 1 && newRole !== "SUPER_ADMIN") {
            setPendingAction({ type: 'role', userId, newRole })
            setShowTransferModal(true)
            return
        }

        setActionLoading(userId)
        setError(null)

        try {
            const res = await fetch("/api/admin/change-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    new_role: newRole,
                    changed_by_user_id: adminSession.user_id,
                    organization_id: adminSession.organization_id,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            showSuccess(`Role changed to ${newRole}`)
            await Promise.all([fetchAdmins(), fetchAuditLogs()])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleTransferAndProceed = async () => {
        if (!transferTargetId || !pendingAction) return
        setInviting(true) // Reuse loading state for modal
        setError(null)

        try {
            // 1. Transfer Super Admin role to selected user
            const transferRes = await fetch("/api/admin/change-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: transferTargetId,
                    new_role: "SUPER_ADMIN",
                    changed_by_user_id: adminSession.user_id,
                    organization_id: adminSession.organization_id,
                }),
            })
            if (!transferRes.ok) throw new Error("Failed to assign new Super Admin")

            // 2. Perform the pending original action
            if (pendingAction.type === 'remove') {
                const removeRes = await fetch("/api/admin/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: pendingAction.userId,
                        removed_by_user_id: transferTargetId, // New super admin removes the old one
                        organization_id: adminSession.organization_id,
                    }),
                })
                if (!removeRes.ok) throw new Error("Role transferred, but failed to remove your account")
                showSuccess("Transfer successful. Your account has been removed.")
                // Potentially force logout or redirect
                setTimeout(() => window.location.href = "/admin/login", 2000)
            } else if (pendingAction.type === 'role') {
                const roleRes = await fetch("/api/admin/change-role", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: pendingAction.userId,
                        new_role: pendingAction.newRole,
                        changed_by_user_id: transferTargetId, // New super admin changes the old role
                        organization_id: adminSession.organization_id,
                    }),
                })
                if (!roleRes.ok) throw new Error("Role transferred, but failed to update your role")
                showSuccess(`Transfer successful. You are now an ${pendingAction.newRole}.`)
            }

            setShowTransferModal(false)
            setPendingAction(null)
            await Promise.all([fetchAdmins(), fetchAuditLogs()])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setInviting(false)
        }
    }

    const filteredAdmins = admins.filter(a => {
        if (a.status === "DISABLED") return false
        const email = a.email || ""
        const name = a.name || ""
        const query = searchQuery.toLowerCase()
        const matchesSearch = email.toLowerCase().includes(query) || name.toLowerCase().includes(query)
        const matchesRole = roleFilter === "all" || a.role === roleFilter
        return matchesSearch && matchesRole
    })



    // ── Audit action label ──────────────────────────────────────────────
    const actionLabel = (action: string) => {
        const map: Record<string, string> = {
            add: "Added",
            update: "Updated",
            delete: "Deleted",
            login: "Logged in",
            ADMIN_LOGIN: "Logged in",
            ADMIN_LOGOUT: "Logged out",
            ADMIN_ROLE_CHANGED: "Changed Role",
        }
        return map[action] || (action ? action.replaceAll("_", " ").toLowerCase() : "unknown action")
    }

    const actionColor = (action: string) => {
        if (action === "add") return "text-success"
        if (action === "update") return "text-primary"
        if (action === "delete") return "text-destructive"
        if (action === "login" || action === "ADMIN_LOGIN") return "text-primary"
        if (action === "ADMIN_ROLE_CHANGED") return "text-warning"
        return "text-muted-foreground"
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading admin data...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {activeAdmins.length} active · {pendingInvites.length} pending
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { fetchAdmins(); fetchAuditLogs() }}
                        className="gap-2 rounded-xl"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                    {isSuperAdmin && (
                        <Button
                            onClick={() => setShowInviteForm(true)}
                            className="gap-2 bg-primary text-primary-foreground rounded-xl"
                        >
                            <UserPlus className="h-4 w-4" /> Add Admin
                        </Button>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    <p className="text-sm text-success font-medium">{successMsg}</p>
                </div>
            )}

            {/* Invite Accept URL — copyable link for manual sharing */}
            {inviteAcceptUrl && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start gap-2 mb-2">
                        <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">Invite Link</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Share this link with the invitee if the email doesn't reach them</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            readOnly
                            value={inviteAcceptUrl}
                            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground font-mono truncate"
                        />
                        <button
                            onClick={() => { navigator.clipboard.writeText(inviteAcceptUrl); setInviteAcceptUrl(null) }}
                            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div className="flex-1">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                    <button onClick={() => setError(null)}>
                        <X className="h-3.5 w-3.5 text-destructive/60" />
                    </button>
                </div>
            )}

            {/* Invite Form */}
            {showInviteForm && (
                <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-foreground">Invite New Admin</h3>
                        <button onClick={() => { setShowInviteForm(false); setInviteEmail(""); setError(null) }}>
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="admin@organization.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="h-11 rounded-xl border-border bg-background pl-10 text-sm"
                            />
                        </div>

                        <div className="flex gap-2">
                            {(["ADMIN", "SUPER_ADMIN"] as AdminRole[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setInviteRole(r)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all",
                                        inviteRole === r
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-background text-muted-foreground hover:border-primary/30"
                                    )}
                                >
                                    {r === "SUPER_ADMIN" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                                    {r === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground">
                                Invite link expires after 48 hours. The admin must verify their email to activate their account.
                            </p>
                        </div>

                        <Button
                            onClick={handleInvite}
                            disabled={!inviteEmail.includes("@") || inviting}
                            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
                        >
                            {inviting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Invite...</>
                            ) : (
                                <><Mail className="mr-2 h-4 w-4" /> Send Invite</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Tabs (Mobile Only) */}
            <div className="flex gap-1 rounded-xl bg-muted p-1 lg:hidden">
                {[
                    { id: "admins" as const, label: "Team Members", icon: Users },
                    { id: "audit" as const, label: "Audit Log", icon: Shield },
                ].map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
                                activeTab === tab.id
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Admins List Section */}
                <div className={cn("flex flex-col gap-6", activeTab !== "admins" && "hidden lg:flex")}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Team Members</h2>
                    </div>

                    {/* Search + Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-48 max-w-xs">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by email or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 rounded-xl bg-card border-border pl-9 text-sm"
                            />
                        </div>
                        <div className="flex gap-1 rounded-lg border border-border p-0.5">
                            {[
                                { id: "all" as const, label: "All" },
                                { id: "SUPER_ADMIN" as const, label: "Super Admin" },
                                { id: "ADMIN" as const, label: "Admin" },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setRoleFilter(f.id)}
                                    className={cn(
                                        "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                                        roleFilter === f.id
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Admin Cards */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {filteredAdmins.map(admin => (
                            <div
                                key={admin.user_id}
                                className={cn(
                                    "rounded-2xl border bg-card p-4 shadow-sm transition-all",
                                    admin.status === "INVITED" ? "border-warning/30" : "border-border"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                        admin.role === "SUPER_ADMIN" ? "bg-warning/10" : "bg-primary/10"
                                    )}>
                                        <span className={cn(
                                            "text-xs font-bold",
                                            admin.role === "SUPER_ADMIN" ? "text-warning" : "text-primary"
                                        )}>
                                            {(admin.name || "??").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground truncate">{admin.name}</p>
                                            {admin.user_id === adminSession.user_id && (
                                                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                                    </div>

                                    {/* Role Badge */}
                                    <div className={cn(
                                        "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                                        admin.role === "SUPER_ADMIN"
                                            ? "bg-warning/10 text-warning"
                                            : "bg-primary/10 text-primary"
                                    )}>
                                        {admin.role === "SUPER_ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                        {admin.role === "SUPER_ADMIN" ? "Super" : "Admin"}
                                    </div>
                                </div>

                                {/* Status & Meta */}
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {/* Status */}
                                        <span className={cn(
                                            "flex items-center gap-1",
                                            admin.status === "ACTIVE" ? "text-success" :
                                                admin.status === "INVITED" ? "text-warning" : "text-muted-foreground"
                                        )}>
                                            <span className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                admin.status === "ACTIVE" ? "bg-success" :
                                                    admin.status === "INVITED" ? "bg-warning" : "bg-muted-foreground"
                                            )} />
                                            {admin.status}
                                        </span>

                                        {admin.last_active && (
                                            <span className="text-muted-foreground">
                                                Last seen: {new Date(admin.last_active).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions (SUPER_ADMIN only, can't act on other SUPER_ADMINs unless transferring self) */}
                                    {isSuperAdmin && (admin.user_id === adminSession.user_id || admin.role !== "SUPER_ADMIN") && (
                                        <div className="flex items-center gap-1">
                                            {/* Role Toggles */}
                                            {admin.user_id === adminSession.user_id && admin.role === "SUPER_ADMIN" ? (
                                                <button
                                                    onClick={() => handleChangeRole(admin.user_id, "ADMIN")}
                                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-warning/10 hover:text-warning transition-colors"
                                                    title="Downgrade your role to Admin"
                                                >
                                                    <Shield className="h-3.5 w-3.5" />
                                                </button>
                                            ) : (
                                                admin.user_id !== adminSession.user_id && admin.role === "ADMIN" && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Promote ${admin.name || admin.email} to Super Admin? They will be able to manage other admins.`)) {
                                                                handleChangeRole(admin.user_id, "SUPER_ADMIN")
                                                            }
                                                        }}
                                                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                                                        title="Promote to Super Admin"
                                                    >
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                    </button>
                                                )
                                            )}

                                            {confirmRemove === admin.user_id ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-destructive font-semibold">Confirm?</span>
                                                    <button
                                                        onClick={() => handleRemove(admin.user_id)}
                                                        disabled={actionLoading === admin.user_id}
                                                        className="rounded-lg bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors"
                                                    >
                                                        {actionLoading === admin.user_id
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <CheckCircle2 className="h-3 w-3" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRemove(null)}
                                                        className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:bg-muted/80 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmRemove(admin.user_id)}
                                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                    title="Remove admin"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Pending invite expiry */}
                                {admin.status === "INVITED" && admin.invite_expires_at && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-warning">
                                        <Clock className="h-3 w-3" />
                                        Expires: {new Date(admin.invite_expires_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredAdmins.length === 0 && (
                            <div className="col-span-2 flex flex-col items-center gap-2 py-12 text-muted-foreground">
                                <Users className="h-8 w-8 opacity-40" />
                                <p className="text-sm">No admins match your search</p>
                            </div>
                        )}
                    </div>
                    </div>
                </div>

                {/* Audit Log Section */}
                <div className={cn("flex flex-col gap-6", activeTab !== "audit" && "hidden lg:flex")}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Audit Log</h2>
                    </div>
                    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-h-[400px]">
                    {auditLogs.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <Shield className="h-8 w-8 opacity-40" />
                            <p className="text-sm">No audit logs yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Log Filters */}
                            <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Filter Date:</span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={logStartDate}
                                        onChange={(e) => setLogStartDate(e.target.value)}
                                        className="h-8 text-xs rounded-lg w-32"
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                        type="date"
                                        value={logEndDate}
                                        onChange={(e) => setLogEndDate(e.target.value)}
                                        className="h-8 text-xs rounded-lg w-32"
                                    />
                                    {(logStartDate || logEndDate) && (
                                        <button onClick={() => { setLogStartDate(""); setLogEndDate("") }} className="text-xs text-primary hover:underline ml-2">Clear</button>
                                    )}
                                </div>
                            </div>

                            <div className="divide-y divide-border/50 px-5">
                                {(() => {
                                    const indexOfLastLog = currentLogPage * logsPerPage;
                                    const indexOfFirstLog = indexOfLastLog - logsPerPage;
                                    const currentLogs = auditLogs.slice(indexOfFirstLog, indexOfLastLog);
                                    
                                    return currentLogs.map(log => (
                                        <div key={log.id} className="flex items-start gap-3 py-3.5 border-b last:border-0 border-border/50">
                                            <div className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted",
                                            )}>
                                                <Shield className={cn("h-4 w-4", actionColor(log.action))} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground">
                                                    <span className="font-semibold text-primary">{log.admin_name || log.admin_email}</span>
                                                    {" "}
                                                    <span className={cn("font-medium", actionColor(log.action))}>{actionLabel(log.action)}</span>
                                                    {" "}
                                                    <span className="text-muted-foreground">{log.entity_type}</span>
                                                </p>
                                                {log.details && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString("en-IN", {
                                                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                    ));
                                })()}
                            </div>

                            {/* Pagination Controls */}
                            {auditLogs.length > logsPerPage && (
                                <div className="flex items-center justify-between px-5 py-4 bg-muted/20 border-t border-border mt-auto">
                                    <p className="text-xs text-muted-foreground">
                                        Showing {Math.min(auditLogs.length, (currentLogPage - 1) * logsPerPage + 1)} to {Math.min(auditLogs.length, currentLogPage * logsPerPage)} of {auditLogs.length} logs
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentLogPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentLogPage === 1}
                                            className="h-8 rounded-lg px-3 text-xs"
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.ceil(auditLogs.length / logsPerPage) }).map((_, i) => {
                                                const page = i + 1;
                                                // Only show current, first, last, and pages around current
                                                if (page === 1 || page === Math.ceil(auditLogs.length / logsPerPage) || (page >= currentLogPage - 1 && page <= currentLogPage + 1)) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentLogPage(page)}
                                                            className={cn(
                                                                "h-8 w-8 rounded-lg text-xs font-medium transition-all",
                                                                currentLogPage === page
                                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            )}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                }
                                                if (page === currentLogPage - 2 || page === currentLogPage + 2) {
                                                    return <span key={page} className="text-muted-foreground">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentLogPage(prev => Math.min(Math.ceil(auditLogs.length / logsPerPage), prev + 1))}
                                            disabled={currentLogPage === Math.ceil(auditLogs.length / logsPerPage)}
                                            className="h-8 rounded-lg px-3 text-xs"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ownership Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md animate-in fade-in zoom-in duration-200 rounded-3xl bg-card shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border px-6 py-5 bg-warning/5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                                    <ShieldCheck className="h-5 w-5 text-warning" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground">Transfer Ownership</h2>
                                    <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Action Required</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowTransferModal(false); setPendingAction(null) }}
                                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="rounded-xl bg-warning/5 border border-warning/20 p-4">
                                <p className="text-sm text-foreground font-medium">
                                    You are the only Super Admin. To {pendingAction?.type === 'remove' ? 'leave' : 'downgrade'}, you must assign another user as the new Super Admin.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Select New Super Admin</label>
                                <select 
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                                >
                                    <option value="">-- Choose an Admin --</option>
                                    {admins
                                        .filter(a => a.user_id !== adminSession.user_id && a.status === "ACTIVE")
                                        .map(a => (
                                            <option key={a.user_id} value={a.user_id}>{a.name} ({a.email})</option>
                                        ))
                                    }
                                </select>
                                {admins.filter(a => a.user_id !== adminSession.user_id && a.status === "ACTIVE").length === 0 && (
                                    <p className="text-[10px] text-destructive font-medium mt-1">
                                        No other active admins found. Please invite another admin first.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-muted/10 border-t border-border flex gap-3">
                            <Button variant="outline" onClick={() => { setShowTransferModal(false); setPendingAction(null) }} className="flex-1 h-11 rounded-xl">Cancel</Button>
                            <Button 
                                onClick={handleTransferAndProceed}
                                disabled={!transferTargetId || inviting}
                                className="flex-1 h-11 rounded-xl bg-primary"
                            >
                                {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Confirm Transfer
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
