import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, generateToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";

/**
 * GET /api/auth/restore
 * - If authToken valid -> return user
 * - Else if refreshToken valid -> rotate auth + refresh tokens
 * - Else -> auth: false
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    const authToken = cookieStore.get("authToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const appToken = cookieStore.get("appToken")?.value;

    const gen = generateToken as (
      payload: Record<string, any>,
      type?: "AUTH" | "REFRESH" | "APP"
    ) => string;

    /* ----------------------------------------------------
       1️⃣ AUTH TOKEN (FAST PATH)
    ---------------------------------------------------- */
    if (authToken) {
      const authRes = verifyToken(authToken, "AUTH");

      if (authRes?.decoded) {
        const payload = authRes.decoded as AuthTokenPayload;

        const res = NextResponse.json(
          { auth: true, user: payload },
          { status: 200 }
        );

        // validate appToken quietly
        if (appToken) {
          const appVerify = verifyToken(appToken, "APP");
          if (!appVerify?.decoded) {
            res.cookies.delete("appToken");
          }
        }

        return res;
      }
    }

    /* ----------------------------------------------------
       2️⃣ REFRESH TOKEN (ROTATION)
    ---------------------------------------------------- */
    if (refreshToken) {
      const refreshRes = verifyToken(refreshToken, "REFRESH");

      if (refreshRes?.decoded) {
        const decoded = refreshRes.decoded as AuthTokenPayload;
      
        // 🔒 HARD VALIDATION (NO ROTATION IF BROKEN)
        if (
          !decoded.uid ||
          !decoded.sid ||
          !decoded.fingerprint ||
          typeof decoded.fingerprint !== "string" ||
          typeof decoded.sid !== "string"
        ) {
          console.warn("Invalid refresh token payload, rotation aborted");
          cookieStore.delete("authToken");
          cookieStore.delete("refreshToken");
          return NextResponse.json({ auth: false }, { status: 401 });
        }

  
        const {
          uid,
          email,
          role,
          name,
          company,
          fingerprint,
          sid,
          version,
        } = decoded;

        const authPayload = {
          uid,
          email,
          role,
          name,
          company,
          fingerprint,
          sid,
        };

        const refreshPayload = {
          ...authPayload,
          version,
        };

        const newAuthToken = gen(authPayload, "AUTH");
        const newRefreshToken = gen(refreshPayload, "REFRESH");

        const res = NextResponse.json(
          { auth: true, user: authPayload },
          { status: 200 }
        );

        res.cookies.set({
          name: "authToken",
          value: newAuthToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60, // 1h
        });

        res.cookies.set({
          name: "refreshToken",
          value: newRefreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7d
        });

        return res;
      }
    }

    /* ----------------------------------------------------
       3️⃣ NO VALID SESSION
    ---------------------------------------------------- */
    cookieStore.delete("authToken");
    cookieStore.delete("refreshToken");

    return NextResponse.json({ auth: false, user: null }, { status: 200 });
  } catch (err) {
    console.error("Auth restore error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
