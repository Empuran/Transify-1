import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    if (!orgId) {
        return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
    }

    try {
        const snapshot = await adminDb
            .collection("audit_logs")
            .where("organization_id", "==", orgId)
            .orderBy("timestamp", "desc")
            .limit(limit)
            .get();

        const logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error("Audit logs error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
