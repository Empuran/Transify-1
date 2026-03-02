import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// DELETE /api/drivers/delete — remove a driver
export async function POST(req: NextRequest) {
    try {
        const { driver_id } = await req.json();
        if (!driver_id) return NextResponse.json({ error: "driver_id is required" }, { status: 400 });
        await adminDb.collection("drivers").doc(driver_id).delete();
        return NextResponse.json({ success: true, message: "Driver deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
