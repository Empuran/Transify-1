import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");
    const limitCount = parseInt(req.nextUrl.searchParams.get("limit") || "100");
    const startDate = req.nextUrl.searchParams.get("start_date");
    const endDate = req.nextUrl.searchParams.get("end_date");

    if (!orgId) { return NextResponse.json({ error: "organization_id is required" }, { status: 400 }); }

    try {
        const snapshot = await adminDb
            .collection("audit_logs")
            .where("organization_id", "==", orgId)
            .get();

        let logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

        // Apply date filters in memory
        if (startDate) logs = logs.filter((l: any) => l.timestamp >= startDate);
        if (endDate) logs = logs.filter((l: any) => l.timestamp <= endDate + "T23:59:59Z");

        // Sort by timestamp descending (client-side to avoid Firestore composite index)
        logs.sort((a: any, b: any) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({ logs: logs.slice(0, limitCount) });
    } catch (error: any) {
        console.error("Audit logs error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}


