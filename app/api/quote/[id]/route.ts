// app/api/quote/[id]/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import Quote from "@/app/models/Quote";
import User from "@/app/models/User";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // ✅ FIX HERE

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Missing quote id" },
        { status: 400 }
      );
    }

    const refreshToken =
      (request as any).cookies?.get?.("refreshToken")?.value ?? null;

    if (!refreshToken) {
      return NextResponse.json(
        { ok: false, message: "No user auth token provided." },
        { status: 401 }
      );
    }

    const verified = verifyToken(refreshToken, "REFRESH") ?? null;
    const refreshDecoded = verified?.decoded ?? null;

    if (!refreshDecoded?.uid) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired user auth token." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const userDoc = await User.findById(refreshDecoded.uid)
      .select("refreshVersion")
      .lean()
      .exec();

    if (!userDoc) {
      return NextResponse.json(
        { ok: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (userDoc.refreshVersion !== refreshDecoded.version) {
      return NextResponse.json(
        { ok: false, message: "Session revoked." },
        { status: 401 }
      );
    }

    const deleted = await Quote.findOneAndDelete({
      _id: id,
      $or: [
        { requestedBy: refreshDecoded.uid },
        { userId: refreshDecoded.uid },
      ],
    }).exec();

    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "Quote not found or permission denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deletedId: id,
    });
  } catch (err) {
    console.error("❌ Delete quote error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to delete quote." },
      { status: 500 }
    );
  }
}
