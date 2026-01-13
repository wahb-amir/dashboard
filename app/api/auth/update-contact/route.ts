import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import User from "@/app/models/User";
import connectToDatabase from "@/app/utils/mongodb";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const contactEmailRawToken = cookieStore.get("contact_email_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "Unauthorized - no refresh token" }, { status: 401 });
    }
    if (!contactEmailRawToken) {
      return NextResponse.json({ message: "Unauthorized - no contact email token" }, { status: 401 });
    }

    const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      return NextResponse.json({ message: "Unauthorized - invalid token" }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (!decoded?.uid || decoded?.version == null) {
      return NextResponse.json({ message: "Unauthorized - invalid payload" }, { status: 401 });
    }

    // parse body (accept either newContactEmail or email for compatibility)
    const body = await req.json().catch(() => ({}));
    const rawEmailCandidate = body && (body.newContactEmail ?? body.email);

    if (!rawEmailCandidate || typeof rawEmailCandidate !== "string") {
      return NextResponse.json({ message: "Invalid or missing newContactEmail" }, { status: 400 });
    }

    const newContactEmail = rawEmailCandidate.trim().toLowerCase();
    if (!EMAIL_REGEX.test(newContactEmail)) {
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
    }

    // connect to DB
    await connectToDatabase();

    // ensure no other user already uses this email (either as login email or contactEmail)
    const alreadyUsed = await User.exists({
      _id: { $ne: decoded.uid },
      $or: [{ email: newContactEmail }, { contactEmail: newContactEmail }],
    });

    if (alreadyUsed) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 });
    }

    const userDoc = await User.findById(decoded.uid).exec();
    if (!userDoc) {
      return NextResponse.json({ message: "Unauthorized - user not found" }, { status: 401 });
    }

    // optional: verify refreshVersion matches
    if ((userDoc as any).refreshVersion !== decoded.version) {
      return NextResponse.json({ message: "Session revoked" }, { status: 401 });
    }

    // Ensure user has a stored hashed token and expiry
    const storedHashedToken: string = (userDoc as any).contactEmailToken ?? "";
    const tokenExpiry: Date | null = (userDoc as any).contactEmailTokenExpires ?? null;

    if (!storedHashedToken) {
      return NextResponse.json({ message: "No contact email token stored" }, { status: 401 });
    }

    if (!tokenExpiry || new Date() > new Date(tokenExpiry)) {
      return NextResponse.json({ message: "Contact email token expired" }, { status: 400 });
    }

    // Hash the raw token from the cookie and compare to stored hash
    const hashedIncoming = crypto.createHash("sha256").update(String(contactEmailRawToken)).digest("hex");
    if (hashedIncoming !== storedHashedToken) {
      return NextResponse.json({ message: "Invalid contact email token" }, { status: 401 });
    }

    // All checks passed — update the contact email and clear token fields
    const updated = await User.findByIdAndUpdate(
      decoded.uid,
      {
        $set: { contactEmail: newContactEmail },
        $unset: { contactEmailToken: 1, contactEmailTokenExpires: 1 },
      },
      { new: true }
    ).exec();

    if (!updated) {
      return NextResponse.json({ message: "Failed to update contact email" }, { status: 500 });
    }

    // Clear the cookie on the response by setting it with maxAge 0
    cookieStore.set({
      name: "contact_email_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ message: "Contact email updated successfully" }, { status: 200 });
  } catch (e) {
    console.error("[update-contact] Error:", e);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
