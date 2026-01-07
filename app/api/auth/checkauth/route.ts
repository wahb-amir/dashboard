import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, generateToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";

/**
 * GET /api/auth/restore (example)
 * - If authToken valid -> return user
 * - Else if refreshToken valid -> rotate auth + refresh tokens, return user
 * - Else -> { auth: false }
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const authCookie = cookieStore.get("authToken")?.value;
    const refreshCookie = cookieStore.get("refreshToken")?.value;
    const appCookie = cookieStore.get("appToken")?.value;

    // helper to call generateToken flexibly (in case its signature varies)
    const gen = generateToken as unknown as (
      payload: Record<string, any>,
      type?: "AUTH" | "REFRESH" | "APP"
    ) => string;

    // 1) Try to verify existing auth token
    if (authCookie) {
      const result = verifyToken(authCookie, "AUTH");
      if (result?.decoded) {
        const payload = result.decoded as AuthTokenPayload;

        const res = NextResponse.json(
          { auth: true, user: payload },
          { status: 200 }
        );

        // validate appToken if present: delete it if invalid (avoid storing wrong tokens)
        if (appCookie) {
          const appVerify = verifyToken(appCookie, "APP");
          if (!appVerify?.decoded) {
            res.cookies.delete("appToken");
          }
          // if appToken is valid we leave it alone (no unnecessary overwrite)
        }

        return res;
      }
    }

    // 2) auth invalid/missing -> try refresh token
    if (refreshCookie) {
      const refreshRes = verifyToken(refreshCookie, "REFRESH");
      if (refreshRes?.decoded) {
        const decoded = refreshRes.decoded as AuthTokenPayload;

        // 🔐 Payload for AUTH token (NO version)
        const authPayload = {
          uid: decoded.uid,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
          company: decoded.company,
        };
        const refreshPayload = {
          ...authPayload,
          version: decoded.version,
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
          maxAge: 60 * 60,
        });

        res.cookies.set({
          name: "refreshToken",
          value: newRefreshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });

        return res;
      }
    }

    // 3) No valid tokens -> not authenticated
    return NextResponse.json({ auth: false, user: null }, { status: 200 });
  } catch (err) {
    console.error("Auth route error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
