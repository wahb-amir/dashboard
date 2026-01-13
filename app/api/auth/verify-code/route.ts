import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, currentPassword } = body || {};

    if (!code) {
      return NextResponse.json({ message: "Missing code in request" }, { status: 400 });
    }

    // server-side cookie store (request-scoped)
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "Unauthorized - no refresh token" }, { status: 401 });
    }

    const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      return NextResponse.json({ message: "Unauthorized - invalid token" }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (decoded?.uid == null || decoded.version == null) {
      return NextResponse.json({ message: "Unauthorized - invalid payload" }, { status: 401 });
    }

    // connect to DB
    await connectToDatabase();

    const userDoc = await User.findById(decoded.uid).exec();
    if (!userDoc) {
      return NextResponse.json({ message: "Unauthorized - user not found" }, { status: 401 });
    }

    // optional: verify refreshVersion matches
    if ((userDoc as any).refreshVersion !== decoded.version) {
      return NextResponse.json({ message: "Session revoked" }, { status: 401 });
    }

    // Validate provided verification code and expiry
    const expectedCode = (userDoc as any).verificationCode ?? "";
    const expiresAt: Date | null = (userDoc as any).verificationCodeExpires ?? null;

    if (!expectedCode || expectedCode !== String(code).trim()) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    if (!expiresAt || new Date() > new Date(expiresAt)) {
      return NextResponse.json({ message: "Verification code expired" }, { status: 400 });
    }

    // If current password is required, verify it
    if (!currentPassword || !(await (userDoc as any).comparePassword(currentPassword))) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
    }

    // Clear the used verification code so it can't be reused
    (userDoc as any).verificationCode = "";
    (userDoc as any).verificationCodeExpires = null;

    // === generate one-time contact email token ===
    const rawToken = crypto.randomBytes(32).toString("hex"); // raw token sent to cookie
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    (userDoc as any).contactEmailToken = hashedToken;
    (userDoc as any).contactEmailTokenExpires = tokenExpiresAt;

    await userDoc.save();

    // Set the cookie with the raw token (HttpOnly)
    cookieStore.set({
      name: "contact_email_token",
      value: rawToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60, // seconds
    });

    return NextResponse.json({ success: true, message: "Verified. One-time token issued." }, { status: 200 });
  } catch (err) {
    console.error("[verify-code] Error in POST", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
