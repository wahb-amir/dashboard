import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";

export async function POST(req: Request) {
  try {
    const cookiesStore= await cookies();
    const refreshToken = cookiesStore.get("refreshToken")?.value;
    if(!refreshToken){
        return NextResponse.json({message:"Refresh token not found"}, {status:401});
    }
     const verifyRes = verifyToken(refreshToken, "REFRESH");
    if (!verifyRes?.decoded) {
      return NextResponse.json({ message: "Unauthorized - invalid token" }, { status: 401 });
    }

    const decoded = verifyRes.decoded as AuthTokenPayload;
    if (decoded?.uid == null || decoded.version == null) {
      return NextResponse.json({ message: "Unauthorized - invalid payload" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const {token } = body || {};
    if(!token){
        return NextResponse.json({message:"Missing uid or token"}, {status:400});
    }
    await connectToDatabase();

    const userDoc = await User.findById(decoded.uid);
    if(!userDoc){
        return NextResponse.json({message:"User not found"}, {status:404});
    }
    if((userDoc as any).pendingContactEmailToken !== token){
        return NextResponse.json({message:"Invalid verification token"}, {status:400});
    }

    // update user document to verify contact email
    (userDoc as any).contactEmailVerified = true;
    (userDoc as any).pendingContactToken = null;
    await userDoc.save();
    return NextResponse.json({message:"Contact email verified successfully"}, {status:200});
  } catch (e) {
    console.error("[verify-code] Error in POST", e);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
