// app/utils/sendPendingContactVerification.ts
import nodemailer from "nodemailer";

type UserLike = {
  _id: any;
  name?: string;
  pendingContactEmail?: string | null;
};

type SendResult = {
  sent: boolean;
  info?: any;
  link: string;
};

/**
 * Send a verification link to a user's pending contact email.
 *
 * Expects:
 * - process.env.ORIGIN or process.env.APP_URL to build the link
 * - Optional MAIL env vars: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, EMAIL_FROM
 *
 * If MAIL_HOST is present, uses direct SMTP transport.
 * If MAIL_HOST is absent but MAIL_USER + MAIL_PASS are present, falls back to
 * nodemailer's `service: "Gmail"` (useful for quick dev with Gmail app passwords).
 *
 * The verification link by default points to a **frontend route** (default: "/verify-contact")
 * so that the frontend can display a polished UX and then call your API to complete verification.
 *
 * Returns { sent, info, link } where `link` is the verification URL (useful in tests).
 */
export async function sendPendingContactVerification(
  user: UserLike,
  token: string,
  opts?: { ttlHours?: number; subject?: string; from?: string; frontendPath?: string }
): Promise<SendResult> {
  if (!user || !user._id) {
    throw new Error("Missing user");
  }
  if (!token) {
    throw new Error("Missing token");
  }

  const ttlHours = opts?.ttlHours ?? 24;
  const appUrl =
    (process.env.ORIGIN || process.env.APP_URL || "https://dashboard.wahb.space").replace(/\/+$/, "");
  const uid = String(user._id);

  // FRONTEND PATH: default to a friendly page that will call your API to verify the token.
  // Example: frontendPath = "/verify-contact" -> user clicks link and the SPA page calls /api/auth/verify-pending-contact
  const frontendPath = opts?.frontendPath ?? "/verify-contact";
  const path = frontendPath.startsWith("/") ? frontendPath : `/${frontendPath}`;

  const link = `${appUrl}${path}?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;

  const to = user.pendingContactEmail;
  if (!to) {
    throw new Error("User has no pendingContactEmail to verify");
  }

  const subject = opts?.subject ?? "Verify your new contact email";
  const from = opts?.from ?? process.env.EMAIL_FROM ?? `no-reply@${new URL(appUrl).hostname}`;

  const text = `Hi ${user.name ?? ""},

We received a request to add this email as your contact address on your account. Click the link below to verify and activate it (valid for ${ttlHours} hours):

${link}

If you didn't request this change, you can ignore this message — no changes will be made until the link is clicked.

Thanks,
The team
`;

  const html = `<p>Hi ${user.name ?? ""},</p>
<p>We received a request to add this email as your contact address on your account. Click the link below to verify and activate it (valid for <strong>${ttlHours} hours</strong>):</p>
<p><a href="${link}">Verify new contact email</a></p>
<p>If you didn't request this change, you can ignore this message — no changes will be made until the link is clicked.</p>
<p>Thanks,<br/>The team</p>`;

  // Primary: explicit MAIL_HOST configuration
  const MAILHost = process.env.MAIL_HOST;
  const MAIL_USER = process.env.MAIL_USER;
  const MAIL_PASS = process.env.MAIL_PASS;

  let transporter: nodemailer.Transporter | null = null;

  if (MAILHost) {
    const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587;
    const secure = port === 465;
    transporter = nodemailer.createTransport({
      host: MAILHost,
      port,
      secure,
      auth:
        MAIL_USER && MAIL_PASS
          ? {
              user: MAIL_USER,
              pass: MAIL_PASS,
            }
          : undefined,
    });
  } else if (MAIL_USER && MAIL_PASS) {
    // Fallback: use nodemailer's named service for Gmail when only user+pass provided.
    transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }

  if (transporter) {
    try {
      await transporter.verify();
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      return { sent: true, info, link };
    } catch (err) {
      // log but return structured failure so caller (route) can decide how to respond
      // eslint-disable-next-line no-console
      console.error("[sendPendingContactVerification] mail send error:", err);
      return { sent: false, info: err, link };
    }
  }

  // No MAIL config — fallback: log the link (useful for development)
  // Caller can still read the returned link and present it in UI if desired.
  // eslint-disable-next-line no-console
  console.warn("[sendPendingContactVerification] MAIL not configured. Verification link (dev-only):", link);

  return { sent: false, info: "MAIL not configured; link logged to server console", link };
}
