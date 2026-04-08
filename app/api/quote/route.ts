// app/api/quote/route.ts
import { NextResponse } from "next/server";
import connectToDatabase from "@/app/utils/mongodb";
import Quote from "@/app/models/Quote";
import User from "@/app/models/User";
import { checkSession } from "@/app/utils/checkSession";

const SaveQuote = async (payload: Record<string, any>, userId: string) => {
  await connectToDatabase();

  const userDoc = await User.findById(userId).exec();
  if (!userDoc) {
    return { ok: false, message: "User not found." };
  }

  // safe field extraction
  const name = payload.projectTitle || payload.name || "Untitled";
  const email = payload.email || userDoc.email || null;
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
  return {
    ok: true,
    quote: {
      ...rest,
      id: _id ? String(_id) : `tmp-${Date.now()}`,
    },
  };
};

export async function POST(request: Request) {
  try {
    const session = await checkSession();
    if (session.clearCookies) {
      return NextResponse.json({ ok: false, message: "Invalid session" }, { status: 401 });
    }
    if (session.require2FA) {
      return NextResponse.json({ ok: false, message: "2FA required" }, { status: 403 });
    }
    if (session.requireAdminApproval) {
      return NextResponse.json({ ok: false, message: "Admin approval required" }, { status: 403 });
    }
    if (!session.auth || !session.user) {
      return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
    }

    const user = session.user;

    // --- 2️⃣ Parse request body ---
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    let entries: Record<string, any> = {};

    if (contentType.includes("application/json")) {
      entries = (await request.json().catch(() => null)) ?? {};
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      entries = Object.fromEntries(formData.entries());
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported Content-Type" }, { status: 415 });
    }

    // --- 3️⃣ Normalize email ---
    if (!entries.email || entries.email.trim() === "") {
      entries.email = user.email;
    }

    if (!entries.email) {
      return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
    }

    // --- 4️⃣ Save quote ---
    const quoteResult = await SaveQuote(entries, user.uid);
    if (!quoteResult.ok) {
      return NextResponse.json({ ok: false, message: quoteResult.message || "Failed to save quote" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Quote sent and saved successfully!",
      quote: quoteResult.quote,
    });
  } catch (err: any) {
    console.error("❌ Quote POST error:", err);
    return NextResponse.json({ ok: false, message: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // --- 1️⃣ Check session ---
   const session = await checkSession();
    if (session.clearCookies) {
      return NextResponse.json({ ok: false, message: "Invalid session" }, { status: 401 });
    }
    if (session.require2FA) {
      return NextResponse.json({ ok: false, message: "2FA required" }, { status: 403 });
    }
    if (session.requireAdminApproval) {
      return NextResponse.json({ ok: false, message: "Admin approval required" }, { status: 403 });
    }
    if (!session.auth || !session.user) {
      return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
    }

    const user = session.user;

    await connectToDatabase();

    // --- 2️⃣ Build query ---
    const url = new URL(request.url);
    const statusParam = (url.searchParams.get("status") || "").toLowerCase();
    const qParam = (url.searchParams.get("q") || "").trim();

    const baseAnd: any[] = [
      {
        $or: [{ requestedBy: user.uid }, { userId: user.uid }],
      },
    ];

    const allowedStatuses = new Set(["pending", "reviewing", "sent", "accepted", "rejected"]);
    if (statusParam && allowedStatuses.has(statusParam)) {
      baseAnd.push({ status: statusParam });
    }

    if (qParam) {
      const regex = { $regex: qParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      baseAnd.push({ $or: [{ name: regex }, { email: regex }, { description: regex }] });
    }

    const query = baseAnd.length === 1 ? baseAnd[0] : { $and: baseAnd };

    const quotes = await Quote.find(query).sort({ createdAt: -1 }).lean().exec();

    return NextResponse.json({ ok: true, quotes });
  } catch (err) {
    console.error("❌ Error fetching quotes:", err);
    return NextResponse.json({ ok: false, message: "Failed to fetch quotes." }, { status: 500 });
  }
}
