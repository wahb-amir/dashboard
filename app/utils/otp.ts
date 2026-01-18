// app/utils/otp.ts
import crypto from "crypto";
import type Redis from "ioredis";
import nodemailer from "nodemailer";

export const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_ATTEMPT_LIMIT = 5;
const ATTEMPT_TTL_SECONDS = 10 * 60; // attempts window

function genNumericOtp(length = 6) {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(length, "0");
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

/**
 * Create a Gmail transporter using SMTP (user/pass).
 * Uses env vars:
 *   - MAIL_USER (required) -> the Gmail address
 *   - MAIL_PASS (required) -> app password or SMTP password
 *   - MAIL_NAME (optional) -> display name for From
 *
 * NOTE: Gmail often requires an App Password (if 2FA enabled) or OAuth2. Using plain
 * account password is often blocked by Google. Use app passwords or OAuth2 for production.
 */
export function createGmailTransporter() {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    throw new Error("MAIL_USER and MAIL_PASS environment variables are required for Gmail transporter");
  }

  // Using SMTPS (port 465) — widely supported by Gmail
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send OTP email and store hashed OTP in redis.
 * - tempSessionId is a short random id (uuid or nanoid) that ties this OTP to a pending login/device flow.
 * - data object is stored for verification (userId, fingerprint, etc).
 */
export async function sendOtpEmail(opts: {
  redisClient: Redis;
  toEmail: string;
  name?: string | null;
  tempSessionId: string;
  userId: string;
  fingerprint?: string | null;
  transporterInstance?: nodemailer.Transporter | null; // optional override
  otpLength?: number;
}) {
  const {
    redisClient,
    toEmail,
    name = null,
    tempSessionId,
    userId,
    fingerprint = null,
    transporterInstance,
    otpLength = 6,
  } = opts;

  if (!redisClient) throw new Error("Redis client required");
  const otp = genNumericOtp(otpLength);
  const otpHash = hashOtp(otp);

  const key = `otp:${tempSessionId}`;
  const payload = {
    otpHash,
    userId,
    fingerprint,
    createdAt: new Date().toISOString(),
  };

  // store hashed OTP and metadata
  await redisClient.set(key, JSON.stringify(payload), "EX", OTP_TTL_SECONDS);

  // reset attempts counter
  await redisClient.del(`otp:attempts:${tempSessionId}`);

  // build email
  const ttlMinutes = Math.ceil(OTP_TTL_SECONDS / 60);
  const mailHtml = buildOtpHtml({ name, otp, siteName: process.env.APP_NAME || "Dashboard", ttlMinutes });
  const fromName = process.env.MAIL_NAME || name || process.env.APP_NAME || "YourApp";
  const fromAddr = process.env.MAIL_FROM || process.env.MAIL_USER;
  const mailFrom = fromAddr ? `"${fromName}" <${fromAddr}>` : fromName;

  const mailOpts = {
    from: mailFrom,
    to: toEmail,
    subject: `${process.env.APP_NAME || "YourApp"} — Your verification code`,
    html: mailHtml,
  };

  // choose transporter: explicit override first, otherwise create Gmail transporter from env
  const transporter = transporterInstance ?? createGmailTransporter();

  try {
    await transporter.sendMail(mailOpts);
  } catch (err) {
    // on error, cleanup the stored OTP so we don't leak pending sessions
    // (caller may want to retry sending, so cleanup to avoid orphaned entries)
    await redisClient.del(key);
    await redisClient.del(`otp:attempts:${tempSessionId}`);
    // bubble up a useful error
    throw new Error(`Failed to send OTP email: ${(err as Error).message}`);
  }

  return { ok: true, ttl: OTP_TTL_SECONDS };
}

/**
 * Verify OTP submitted by user.
 * - Returns { ok: boolean, reason?: string }.
 * - On success, removes OTP key and attempts key. Caller should proceed to create session.
 */
export async function verifyOtp(opts: {
  redisClient: Redis;
  tempSessionId: string;
  otp: string;
}) {
  const { redisClient, tempSessionId, otp } = opts;
  if (!redisClient) throw new Error("Redis client required");

  const attemptsKey = `otp:attempts:${tempSessionId}`;
  const key = `otp:${tempSessionId}`;

  // throttle attempts
  const attemptsRaw = await redisClient.get(attemptsKey);
  const attempts = parseInt(attemptsRaw || "0", 10);
  if (attempts >= OTP_ATTEMPT_LIMIT) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const raw = await redisClient.get(key);
  if (!raw) {
    return { ok: false, reason: "expired_or_missing" };
  }

  let payload: { otpHash: string; userId: string; fingerprint?: string | null };
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    // malformed payload — remove and fail
    await redisClient.del(key);
    return { ok: false, reason: "invalid_payload" };
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash === payload.otpHash) {
    // success -> clean up and return userId so caller can create session
    await Promise.all([redisClient.del(key), redisClient.del(attemptsKey)]);
    return { ok: true, userId: payload.userId, fingerprint: payload.fingerprint ?? null };
  }

  // bad otp -> increment attempts and return failure
  await redisClient.incr(attemptsKey);
  await redisClient.expire(attemptsKey, ATTEMPT_TTL_SECONDS);

  const remaining = OTP_ATTEMPT_LIMIT - (attempts + 1);
  return { ok: false, reason: "invalid_otp", attemptsLeft: Math.max(0, remaining) };
}

/** Small helper: build HTML for the OTP email (nice looking) */
export function buildOtpHtml(opts: { name?: string | null; otp: string; siteName?: string; ttlMinutes?: number }) {
  const { name = "User", otp, siteName = "YourApp", ttlMinutes = Math.ceil(OTP_TTL_SECONDS / 60) } = opts;
  // keep template minimal but attractive
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${siteName} — Verification Code</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#f6f8fb; margin:0; padding:0; }
      .card { max-width:640px; margin:32px auto; background:#fff; border-radius:12px; box-shadow: 0 8px 30px rgba(20,20,40,0.08); padding:28px; }
      .brand { display:flex; align-items:center; gap:12px; }
      .brand h1 { font-size:18px; margin:0; letter-spacing:0.2px; }
      .hero { margin-top:18px; }
      .otp { display:inline-block; font-size:32px; letter-spacing:6px; padding:14px 22px; background:#f1f6ff; border-radius:8px; margin:12px 0; font-weight:700; }
      p { color:#2b2b37; line-height:1.5; }
      .muted { color:#6b6f77; font-size:13px; }
      .warning { color:#b71c1c; font-weight:700; margin-top:18px; }
      .footer { margin-top:22px; font-size:13px; color:#8a8d94; }
      .btn { display:inline-block; background:#0b63ff; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">
        <div style="width:44px;height:44px;border-radius:8px;background:#eef4ff;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0b63ff"> ${siteName[0] ?? "A"} </div>
        <h1>${siteName} — Device verification</h1>
      </div>

      <div class="hero">
        <p>Hi ${escapeHtml(name || "User")},</p>
        <p class="muted">Use the verification code below to add this device as a trusted device for your account. The code will expire in ${ttlMinutes} minute(s).</p>

        <div class="otp">${escapeHtml(otp)}</div>

        <p class="muted">If you did not request this, ignore this email or contact support.</p>

        <p class="warning">DO NOT SHARE THIS CODE — it grants access to add a new trusted device for your account.</p>

        <div class="footer">If you have trouble, reply to this email and we'll help.</div>
      </div>
    </div>
  </body>
  </html>
  `;
}

/** small html-escaper to avoid accidental injection via name or otp */
function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
