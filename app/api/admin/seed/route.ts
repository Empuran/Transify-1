import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/admin/seed — creates initial organizations and super admin users
// Call this once to set up the database with sample data
export async function POST() {
    try {
        // Test Firestore connectivity first with a simple write
        try {
            await adminDb.collection("_health").doc("check").set({
                status: "ok",
                timestamp: new Date().toISOString(),
            });
            // Clean up test doc
            await adminDb.collection("_health").doc("check").delete();
        } catch (connError: any) {
            if (connError.code === 5) {
                return NextResponse.json({
                    error: "Firestore database not found. Please go to Firebase Console → Firestore Database → Create Database (select a location and start in production mode or test mode). Then try again.",
                    help: "https://console.firebase.google.com/project/transify-6b187/firestore",
                }, { status: 503 });
            }
            throw connError;
        }

        // ── Organizations ─────────────────────────────────────────────────────
        const orgs = [
            {
                name: "Delhi Public School, Bangalore",
                code: "DPS-BLR-001",
                category: "school",
                address: "Koramangala, Bangalore",
                member_count: 320,
                created_at: new Date().toISOString(),
            },
            {
                name: "International Academy, Indiranagar",
                code: "INT-ACD-042",
                category: "school",
                address: "Indiranagar, Bangalore",
                member_count: 185,
                created_at: new Date().toISOString(),
            },
            {
                name: "TCS Bangalore Campus",
                code: "TCS-BLR-105",
                category: "corporate",
                address: "Electronic City, Bangalore",
                member_count: 1200,
                created_at: new Date().toISOString(),
            },
            {
                name: "Infosys Electronic City",
                code: "INF-ECY-200",
                category: "corporate",
                address: "Electronics City Phase 1, Bangalore",
                member_count: 2500,
                created_at: new Date().toISOString(),
            },
        ];

        const orgIds: string[] = [];
        for (const org of orgs) {
            const ref = await adminDb.collection("organizations").add(org);
            orgIds.push(ref.id);
        }

        // ── Super Admin Users (one per org) ──────────────────────────────────
        const superAdmins = [
            {
                email: "admin@dps-blr.edu.in",
                name: "Ravi Shankar",
                organization_id: orgIds[0],
                role: "SUPER_ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
            {
                email: "admin@intacademy.edu.in",
                name: "Priya Nair",
                organization_id: orgIds[1],
                role: "SUPER_ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
            {
                email: "admin@tcs.com",
                name: "Vikram Desai",
                organization_id: orgIds[2],
                role: "SUPER_ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
            {
                email: "admin@infosys.com",
                name: "Meera Patel",
                organization_id: orgIds[3],
                role: "SUPER_ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
        ];

        // Also add some regular admins
        const regularAdmins = [
            {
                email: "transport@dps-blr.edu.in",
                name: "Anil Kumar",
                organization_id: orgIds[0],
                role: "ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
            {
                email: "fleet@tcs.com",
                name: "Santosh Rao",
                organization_id: orgIds[2],
                role: "ADMIN",
                status: "ACTIVE",
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
            },
        ];

        for (const admin of [...superAdmins, ...regularAdmins]) {
            await adminDb.collection("admin_users").add(admin);
        }

        return NextResponse.json({
            success: true,
            message: "Seed data created successfully",
            organizations: orgs.map((o, i) => ({ id: orgIds[i], name: o.name, code: o.code })),
            admins: superAdmins.length + regularAdmins.length,
            test_credentials: {
                school_super_admin: "admin@dps-blr.edu.in (org code: DPS-BLR-001)",
                school_admin: "transport@dps-blr.edu.in (org code: DPS-BLR-001)",
                corporate_super_admin: "admin@tcs.com (org code: TCS-BLR-105)",
                corporate_admin: "fleet@tcs.com (org code: TCS-BLR-105)",
            },
        });
    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json({
            error: error.message || "Internal error",
            code: error.code,
            details: "Make sure Firestore is properly set up in your Firebase Console",
        }, { status: 500 });
    }
}
