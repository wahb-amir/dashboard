// app/api/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/utils/redis";
import { sendOtpEmail, OTP_TTL_SECONDS } from "@/app/utils/otp";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";

const RESEND_COOLDOWN_SECONDS = 2 * 60; // 2 minutes
const LOCK_EXPIRE_SECONDS = 5; // short lock to prevent races

export async function GET(req: NextRequest) {
  try {
    // --- 1) Verify device token ---
    const deviceVerificationToken = req.cookies.get("deviceVerificationToken")?.value;
    if (!deviceVerificationToken) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const verifyRes = verifyToken(deviceVerificationToken, "DEVICE_VERIFICATION");
    if (!verifyRes?.decoded) {
      return NextResponse.json({ ok: false, message: "Unauthorized - invalid token" }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    const { uid: userId, email, name } = decoded;
    if (!userId || !email) {
      return NextResponse.json({ ok: false, message: "Unauthorized - invalid payload" }, { status: 401 });
    }

    // --- Redis keys ---
    const otpKey = `otp:${userId}`; // stores OTP
    const cooldownKey = `otp:cooldown:${userId}`; // prevents frequent resends
    const lockKey = `otp:lock:${userId}`; // short-lived lock to prevent race

    // --- 2) Check cooldown ---
    const cooldownTtl = await redis.ttl(cooldownKey); // seconds left
    if (cooldownTtl > 0) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: "resend_cooldown",
        retryAfter: cooldownTtl, // tell frontend how many seconds are left
      });
    }

    // --- 3) Acquire short lock ---
    const lockAcquired = await redis.set(lockKey, "1", "EX", LOCK_EXPIRE_SECONDS, "NX");
    if (!lockAcquired) {
      return NextResponse.json({
        ok: false,
        sent: false,
        reason: "busy",
        retryAfter: 1,
      }, { status: 429 });
    }

    try {
      // --- 4) Delete old OTP if exists ---
      const otpExists = await redis.get(otpKey);
      if (otpExists) {
        await redis.del(otpKey);
      }

      const fingerprint = req.headers.get("user-agent") ?? null;

      // --- 5) Send new OTP ---
      await sendOtpEmail({
        redisClient: redis,
        toEmail: email,
        name: name ?? null,
        tempSessionId: userId, // use UID as key
        userId,
        fingerprint,
      });

      // --- 6) Set resend cooldown ---
      await redis.set(cooldownKey, "1", "EX", RESEND_COOLDOWN_SECONDS);

      // --- 7) Return success ---
      return NextResponse.json({
        ok: true,
        sent: true,
        retryAfter: RESEND_COOLDOWN_SECONDS,
      });
    } finally {
      // release lock early (lock expires anyway)
      try { await redis.del(lockKey); } catch {}
    }
  } catch (err) {
    console.error("send-otp route error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
