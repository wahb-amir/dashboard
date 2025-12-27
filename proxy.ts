import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, generateToken } from "@/app/utils/token";

export function proxy(req: NextRequest) {
  const authToken = req.cookies.get("authToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (authToken) return NextResponse.next();
  if (!refreshToken) return NextResponse.next();

  const result = verifyToken(refreshToken);
  if (!result?.decoded) return NextResponse.next();
  const newAuthToken = generateToken({
    uid: result.decoded.uid,
    email: result.decoded.email,
    role: result.decoded.role || "client",
    name: result.decoded.name || " ",
  });

  const res = NextResponse.next();
  res.cookies.set("authToken", newAuthToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
