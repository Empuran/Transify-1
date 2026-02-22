import { db } from "../lib/firebase"
import { doc, setDoc, collection } from "firebase/firestore"

const mockOrgs = [
    {
        id: "org_123",
        name: "Delhi Public School",
        code: "DPS-KOR",
        plan: "premium",
        branding: { primaryColor: "#166534" }
    },
    {
        id: "org_456",
        name: "Corporate Logistics Inc",
        code: "CORP-LOG",
        plan: "free",
        branding: { primaryColor: "#1e40af" }
    }
]

const mockUsers = [
    {
        id: "test_parent_id",
        phone: "+919999999999",
        globalName: "Nidhin Sharma",
        roles: { "org_123": "guardian" },
        activeOrgId: "org_123"
    },
    {
        id: "test_driver_id",
        phone: "+918888888888",
        globalName: "Rajesh Kumar",
        roles: { "org_123": "driver" },
        activeOrgId: "org_123"
    }
]

export async function initMockData() {
    console.log("Initializing mock data...")

    for (const org of mockOrgs) {
        await setDoc(doc(db, "organizations", org.id), org)
        console.log(`- Org ${org.name} created`)
    }

    for (const user of mockUsers) {
        await setDoc(doc(db, "users", user.id), user)
        console.log(`- User ${user.globalName} created`)
    }

    console.log("Mock data initialization complete!")
}

initMockData().catch(console.error)
