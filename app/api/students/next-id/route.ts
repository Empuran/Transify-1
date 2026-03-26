import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");

    if (!orgId) { return NextResponse.json({ error: "organization_id is required" }, { status: 400 }); }

    try {
        // 1. Get Organization Code
        const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
        if (!orgDoc.exists) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const orgData = orgDoc.data() || {};
        const orgName = orgData.name || "";
        const orgCode = orgData.code || "";
        
        // Generate prefix: prefer initials from name (e.g., "Delhi Public School" -> "DPS")
        let prefix = "MBR";
        if (orgName) {
            prefix = orgName.split(" ")
                .map((w: string) => w[0])
                .filter(Boolean)
                .join("")
                .toUpperCase();
        } else if (orgCode) {
            prefix = orgCode.split("-")[0].toUpperCase();
        }

        // Limit prefix to 3-4 letters if it's very long
        if (prefix.length > 5) prefix = prefix.substring(0, 4);

        const fullPrefix = `${prefix}-`;

        // 2. Find max ID with this prefix for this organization
        // Fetch students for this org and filter in memory to avoid index requirement
        const snapshot = await adminDb.collection("students")
            .where("organization_id", "==", orgId)
            .get();

        let maxNum = 0;
        snapshot.forEach(doc => {
            const mId = doc.data().memberId || "";
            if (mId.startsWith(fullPrefix)) {
                const numPart = mId.replace(fullPrefix, "");
                const num = parseInt(numPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });

        const nextNum = maxNum + 1;
        const nextId = `${fullPrefix}${nextNum.toString().padStart(3, "0")}`;

        return NextResponse.json({ nextId });
    } catch (error: any) {
        console.error("Next ID generation error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}



