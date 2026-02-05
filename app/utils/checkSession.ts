// app/utils/checkSession.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "./mongodb";
import Session from "../models/Session";
import User from "../models/User";
import { evaluateTrust } from "./trustEngine";
import redis from "./redis";
export interface SessionCheckResult {
  auth: boolean;
  user?: AuthTokenPayload;
  clearCookies?: boolean;
  require2FA?: boolean;
  requireAdminApproval?: boolean;
}

export async function checkSession(opts?: {
  ip?: string | null;
  ua?: string | null;
  geo?: { lat: number; lon: number } | null;
  recentFailedLoginCount?: number;
  ipReputationScore?: number | null;
}): Promise<SessionCheckResult> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("authToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  try {
      if (!refreshToken) {
        cookieStore.delete("authToken");
        cookieStore.delete("refreshToken");
        return { auth: false, clearCookies: true };
      }

    const refreshVerify = verifyToken(refreshToken, "REFRESH");
    if (!refreshVerify?.decoded) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    const decoded = refreshVerify.decoded as AuthTokenPayload | Record<string, any>;
    if (!decoded || !decoded.uid || (decoded.version === undefined || decoded.version === null)) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    await connectToDatabase();
    const userDoc = await User.findById(String(decoded.uid)).select("refreshVersion lastLogin avgLoginHour").lean().exec();
    if (!userDoc) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    const tokenVersion = typeof decoded.version === "number" ? decoded.version : Number(decoded.version);
    const userVersion = typeof userDoc.refreshVersion === "number" ? userDoc.refreshVersion : Number(userDoc.refreshVersion);

    if (!Number.isNaN(tokenVersion) && userVersion !== tokenVersion) {
      cookieStore.delete("authToken");
      cookieStore.delete("refreshToken");
      return { auth: false, clearCookies: true };
    }

    
    const sid = decoded.sid ?? null;
    let sessionDoc: any | null = null;
    if (sid) {
      sessionDoc = await Session.findOne({
        userId: decoded.uid,
        sid,
        revoked: false,
        blocked: false,
      }).lean().exec();
    }

    const trust = await evaluateTrust({
      decoded,
      userDoc,
      ip: opts?.ip ?? null,
      ua: opts?.ua ?? null,
      geo: opts?.geo ?? null,
      recentFailedLoginCount: opts?.recentFailedLoginCount ?? 0,
      ipReputationScore: opts?.ipReputationScore ?? null,
      redisClient: redis,
    });

    if (trust.action === "allow") {
      return { auth: true, user: decoded as AuthTokenPayload };
    }
    if (trust.action === "require2FA") {
      return { auth: false, require2FA: true };
    }
    if (trust.action === "requireDeviceApproval") {
      return { auth: false, requireAdminApproval: true };
    }
    return { auth: false, clearCookies: true };
  } catch (err) {
    console.error("Session check error:", err);
    cookieStore.delete("authToken");
    cookieStore.delete("refreshToken");
    return { auth: false, clearCookies: true };
  }
}
