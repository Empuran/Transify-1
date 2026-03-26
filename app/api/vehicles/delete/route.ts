import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// DELETE /api/vehicles/delete — remove a vehicle
export async function POST(req: NextRequest) {
    try {
        const { vehicle_id } = await req.json();
        if (!vehicle_id) return NextResponse.json({ error: "vehicle_id is required" }, { status: 400 });
        await adminDb.collection("vehicles").doc(vehicle_id).delete();
        return NextResponse.json({ success: true, message: "Vehicle deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



