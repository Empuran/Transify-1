import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { email, otp, organization_id } = await req.json();

        if (!email || !otp || !organization_id) {
            return NextResponse.json(
                { error: "Email, OTP, and organization_id are required" },
                { status: 400 }
            );
        }

        // 1. Verify OTP from Firestore
        const otpDoc = await adminDb.collection("otp_codes").doc(email.toLowerCase()).get();

        if (!otpDoc.exists) {
            return NextResponse.json({ error: "No OTP found. Please request a new code." }, { status: 400 });
        }

        const otpData = otpDoc.data()!;

        if (otpData.used) {
            return NextResponse.json({ error: "This code has already been used. Request a new one." }, { status: 400 });
        }

        if (new Date(otpData.expires_at) < new Date()) {
            return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
        }

        if (otpData.otp !== otp) {
            return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
        }

        if (otpData.organization_id !== organization_id) {
            return NextResponse.json({ error: "Organization mismatch." }, { status: 400 });
        }

        // 2. Mark OTP as used
        await adminDb.collection("otp_codes").doc(email.toLowerCase()).update({ used: true });

        // 3. Get admin user details
        const userSnap = await adminDb
            .collection("admin_users")
            .where("email", "==", email.toLowerCase())
            .where("organization_id", "==", organization_id)
            .limit(1)
            .get();

        if (userSnap.empty) {
            return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
        }

        const adminUser = userSnap.docs[0];
        const adminData = adminUser.data();

        // 4. If user was INVITED, activate them
        if (adminData.status === "INVITED") {
            await adminUser.ref.update({
                status: "ACTIVE",
                invite_token: null,
                invite_expires_at: null,
            });
        }

        // 5. Update last_active
        await adminUser.ref.update({
            last_active: new Date().toISOString(),
        });

        // 6. Create or get Firebase Auth user and generate custom token
        let firebaseUid: string;
        try {
            const existingUser = await adminAuth.getUserByEmail(email.toLowerCase());
            firebaseUid = existingUser.uid;
        } catch {
            // User doesn't exist in Firebase Auth — create them
            const newUser = await adminAuth.createUser({
                email: email.toLowerCase(),
                displayName: adminData.name,
            });
            firebaseUid = newUser.uid;
        }

        // Set custom claims for role-based access
        await adminAuth.setCustomUserClaims(firebaseUid, {
            adminRole: adminData.role,
            organizationId: organization_id,
        });

        // Generate custom token for client-side sign-in
        const customToken = await adminAuth.createCustomToken(firebaseUid, {
            adminRole: adminData.role,
            organizationId: organization_id,
        });

        // 7. Log audit entry
        await adminDb.collection("audit_logs").add({
            action_type: "ADMIN_LOGIN",
            performed_by_user_id: adminUser.id,
            performed_by_email: email.toLowerCase(),
            organization_id,
            details: `Admin ${adminData.name} logged in with role ${adminData.role}`,
            timestamp: new Date().toISOString(),
        });

        // 8. Get organization details
        const orgDoc = await adminDb.collection("organizations").doc(organization_id).get();
        const orgData = orgDoc.exists ? orgDoc.data() : null;

        // Detect first-time login — name is still the default email prefix
        const isFirstLogin = adminData.name === adminData.email.split("@")[0];

        return NextResponse.json({
            success: true,
            customToken,
            is_first_login: isFirstLogin,
            admin: {
                user_id: adminUser.id,
                email: adminData.email,
                name: adminData.name,
                role: adminData.role,
                status: "ACTIVE",
                organization_id,
            },
            organization: orgData ? { id: orgDoc.id, ...orgData } : null,
        });
    } catch (error: any) {
        console.error("Verify OTP error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
