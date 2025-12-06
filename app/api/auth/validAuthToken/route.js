import { NextResponse as Response } from "next/server";
import { checkAuth, renewAuthToken } from "@/app/utils/token";

export async function GET(request) {
    const authToken = request.cookies.get("authToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Prefer authToken, fallback to refreshToken
    const token = authToken || refreshToken;

    if (!token) {
        return Response.json({ error: "Not authenticated", ok: 0 }, { status: 401 });
    }

    let decoded = checkAuth(token);

    // If using refresh token because auth token expired
    if (decoded && token === refreshToken) {
        const newAuthToken = renewAuthToken(refreshToken);

        if (!newAuthToken) {
            return Response.json({ error: "Not authenticated", ok: 0 }, { status: 401 });
        }

        // decode the new token to get user info
        decoded = checkAuth(newAuthToken);

        const response = Response.json(
            { message: "Authenticated", ok: 1, name: decoded?.name || "Unknown" },
            { status: 200 }
        );

        response.cookies.set({
            name: "authToken",
            value: newAuthToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });

        return response;
    }

    if (decoded) {
        return Response.json(
            { message: "Authenticated", ok: 1, name: decoded.name },
            { status: 200 }
        );
    }

    return Response.json({ error: "Not authenticated", ok: 0 }, { status: 401 });
}
