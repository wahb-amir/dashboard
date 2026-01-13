// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { verifyToken } from "@/app/utils/token";
// import type { AuthTokenPayload } from "@/app/utils/token";
// import connectToDatabase from "@/app/utils/mongodb";
// import User from "@/app/models/User";
// import { verifyPassword } from "@/app/utils/hash";

// export async function POST(req: Request) {
//   try {
//     const cookiesStore = await cookies();
//     const refreshToken = cookiesStore.get("refreshToken")?.value;
//     if (!refreshToken) {
//       console.warn("No refresh token cookie");
//       return NextResponse.json({ success: false, message: "No refresh token" }, { status: 401 });
//     }

//     const verifyRes = verifyToken(refreshToken, "REFRESH");
//     if (!verifyRes?.decoded) {
//       console.warn("Invalid refresh token");
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
//     }

//     const decoded = verifyRes.decoded as AuthTokenPayload;
//     if (!decoded?.uid || decoded?.version == null) {
//       console.warn("Invalid token payload", decoded);
//       return NextResponse.json({ success: false, message: "Invalid token data" }, { status: 401 });
//     }

//     const body = await req.json().catch(() => ({}));
//     const { password, contactEmail } = body;

//     if (!password || typeof password !== "string") {
//       return NextResponse.json({ success: false, message: "Password is required" }, { status: 400 });
//     }

//     if (contactEmail !== undefined && typeof contactEmail !== "string") {
//       return NextResponse.json({ success: false, message: "Invalid contactEmail" }, { status: 400 });
//     }

//     const contactEmailToSet =
//       contactEmail !== undefined ? (contactEmail as string).trim().toLowerCase() : undefined;

//     await connectToDatabase();

//     // fetch user
//     const userDoc = await User.findById(decoded.uid)
//     if (!userDoc) {
//       console.warn("User not found for id:", decoded.uid);
//       return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
//     }

//     if (userDoc.refreshVersion !== decoded.version) {
//       return NextResponse.json({ success: false, message: "Token version mismatch" }, { status: 401 });
//     }

//     if (!userDoc.password) {
//       console.error("User missing password hash:", decoded.uid);
//       return NextResponse.json({ success: false, message: "User password not set" }, { status: 500 });
//     }

//     const isMatch = await verifyPassword(password, userDoc.password);
//     if (!isMatch) {
//       return NextResponse.json({ success: false, message: "Incorrect password" }, { status: 401 });
//     }

//     // If contactEmail is provided (even empty string), attempt update
//     if (contactEmailToSet !== undefined) {
    

//       // Preferred: use updateOne to check modifiedCount, and also findByIdAndUpdate for returning the doc
//       const updateRes = await User.updateOne(
//         { _id: decoded.uid },
//         { $set: { contactEmail: contactEmailToSet } }
//       );

//       // If updateOne says 0 modified, try findByIdAndUpdate to get returned doc (useful if validators prevented write)
//       if ((updateRes as any).modifiedCount === 0 && (updateRes as any).matchedCount === 1) {
//         console.warn("No documents modified — verifying with findByIdAndUpdate to inspect doc");
//       }

//       // Try to fetch fresh doc to return authoritative value
//       const refreshed = await User.findById(decoded.uid)

//       const updatedContactEmail = refreshed?.contactEmail ?? contactEmailToSet;

//       return NextResponse.json({
//         success: true,
//         message: "Password verified and contact email updated",
//         updatedContactEmail,
//         debug: {
//           contactEmailToSet,
//           updateOne: updateRes,
//           before: userDoc,
//           after: refreshed,
//         },
//       });
//     }

//     // No contact email provided — just verification
//     return NextResponse.json({ success: true, message: "Password verified" });
//   } catch (err) {
//     console.error("verify-password error:", err);
//     return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
//   }
// }
