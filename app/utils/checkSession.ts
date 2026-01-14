import { cookies } from "next/headers";
import { verifyToken, generateToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "./mongodb";
import Session from "../models/Session";
import User from "../models/User";

export interface SessionCheckResult {
  auth: boolean;
  user?: AuthTokenPayload;
  rotated?: boolean;
  clearCookies?: boolean;
  require2FA?: boolean; // redirect to 2FA page
  requireAdminApproval?: boolean; // block until admin approval
}

export async function checkSession(): Promise<SessionCheckResult> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("authToken")?.value;
    const refreshCookie = cookieStore.get("refreshToken")?.value;
    const gen = generateToken as unknown as (
      payload: Record<string, any>,
      type?: "AUTH" | "REFRESH" | "APP"
    ) => string;

    if (!refreshCookie) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    const refreshVerify = verifyToken(refreshCookie, "REFRESH");
    if (!refreshVerify?.decoded) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    const decoded = refreshVerify.decoded as AuthTokenPayload;
    if (!decoded?.uid || !decoded?.version) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    // Connect DB
    await connectToDatabase();

    // 1️⃣ Check global refreshVersion
    const userDoc = await User.findById(decoded.uid)
      .select("refreshVersion lastLogin")
      .lean()
      .exec();

    if (!userDoc) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    if (userDoc.refreshVersion !== decoded.version) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    // 2️⃣ Check session and fingerprint
    const sessionDoc = await Session.findOne({
      userId: decoded.uid,
      sid: decoded.sid,
      revoked: false,
      blocked: false,
    }).lean();

    const fingerprintMismatch =
      sessionDoc?.fingerprint !== decoded.fingerprint;

    const previousLoginExists = !!userDoc.lastLogin;

    if (fingerprintMismatch && previousLoginExists) {
      // Soft signal: require 2FA
      return { auth: false, require2FA: true };
    }

    if (!previousLoginExists && fingerprintMismatch) {
      // Hard signal: block login, require admin approval
      return { auth: false, requireAdminApproval: true };
    }

    // 3️⃣ Rotate tokens if everything is fine
    const authPayload: AuthTokenPayload = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      company: decoded.company,
      deviceId: decoded.deviceId,
      version: decoded.version,
      fingerprint: decoded.fingerprint,
      sid: decoded.sid,
    };

    const refreshPayload = {
      ...authPayload,
      refreshVersion: decoded.refreshVersion,
    };

    const newAuthToken = gen(authPayload, "AUTH");
    const newRefreshToken = gen(refreshPayload, "REFRESH");

    cookieStore.set({
      name: "authToken",
      value: newAuthToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    cookieStore.set({
      name: "refreshToken",
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return { auth: true, user: authPayload, rotated: true };
  } catch (err) {
    console.error("Session check error:", err);
    return { auth: false, clearCookies: true };
  }
}
