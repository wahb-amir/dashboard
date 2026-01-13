import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const shuffled = chars.split('').sort(() => 0.5 - Math.random());
  return shuffled.slice(0, length).join('');
}

function formatExpiry(date: Date): string {
  return date.toLocaleString();
}

export async function POST(req: Request) {
  try {
    // read refresh token from cookies (server-side)
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
    if (decoded?.uid == null || decoded.version == null) {
      return NextResponse.json({ message: "Unauthorized - invalid payload" }, { status: 401 });
    }

    // connect to DB
    await connectToDatabase();

    const userDoc = await User.findById(decoded.uid).exec();
    if (!userDoc) {
      return NextResponse.json({ message: "Unauthorized - user not found" }, { status: 401 });
    }

    // optional: verify refreshVersion matches
    if ((userDoc as any).refreshVersion !== decoded.version) {
      return NextResponse.json({ message: "Session revoked" }, { status: 401 });
    }

    // pick contact email if present, otherwise primary email
    const email = (userDoc as any).contactEmail || (userDoc as any).email;
    if (!email) {
      return NextResponse.json({ message: "No email available for user" }, { status: 400 });
    }

    // generate code and expiry (15 minutes)
    const verificationCode = generateCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // persist to user doc (use correct field names)
    await User.findByIdAndUpdate(decoded.uid, {
      $set: {
        verificationCode: verificationCode,
        verificationCodeExpires: expiresAt,
      },
    }).exec();

    // set up nodemailer transporter (Gmail)
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // build HTML email
    const appUrl = process.env.ORIGIN || "https://dashboard.wahb.space";

    const html = `
      <div style="font-family:Arial, Helvetica, sans-serif; color:#111;">
        <div style="max-width:680px;margin:0 auto;padding:24px;border-radius:8px;background:#fff;">
          <h2 style="margin:0 0 8px 0;color:#0b3d91;">
            Your Verification Code
          </h2>

          <p style="margin:0 0 16px 0;color:#333;">
            Hello ${(userDoc as any).name ?? ""},<br/>
            Use the verification code below to continue. This code will expire in
            <strong>15 minutes</strong>.
          </p>

          <div style="margin:20px 0;padding:16px;border-radius:8px;background:#f5f7ff;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:28px;letter-spacing:4px;font-weight:700;color:#0b3d91;">
              ${verificationCode}
            </span>
          </div>

          <p style="margin:0 0 8px 0;color:#666;">
            Enter this code in the app to verify your action.  
            If you did not request this, you can safely ignore this email.
          </p>

          <p style="margin:16px 0 0 0;color:#666;font-size:13px;">
            Expires at: <strong>${formatExpiry(expiresAt)}</strong>
          </p>

          <hr style="margin:18px 0;border:none;border-top:1px solid #eee" />

          <p style="font-size:12px;color:#999;margin:0;">
            Sent from <a href="${appUrl}" style="color:#0b3d91;text-decoration:none">
              ${appUrl}
            </a>
          </p>
        </div>
      </div>
    `;

    // send mail
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || "No Reply"}" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your verification code (expires in 15 minutes)",
      html,
    });

    return NextResponse.json({ success: true, message: "Verification code sent" }, { status: 200 });
  } catch (err) {
    console.error("[send-verification-code] Error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
