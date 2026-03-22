import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/drivers/list?organization_id=xxx
export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");

    if (!orgId) {
        return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
    }

    try {
        let snapshot = await adminDb
            .collection("drivers")
            .where("organization_id", "==", orgId)
            .get();

        // If no drivers found by UID, try fallback by Org Code
        if (snapshot.empty && orgId.length < 25) { // Simple heuristic for Org Code vs UID
            // Find the org by code first
            const orgSnap = await adminDb.collection("organizations")
                .where("code", "==", orgId.toUpperCase())
                .limit(1)
                .get();

            if (!orgSnap.empty) {
                const realOrgId = orgSnap.docs[0].id;
                snapshot = await adminDb
                    .collection("drivers")
                    .where("organization_id", "==", realOrgId)
                    .get();
            }
        }

        const includeInactive = req.nextUrl.searchParams.get("include_inactive") === "true";

        const drivers = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((d: any) => includeInactive || d.lifecycle_status !== "INACTIVE");

        // Sort by created_at descending
        drivers.sort((a: any, b: any) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({ drivers });
    } catch (error: any) {
        console.error("List drivers error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
