import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/utils/token";
import { AuthTokenPayload } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import User from "@/app/models/User";


export async function POST(req:Request){
    try{
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
        
        await connectToDatabase();
        const userDoc = await User.findById(decoded.uid);
        if(userDoc?.refreshVersion!=decoded.version){
            cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
            return NextResponse.json({message:"session revoked"},{status:401});
        }
        if(!userDoc){
            return NextResponse.json({message:"User not found"}, {status:404});
        }
        const pendingToken = (userDoc as any).pendingContactEmailToken;
        const pendingContactEmail = (userDoc as any).pendingContactEmail;
        if(pendingToken || pendingContactEmail){
            (userDoc as any).pendingContactEmailToken = null;
            (userDoc as any).pendingContactEmailTokenExpires = null;
            (userDoc as any).pendingContactEmail = null;
            (userDoc as any).contactEmailVerified = false;
            (userDoc as any).contactEmailToken = null;
            (userDoc as any).contactEmailTokenExpires = null;
            await userDoc.save();
            return NextResponse.json({message:"Pending contact email request cancelled"}, {status:200});
        }
    }
    catch(e){
        console.log("[verify-code] Error in POST", e);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
          );
    }
}