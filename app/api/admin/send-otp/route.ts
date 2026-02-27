import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { randomInt } from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

async function sendOtpEmail(to: string, otp: string) {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">🚌 Transify</h1>
              <p style="color:#bfdbfe;font-size:12px;margin:6px 0 0;">Admin Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Your one-time verification code is:</p>
              <div style="background-color:#f0f4ff;border-radius:12px;padding:20px;margin:0 auto;display:inline-block;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1e293b;font-family:monospace;">${otp}</span>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">This code expires in <strong>10 minutes</strong>.</p>
              <p style="color:#94a3b8;font-size:11px;margin:8px 0 0;">If you didn't request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:10px;text-align:center;margin:0;">© ${new Date().getFullYear()} Transify · Smart Transport Intelligence</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"Transify" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `${otp} is your Transify verification code`,
        html,
    });
}

export async function POST(req: NextRequest) {
    try {
        const { email, organization_id } = await req.json();

        if (!email || !organization_id) {
            return NextResponse.json(
                { error: "Email and organization_id are required" },
                { status: 400 }
            );
        }

        // 1. Check if user exists in admin_users and is linked to this org
        const userSnap = await adminDb
            .collection("admin_users")
            .where("email", "==", email.toLowerCase())
            .where("organization_id", "==", organization_id)
            .limit(1)
            .get();

        if (userSnap.empty) {
            return NextResponse.json(
                { error: "This email is not authorized for this organization. Only invited admins can sign in." },
                { status: 403 }
            );
        }

        const adminUser = userSnap.docs[0].data();

        // 2. Check status
        if (adminUser.status === "DISABLED") {
            return NextResponse.json(
                { error: "Your account has been disabled. Contact the organization administrator." },
                { status: 403 }
            );
        }

        // 3. Generate OTP
        const otp = randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // 4. Store OTP in Firestore
        await adminDb.collection("otp_codes").doc(email.toLowerCase()).set({
            otp,
            email: email.toLowerCase(),
            organization_id,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
            used: false,
        });

        // 5. Send OTP via email
        console.log(`\n🔐 OTP for ${email}: ${otp}\n`);

        try {
            await sendOtpEmail(email.toLowerCase(), otp);
            console.log(`✅ OTP email sent to ${email}`);
        } catch (emailErr: any) {
            console.error("⚠️ OTP email failed:", emailErr.message);
            // Still return success — OTP is stored, user can check console in dev
        }

        return NextResponse.json({
            success: true,
            message: `Verification code sent to ${email}`,
        });
    } catch (error: any) {
        console.error("Send OTP error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}
