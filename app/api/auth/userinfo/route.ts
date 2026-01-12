import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";

export async function GET(req: Request) {
  try {
    console.log("[userinfo] Request received");

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      console.warn("[userinfo]  No refreshToken cookie found");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    console.log("[userinfo]  refreshToken found");

    const verifyRes = verifyToken(refreshToken, "REFRESH");

    if (!verifyRes?.decoded) {
      console.warn("[userinfo]  Token verification failed");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;

    console.log("[userinfo] 🔓 Token decoded", {
      uid: decoded?.uid,
      version: decoded?.version,
    });

    if (!decoded?.uid) {
      console.warn("[userinfo]  Decoded token missing uid");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    await connectToDatabase();
    console.log("[userinfo]  Connected to database");

    const userDoc = await User.findById(decoded.uid).lean();

    if (!userDoc) {
      console.warn("[userinfo]  User not found", { uid: decoded.uid });
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    console.log("[userinfo] 👤 User found", {
      userId: userDoc._id.toString(),
      refreshVersion: (userDoc as any).refreshVersion,
    });

    if ((userDoc as any).refreshVersion !== decoded.version) {
      console.warn("[userinfo]  Token version mismatch", {
        refreshVersion: decoded.version,
        dbVersion: (userDoc as any).refreshVersion,
      });
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    console.log("[userinfo]  Auth success");

    return NextResponse.json(
      {
        auth: true,
        user: {
          name: userDoc.name,
          email: userDoc.email,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[userinfo]  Unexpected error", e);
    return NextResponse.json({ auth: false }, { status: 500 });
  }
}