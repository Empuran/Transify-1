import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const organization_id = searchParams.get("organization_id");
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");
        const limitCount = parseInt(searchParams.get("limit") || "100");

        if (!organization_id) {
            return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
        }

        // Avoid composite index requirement: filter only on organization_id, sort in-memory
        let query: any = adminDb.collection("audit_logs")
            .where("organization_id", "==", organization_id);

        const snapshot = await query.limit(limitCount).get();
        let logs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        // Apply date filters in memory
        if (startDate) {
            logs = logs.filter((l: any) => l.timestamp >= startDate);
        }
        if (endDate) {
            logs = logs.filter((l: any) => l.timestamp <= endDate + "T23:59:59Z");
        }

        // Sort by timestamp descending in memory (no index needed)
        logs.sort((a: any, b: any) =>
            new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );

        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error("Fetch audit logs error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



