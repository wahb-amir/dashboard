// app/api/auth/resend-pending-contact/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import User from "@/app/models/User";
import connectToDatabase from "@/app/utils/mongodb";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import { sendPendingContactVerification } from "@/app/utils/sendPendingContactVerification";

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const visible = 2;
  const visibleLocal = local.slice(0, Math.max(0, visible));
  return `${visibleLocal}${"*".repeat(Math.max(0, local.length - visibleLocal.length))}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "Unauthorized - no refresh token" }, { status: 401 });
    }

    const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      return NextResponse.json({ message: "Unauthorized - invalid token" }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (!decoded?.uid) {
      return NextResponse.json({ message: "Unauthorized - invalid payload" }, { status: 401 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(decoded.uid).exec();
    if (!userDoc) {
      return NextResponse.json({ message: "Unauthorized - user not found" }, { status: 401 });
    }

    // Must have a pendingContactEmail to resend to
    const pending = (userDoc as any).pendingContactEmail;
    if (!pending) {
      return NextResponse.json({ message: "No pending contact email to resend to", pendingContactEmailMasked: null }, { status: 400 });
    }

    // If token exists and not expired, reuse it. Otherwise create a new token.
    const tokenExpiry: Date | null = (userDoc as any).pendingContactEmailTokenExpires ?? null;
    const now = new Date();
    let token: string;

    if ((userDoc as any).pendingContactEmailToken && tokenExpiry && tokenExpiry > now) {
      token = (userDoc as any).pendingContactEmailToken;
    } else {
      // generate a fresh token and save it
      token = await userDoc.setPendingContactEmail(pending);
      // NOTE: setPendingContactEmail will overwrite pendingContactEmail (same value) and set a new token+expiry
    }

    // send the verification email
    const sendResult = await sendPendingContactVerification(userDoc, token);

    const payload: any = {
      message: sendResult.sent ? "Verification email resent" : "Failed to send verification email (see debug)",
      pendingContactEmailMasked: maskEmail(pending),
      verificationEmailSent: !!sendResult.sent,
    };

    if (!sendResult.sent && process.env.NODE_ENV !== "production") {
      payload.devVerificationLink = sendResult.link;
      payload.debugInfo = sendResult.info;
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    console.error("[resend-pending-contact] Error:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
