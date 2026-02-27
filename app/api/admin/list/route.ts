import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const orgId = req.nextUrl.searchParams.get("organization_id");

    if (!orgId) {
        return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
    }

    try {
        const snapshot = await adminDb
            .collection("admin_users")
            .where("organization_id", "==", orgId)
            .get();

        const admins = snapshot.docs.map((doc) => ({
            user_id: doc.id,
            ...doc.data(),
        }));

        // Sort by created_at descending (client-side to avoid Firestore composite index)
        admins.sort((a: any, b: any) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({ admins });
    } catch (error: any) {
        console.error("List admins error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
