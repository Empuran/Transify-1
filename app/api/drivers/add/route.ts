import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createAuditLog } from "@/lib/audit-logger";

// POST /api/drivers/add — register a new driver
export async function POST(req: NextRequest) {
    try {
        const { name, phone, licenseNumber, vehicleId, organization, licenseType, organization_id, admin_email, admin_id } = await req.json();

        if (!name || !phone || !organization_id) {
            return NextResponse.json(
                { error: "name, phone, and organization_id are required" },
                { status: 400 }
            );
        }

        const driverDoc = {
            name: name.trim(),
            phone: phone.trim(),
            license_number: licenseNumber || "",
            license_type: licenseType || "",
            vehicle_id: vehicleId || "Unassigned",
            organization: organization || "",
            organization_id,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("drivers").add(driverDoc);

        // ── Audit Log ────────────────────────────────────────────────────────
        if (admin_id && admin_email) {
            await createAuditLog({
                action: "add",
                entity_type: "driver",
                entity_id: docRef.id,
                admin_id,
                admin_email,
                organization_id,
                details: `Added new driver: ${driverDoc.name}`
            });
        }

        return NextResponse.json({
            success: true,
            driver_id: docRef.id,
            message: `Driver ${name} added successfully`,
        });
    } catch (error: any) {
        console.error("Add driver error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
