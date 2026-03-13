import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json(
                { error: "Phone number is required" },
                { status: 400 }
            );
        }

        // Normalize phone for comparison
        const normalizedInput = phone.replace(/\s+/g, "").replace(/-/g, "");
        const digits = normalizedInput.replace(/^\+91/, "").replace(/^0/, "");
        const phoneVariants = [
            `+91${digits}`,
            `+91 ${digits}`,
            digits,
            `0${digits}`,
            normalizedInput,
            // Re-construct with potential spaces if input had them
            phone.trim()
        ];

        console.log(`[Driver Auth] Checking registration for phone variants:`, phoneVariants);

        // Check if driver exists in any organization
        // We query by phone. A more efficient way would be an exact match on +91 format
        const driverSnap = await adminDb
            .collection("drivers")
            .where("phone", "in", phoneVariants)
            .limit(1)
            .get();

        if (driverSnap.empty) {
            console.log(`[Driver Auth] No driver found for variants:`, phoneVariants);
            return NextResponse.json(
                { error: "This phone number is not registered as a driver. Please contact your administrator." },
                { status: 404 }
            );
        }

        const driverData = driverSnap.docs[0].data();
        console.log(`[Driver Auth] Found driver:`, { name: driverData.name, id: driverSnap.docs[0].id });

        return NextResponse.json({
            success: true,
            message: "Driver verified. Proceeding to OTP.",
            name: driverData.name,
            organization_id: driverData.organization_id
        });
    } catch (error: any) {
        console.error("Driver check error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
