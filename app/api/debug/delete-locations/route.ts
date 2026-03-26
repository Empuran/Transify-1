import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("live_locations").get();
    
    if (snapshot.empty) {
      return NextResponse.json({ message: "Database is already clean. No live_locations found." });
    }

    const batch = adminDb.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
    }

    await batch.commit();
    return NextResponse.json({ message: `Successfully deleted ${count} obsolete live locations.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


