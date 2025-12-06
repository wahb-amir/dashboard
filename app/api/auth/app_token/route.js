import { NextResponse as Response } from "next/server";
import { generateToken } from "@/app/utils/token";

export async function GET(request) {
    const response = Response.json({ message: "Logged in" });
    const appToken = request.cookies.get("appToken")?.value;
    if (appToken) {
        return Response.json({ message: "Token exists", token:appToken }, { status: 200 });
    }
    const token = generateToken({}, "APP", { expiresIn: "1h" });
    response.cookies.set({
        name: "appToken",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
    });
    response.json({ message: "Token generated", token });
    return response;
}