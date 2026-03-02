import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/routes/list?organization_id=xxx
export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "organization_id is required" }, { status: 400 });

    try {
        const snapshot = await adminDb.collection("routes").where("organization_id", "==", orgId).get();
        const routes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        routes.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return NextResponse.json({ routes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
