// app/api/auth/update-contact/route.ts (or wherever your route lives)
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import User from "@/app/models/User";
import connectToDatabase from "@/app/utils/mongodb";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import { sendPendingContactVerification } from "@/app/utils/sendPendingContactVerification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const visible = 2;
  const visibleLocal = local.slice(0, Math.max(0, visible));
  return `${visibleLocal}${"*".repeat(
    Math.max(0, local.length - visibleLocal.length)
  )}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Unauthorized - no refresh token" },
        { status: 401 }
      );
    }

    const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      return NextResponse.json(
        { message: "Unauthorized - invalid token" },
        { status: 401 }
      );
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (!decoded?.uid || decoded?.version == null) {
      return NextResponse.json(
        { message: "Unauthorized - invalid payload" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawEmailCandidate = body && (body.newContactEmail ?? body.email);

    if (!rawEmailCandidate || typeof rawEmailCandidate !== "string") {
      return NextResponse.json(
        { message: "Invalid or missing newContactEmail" },
        { status: 400 }
      );
    }

    const newContactEmail = rawEmailCandidate.trim().toLowerCase();
    if (!EMAIL_REGEX.test(newContactEmail)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // ensure no other user already uses this email (login/contact/pending)
    const alreadyUsed = await User.exists({
      _id: { $ne: decoded.uid },
      $or: [
        { email: newContactEmail },
        { contactEmail: newContactEmail },
        { pendingContactEmail: newContactEmail },
      ],
    });

    if (alreadyUsed) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 409 }
      );
    }

    const userDoc = await User.findById(decoded.uid).exec();
    if (!userDoc) {
      return NextResponse.json(
        { message: "Unauthorized - user not found" },
        { status: 401 }
      );
    }

    if ((userDoc as any).refreshVersion !== decoded.version) {
       cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
      return NextResponse.json({ message: "Session revoked" }, { status: 401 });
    }

    if (
      userDoc.contactEmail &&
      userDoc.contactEmail === newContactEmail &&
      userDoc.contactEmailVerified
    ) {
      return NextResponse.json(
        { message: "This email is already your verified contact email" },
        { status: 200 }
      );
    }

    // create pending contact email and token (model helper saves the doc)
    const token = await userDoc.setPendingContactEmail(newContactEmail);

    // send verification email using your util
    const sendResult = await sendPendingContactVerification(userDoc, token);

    // Build response: mask email and include whether sending succeeded.
    const responsePayload: any = {
      message: "Pending contact email saved. Verification required.",
      pendingContactEmailMasked: maskEmail(newContactEmail),
      verificationEmailSent: !!sendResult.sent,
    };

    // include dev-only link if SMTP is not configured and we're not in production
    if (!sendResult.sent && process.env.NODE_ENV !== "production") {
      responsePayload.devVerificationLink = sendResult.link;
      responsePayload.debugInfo = sendResult.info;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (e) {
    console.error("[update-contact] Error:", e);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
