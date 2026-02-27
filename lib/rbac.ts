// ── Admin Role Types & Permission System ──────────────────────────────────────

export type AdminRole = "SUPER_ADMIN" | "ADMIN";
export type AdminStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface AdminUser {
    user_id: string;
    email: string;
    name: string;
    organization_id: string;
    role: AdminRole;
    status: AdminStatus;
    invited_by?: string;
    invite_token?: string;
    invite_expires_at?: string;
    created_at: string;
    last_active?: string;
}

export interface Organization {
    id: string;
    name: string;
    code: string;
    category: "school" | "corporate";
    address?: string;
    member_count: number;
    created_at: string;
}

export interface AuditLogEntry {
    id: string;
    action_type: AuditAction;
    performed_by_user_id: string;
    performed_by_email: string;
    organization_id: string;
    target_user_id?: string;
    details?: string;
    timestamp: string;
}

export type AuditAction =
    | "ADMIN_LOGIN"
    | "ADMIN_LOGOUT"
    | "ADMIN_INVITE_SENT"
    | "ADMIN_INVITE_ACCEPTED"
    | "ADMIN_REMOVED"
    | "ADMIN_ROLE_CHANGED"
    | "SETTINGS_UPDATED"
    | "VEHICLE_ADDED"
    | "DRIVER_ADDED"
    | "ROUTE_ADDED"
    | "MEMBER_ADDED";

// ── Permissions ──────────────────────────────────────────────────────────────

export const PERMISSIONS: Record<AdminRole, string[]> = {
    SUPER_ADMIN: [
        "manage_admins",
        "invite_admin",
        "remove_admin",
        "change_roles",
        "manage_org_settings",
        "manage_vehicles",
        "manage_drivers",
        "manage_routes",
        "manage_members",
        "view_analytics",
        "view_audit_logs",
        "full_dashboard",
    ],
    ADMIN: [
        "manage_vehicles",
        "manage_drivers",
        "manage_routes",
        "manage_members",
        "view_analytics",
    ],
};

export function hasPermission(role: AdminRole, action: string): boolean {
    return PERMISSIONS[role]?.includes(action) ?? false;
}

export function canManageAdmins(role: AdminRole): boolean {
    return role === "SUPER_ADMIN";
}
