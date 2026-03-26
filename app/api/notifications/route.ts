import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const organization_id = searchParams.get("organization_id");
        const limitCount = parseInt(searchParams.get("limit") || "20");

        if (!organization_id) {
            return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
        }

        const snapshot = await adminDb.collection("notifications")
            .where("organization_id", "==", organization_id)
            .orderBy("timestamp", "desc")
            .limit(limitCount)
            .get();

        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ notifications });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { organization_id, type, title, message, metadata } = await req.json();

        if (!organization_id || !type || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const notification = {
            organization_id,
            type, // 'trip_start', 'trip_end', 'sos', 'delay', 'audit'
            title,
            message,
            metadata: metadata || {},
            read: false,
            timestamp: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("notifications").add(notification);
        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}



