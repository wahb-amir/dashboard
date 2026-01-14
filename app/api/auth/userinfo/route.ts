import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  const visible = 2;
  const visibleLocal = local.slice(0, visible);
  return `${visibleLocal}${"*".repeat(Math.max(0, local.length - visible))}@${domain}`;
}

export async function GET(req: Request) {
  try {
    console.log("[userinfo] Request received");

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      console.warn("[userinfo] No refreshToken cookie found");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      console.warn("[userinfo] Token verification failed");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (!decoded?.uid) {
      console.warn("[userinfo] Decoded token missing uid");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(decoded.uid).lean();
    if (!userDoc) {
      console.warn("[userinfo] User not found", { uid: decoded.uid });
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    if ((userDoc as any).refreshVersion !== decoded.version) {
       cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
      console.warn("[userinfo] Token version mismatch");
      return NextResponse.json({ auth: false }, { status: 401 });
    }

    const contactEmail = userDoc.contactEmail || null;
    const pendingContactEmail = (userDoc as any).pendingContactEmail || null;

    return NextResponse.json(
      {
        auth: true,
        user: {
          name: userDoc.name,
          email: userDoc.email, 
          contactEmail,
          contactEmailVerified: Boolean(contactEmail),

          pendingContactEmail,
          pendingContactEmailMasked: maskEmail(pendingContactEmail),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[userinfo] Unexpected error", e);
    return NextResponse.json({ auth: false }, { status: 500 });
  }
}
