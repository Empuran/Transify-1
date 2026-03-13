import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const phone = req.nextUrl.searchParams.get("phone") || "Mariama";
        
        const snap = await adminDb.collection("students").get();
        const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const match = students.filter((s:any) => JSON.stringify(s).toLowerCase().includes(phone.toLowerCase()) || JSON.stringify(s).toLowerCase().includes("daise"));
        
        const routeNames = new Set(match.map((s:any) => s.route).filter(Boolean));
        const routeIds = new Set(match.map((s:any) => s.route_id).filter(Boolean));
        
        const routes: any[] = [];
        for (const rName of Array.from(routeNames)) {
            const rs = await adminDb.collection("routes").where("route_name", "==", rName).get();
            rs.forEach(d => routes.push({ id: d.id, ...d.data(), __source: 'name_query' }));
        }
        for (const rId of Array.from(routeIds)) {
            const d = await adminDb.collection("routes").doc(rId as string).get();
            if (d.exists) routes.push({ id: d.id, ...d.data(), __source: 'id_query' });
        }
        
        return NextResponse.json({ students: match, routes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
