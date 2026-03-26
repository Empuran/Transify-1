import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// DELETE /api/routes/delete — remove a route
export async function POST(req: NextRequest) {
    try {
        const { route_id } = await req.json();
        if (!route_id) return NextResponse.json({ error: "route_id is required" }, { status: 400 });
        await adminDb.collection("routes").doc(route_id).delete();
        return NextResponse.json({ success: true, message: "Route deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



