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

  const userDoc = await User.findById(String(refreshDecoded.uid))
    .select("refreshVersion")
    .exec();
  if (!userDoc) {
    return { ok: false, message: "User not found." };
  }

  // token revocation check (normalize to numbers if possible)
  const tokenVersion =
    typeof refreshDecoded.version === "number"
      ? refreshDecoded.version
      : Number(refreshDecoded.version);
  const userVersion =
    typeof userDoc.refreshVersion === "number"
      ? userDoc.refreshVersion
      : Number(userDoc.refreshVersion);

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

  const saved =
    typeof newQuote.toObject === "function" ? newQuote.toObject() : newQuote;
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

    // single mutable entries object for both branches
    let entries: Record<string, any> = {};

    if (contentType.includes("application/json")) {
      // JSON body
      entries = (await request.json().catch(() => null)) ?? {};
      if (typeof entries !== "object" || entries === null) {
        return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
      }
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Form data (defensive)
      const formData = await request.formData();
      // Object.fromEntries is fine here — we will still validate fields below
      entries = Object.fromEntries(formData.entries());
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported Content-Type" }, { status: 415 });
    }

    // --- 2. Auth: read cookies defensively ---
    const refreshToken = (request as any).cookies?.get?.("refreshToken")?.value ?? null;
    if (!refreshToken) {
      return NextResponse.json({ ok: false, message: "No user auth token provided." }, { status: 401 });
    }

    const verified = verifyToken(refreshToken, "REFRESH") ?? null;
    const refreshDecoded = verified?.decoded ?? null;

    if (!refreshDecoded || !refreshDecoded.uid) {
      return NextResponse.json({ ok: false, message: "Invalid or expired user auth token." }, { status: 401 });
    }

    // --- 2.5 Normalize / resolve email ---
    // If client provided an email (non-empty string) -> use it.
    // Otherwise, fetch from user doc and use that.
    let emailFromRequest: string | null = null;
    if (typeof entries.email === "string" && entries.email.trim() !== "") {
      emailFromRequest = entries.email.trim();
    }

    if (!emailFromRequest) {
      // fetch the user's email from DB (fallback)
      await connectToDatabase();
      const userDoc = await User.findById(String(refreshDecoded.uid)).select("email").lean().exec();
      emailFromRequest = userDoc?.email ?? null;
    }

    // If you require an email at all times, error out here. Otherwise entries.email will be null.
    if (!emailFromRequest) {
      return NextResponse.json({ ok: false, message: "Email is required (either in request or on user profile)." }, { status: 400 });
    }

    // Put normalized email back into entries so SaveQuote receives it
    entries.email = emailFromRequest;

    // --- 3. Save to DB using decoded token (SaveQuote will still perform its own safety checks) ---
    const quoteSaveResult = await SaveQuote(entries, refreshDecoded);

    if (!quoteSaveResult.ok) {
      return NextResponse.json({ ok: false, message: quoteSaveResult.message || "Failed to save quote" }, { status: 400 });
    }

    // --- 4. Final response ---
    return NextResponse.json({
      ok: 1,
      message: "Quote sent and saved successfully!",
      quote: quoteSaveResult.quote,
    });
  } catch (err: any) {
    console.error("❌ Final Route Error:", err);
    return NextResponse.json({
      ok: 0,
      error: err?.message || "An error occurred while processing your request.",
    }, { status: 500 });
  }
}


export async function GET(request: Request) {
  try {
    const { decoded: refreshDecoded } =
      verifyToken(
        (request as any).cookies?.get?.("refreshToken")?.value ?? "",
        "REFRESH"
      ) ?? {};

    if (!refreshDecoded || !refreshDecoded.uid) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired user auth token." },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const userDoc = await User.findById(String(refreshDecoded.uid))
      .lean()
      .exec();
    if (!userDoc) {
      return NextResponse.json(
        { ok: false, message: "User not found." },
        { status: 404 }
      );
    }
    if (userDoc.refreshVersion !== refreshDecoded.version) {
      cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
      return NextResponse.json(
        { ok: false, message: "Session revoked" },
        { status: 401 }
      );
    }

    // Read query params
    const url = new URL(request.url);
    const statusParam = (url.searchParams.get("status") || "").toLowerCase();
    const qParam = (url.searchParams.get("q") || "").trim();

    // Build secure base query: only quotes belonging to the user (requestedBy OR userId)
    const baseAnd: any[] = [
      {
        $or: [
          { requestedBy: refreshDecoded.uid },
          { userId: refreshDecoded.uid },
        ],
      },
    ];

    // Accept only known statuses — ignore unknown values
    const allowedStatuses = new Set([
      "pending",
      "reviewing",
      "sent",
      "accepted",
      "rejected",
    ]);
    if (statusParam && allowedStatuses.has(statusParam)) {
      baseAnd.push({ status: statusParam });
    }

    // Search (case-insensitive) across name, email, description
    if (qParam) {
      const regex = {
        $regex: qParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      }; // escape qParam
      baseAnd.push({
        $or: [{ name: regex }, { email: regex }, { description: regex }],
      });
    }

    const query = baseAnd.length === 1 ? baseAnd[0] : { $and: baseAnd };

    const quotes = await Quote.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ ok: true, quotes });
  } catch (err) {
    console.error("❌ Error fetching quotes:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch quotes." },
      { status: 500 }
    );
  }
}
