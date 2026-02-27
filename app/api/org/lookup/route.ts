import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const search = req.nextUrl.searchParams.get("search");

    try {
        if (code) {
            // Look up org by code
            const snapshot = await adminDb
                .collection("organizations")
                .where("code", "==", code.toUpperCase())
                .limit(1)
                .get();

            if (snapshot.empty) {
                return NextResponse.json({ error: "Organization not found" }, { status: 404 });
            }

            const doc = snapshot.docs[0];
            return NextResponse.json({ id: doc.id, ...doc.data() });
        }

        if (search && search.length >= 2) {
            // Search orgs — Firestore doesn't support full-text search natively,
            // so we do a prefix match on the name field
            const snapshot = await adminDb
                .collection("organizations")
                .orderBy("name")
                .startAt(search)
                .endAt(search + "\uf8ff")
                .limit(10)
                .get();

            const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json({ organizations: results });
        }

        return NextResponse.json({ error: "Provide ?code= or ?search= parameter" }, { status: 400 });
    } catch (error: any) {
        console.error("Org lookup error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
