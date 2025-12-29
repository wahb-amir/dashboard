import { NextResponse } from "next/server";
import { verifyToken, generateToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const [key, ...rest] = c.split("=");
          return [key, decodeURIComponent(rest.join("="))];
        })
    );
    

    const authToken = cookies["authToken"];
    const refreshToken = cookies["refreshToken"];
   
    let payload: AuthTokenPayload | null = null;

    // 1) Try to verify existing auth token
    if (authToken) {
      const result = verifyToken(authToken, "AUTH");
      if (result?.decoded) {
        payload = result.decoded;

        return NextResponse.json(
          { auth: true, user: payload },
          { status: 200 }
        );
      }
    }

    // 2) If auth token is missing/invalid but we have a refresh, verify & rotate
    if (refreshToken) {
      const refreshRes = verifyToken(refreshToken);
      if (refreshRes?.decoded) {
        // create new auth token
        const newAuthToken = generateToken({
          uid: refreshRes.decoded.uid,
          email: refreshRes.decoded.email,
          role: refreshRes.decoded.role || "client",
          name: refreshRes.decoded.name || "",
        });


        payload = {
          uid: refreshRes.decoded.uid,
          email: refreshRes.decoded.email,
          role: refreshRes.decoded.role || "client",
          name: refreshRes.decoded.name || "",
        } as AuthTokenPayload;

        const res = NextResponse.json(
          { auth: true, user: payload },
          { status: 200 }
        );
        res.cookies.set({
          name: "appToken",
          value: newAuthToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 0,
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
