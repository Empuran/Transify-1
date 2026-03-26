import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/logs/add — create an audit log entry (for client-side events like login)
export async function POST(req: NextRequest) {
    try {
        const { action, entity_type, entity_id, admin_id, admin_name, admin_email, organization_id, details } = await req.json();
        if (!organization_id || !admin_email) {
            return NextResponse.json({ error: "organization_id and admin_email are required" }, { status: 400 });
        }
        await createAuditLog({ action, entity_type, entity_id, admin_id, admin_name, admin_email, organization_id, details });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



