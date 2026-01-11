// app/api/quote/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyToken } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import Quote from "@/app/models/Quote";
import User from "@/app/models/User";

/**
 * SaveQuote expects the decoded refresh token (refreshDecoded)
 * and returns { ok: boolean, quote?: any, message?: string }.
 */
const SaveQuote = async (payload: Record<string, any>, refreshDecoded: any) => {
  if (!refreshDecoded || !refreshDecoded.uid) {
    return { ok: false, message: "Invalid auth data" };
  }

  await connectToDatabase();

  const userDoc = await User.findById(String(refreshDecoded.uid)).select("refreshVersion").exec();
  if (!userDoc) {
    return { ok: false, message: "User not found." };
  }

  // token revocation check (normalize to numbers if possible)
  const tokenVersion = typeof refreshDecoded.version === "number" ? refreshDecoded.version : Number(refreshDecoded.version);
  const userVersion = typeof userDoc.refreshVersion === "number" ? userDoc.refreshVersion : Number(userDoc.refreshVersion);

  if (!Number.isNaN(tokenVersion) && userVersion !== tokenVersion) {
    return { ok: false, message: "Session revoked." };
  }

  // safe field extraction
  const name = payload.projectTitle || payload.name || "Untitled";
  const email = payload.email || null;
  const description = payload.details || payload.description || null;
  const budgetRaw = payload.budget ?? null;
  const budget =
    budgetRaw === null || budgetRaw === undefined
      ? 0
      : typeof budgetRaw === "number"
      ? budgetRaw
      : parseInt(String(budgetRaw).replace(/[^0-9]/g, "")) || 0;
  const deadline = payload.deadline ?? null;

  // Create and save
  const newQuote = await Quote.create({
    userId: userDoc._id,
    requestedBy: userDoc._id,
    name,
    email,
    description,
    budget,
    deadline,
    status: "pending",
  });

  const saved = typeof newQuote.toObject === "function" ? newQuote.toObject() : newQuote;
  const { _id, __v, ...rest } = saved;

  // Ensure id is always a string
  const quoteOut = {
    ...rest,
    id: _id ? String(_id) : `tmp-${Date.now()}`,
  };

  return { ok: true, quote: quoteOut };
};

export async function POST(request: Request) {
  try {
    // --- 1. Parse body according to content-type ---
    const contentType = (request.headers.get("content-type") || "").toLowerCase();

    let entries: Record<string, any> = {};

    if (contentType.includes("application/json")) {
      // JSON body
      entries = (await request.json().catch(() => null)) ?? {};
      if (typeof entries !== "object" || entries === null) {
        return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
      }
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      entries = Object.fromEntries(formData.entries());
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported Content-Type" }, { status: 415 });
    }

    // --- 2. Auth: read cookies defensively ---
    const authToken = (request as any).cookies?.get?.("authToken")?.value ?? null;
    const refreshToken = (request as any).cookies?.get?.("refreshToken")?.value ?? null;

    if (!refreshToken) {
      return NextResponse.json({ ok: false, message: "No user auth token provided." }, { status: 401 });
    }

    const verified = verifyToken(refreshToken, "REFRESH") ?? null;
    const refreshDecoded = verified?.decoded ?? null;

    if (!refreshDecoded || !refreshDecoded.uid) {
      return NextResponse.json({ ok: false, message: "Invalid or expired user auth token." }, { status: 401 });
    }

    // --- 3. Save to DB using decoded token ---
    const quoteSaveResult = await SaveQuote(entries, refreshDecoded);

    if (!quoteSaveResult.ok) {
      return NextResponse.json({ ok: false, message: quoteSaveResult.message || "Failed to save quote" }, { status: 400 });
    }

    // --- 4. Build email body using parsed entries ---
    // const htmlBody = `
    //   <div style="font-family: sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
    //     <h2 style="color:#2563eb;">📋 New Quote Request Received</h2>
    //     <p>A user has submitted a new quote request via the dashboard.</p>
    //     <hr />
    //     <p><b>Project:</b> ${entries.projectTitle || entries.name || "—"}</p>
    //     <p><b>Client:</b> ${entries.contactName || entries.name || "—"} (${entries.email || "—"})</p>
    //     <p><b>Budget:</b> ${entries.budget ?? "—"}</p>
    //     <p><b>Deadline:</b> ${entries.deadline || "—"}</p>
    //     <div style="background:#f9fafb; padding:15px; border-radius:5px;">
    //       <b>Project Details:</b><br/>
    //       <p>${entries.details || entries.description || "—"}</p>
    //     </div>
    //   </div>
    // `;

    // --- 5. Send email (nodemailer) ---
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.MAIL_USER,
    //     pass: process.env.MAIL_PASS,
    //   },
    // });

    // await transporter.sendMail({
    //   from: process.env.MAIL_USER,
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `📋 New Quote Request: ${entries.projectTitle || entries.name || "Untitled"}`,
    //   html: htmlBody,
    // });

    // --- 6. Final response ---
    return NextResponse.json({
      ok: 1,
      message: "Quote sent and saved successfully!",
      quote: quoteSaveResult.quote,
    });
  } catch (err: any) {
    console.error("❌ Final Route Error:", err);
    return NextResponse.json(
      {
        ok: 0,
        error: err?.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authToken = (request as any).cookies?.get?.("authToken")?.value ?? null;
    const refreshToken = (request as any).cookies?.get?.("refreshToken")?.value ?? null;

    if (!refreshToken) {
      return NextResponse.json({ ok: false, message: "No user auth token provided." }, { status: 401 });
    }

    const { decoded: refreshDecoded } = verifyToken(refreshToken, "REFRESH") ?? {};
    if (!refreshDecoded || !refreshDecoded.uid) {
      return NextResponse.json({ ok: false, message: "Invalid or expired user auth token." }, { status: 401 });
    }

    await connectToDatabase();
    const userDoc = await User.findById(String(refreshDecoded.uid)).lean().exec();
    if (!userDoc) {
      return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
    }
    if (userDoc.refreshVersion !== refreshDecoded.version) {
      return NextResponse.json({ ok: false, message: "Session revoked" }, { status: 401 });
    }

    const quotes = await Quote.find({ $or: [{ requestedBy: refreshDecoded.uid }, { userId: refreshDecoded.uid }] })
      .select("name email budget deadline status createdAt")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ ok: true, quotes });
  } catch (err) {
    console.error("❌ Error fetching quotes:", err);
    return NextResponse.json({ ok: false, message: "Failed to fetch quotes." }, { status: 500 });
  }
}
