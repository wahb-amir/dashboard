import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/app/utils/token";

export async function GET(request: NextRequest) {
  try {
    const appToken = request.cookies.get("appToken")?.value;

    if (appToken) {
      return NextResponse.json(
        { message: "Token exists", token: appToken },
        { status: 200 }
      );
    }

    // Generate a new token
    const token = generateToken({}, "APP", { expiresIn: "30m" });

    // Create response and set cookie
    const response = NextResponse.json(
      { message: "Token generated", token },
      { status: 200 }
    );

    response.cookies.set({
      name: "appToken",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 30, // 30 minutes
    });

    return response;
  } catch (err) {
    console.error("❌ Error generating app token:", err);
    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
