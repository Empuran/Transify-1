import nodemailer from "nodemailer";

// Gmail SMTP transport — requires SMTP_EMAIL and SMTP_PASSWORD in .env.local
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface InviteEmailParams {
    to: string;
    organizationName: string;
    inviterName: string;
    role: string;
    acceptUrl: string;
}

export async function sendAdminInviteEmail({
    to,
    organizationName,
    inviterName,
    role,
    acceptUrl,
}: InviteEmailParams) {
    const roleLabel = role === "SUPER_ADMIN" ? "Super Admin" : "Admin";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">🚌 Transify</h1>
              <p style="color:#bfdbfe;font-size:13px;margin:8px 0 0;">Smart Transport Intelligence</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#1e293b;font-size:20px;font-weight:700;margin:0 0 8px;">You've been invited!</h2>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong style="color:#1e293b;">${inviterName}</strong> has invited you to join 
                <strong style="color:#1e293b;">${organizationName}</strong> as a 
                <strong style="color:#2563eb;">${roleLabel}</strong> on Transify.
              </p>
              
              <!-- Role Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f0f4ff;border-radius:12px;padding:16px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <div style="width:40px;height:40px;background-color:#2563eb;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-size:18px;">🛡️</div>
                        </td>
                        <td>
                          <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">Role: ${roleLabel}</p>
                          <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Organization: ${organizationName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;line-height:1.5;">
                This invite expires in <strong>48 hours</strong>.<br>
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
                © ${new Date().getFullYear()} Transify · Smart Transport Intelligence
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"Transify Admin" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `You're invited to join ${organizationName} on Transify`,
        html,
    });
}
