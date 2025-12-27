import { NextResponse } from "next/server";
import { verifyToken } from "@/app/utils/token";
import type { AuthTokenPayload } from "@/app/utils/token";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [key, ...rest] = c.split("=");
        return [key, rest.join("=")];
      })
    );

    const authToken = cookies["authToken"];
    let payload: AuthTokenPayload | null = null;

    // verify existing auth token (proxy handles refresh/set)
    if (authToken) {
      const result = verifyToken(authToken, "AUTH");
      if (result?.decoded) payload = result.decoded;
    }

    return NextResponse.json(
      { auth: !!payload, user: payload || null },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
