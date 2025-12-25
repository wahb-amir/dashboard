import { NextResponse as Response } from "next/server";
import validator from "validator";
import connectToDatabase from "@/app/utils/mongodb";
import { verifyToken, generateToken, checkAuth } from "@/app/utils/token";
import { verifyPassword } from "@/app/utils/hash";
import redis from "@/app/utils/redis";

export async function POST(request) {
    try {
        const body = await request.json();
        const token = request.cookies.get("appToken")?.value;
        const { email, password } = body;

        const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown_ip";
        const key = `login_attempts:${ip}`;
        const MAX_ATTEMPTS = 6;
        const BLOCK_TIME = 60 * 10; // 10 minutes

        const attempts = parseInt((await redis.get(key)) || "0");
        if (attempts >= MAX_ATTEMPTS) {
            return Response.json({ error: "Too many login attempts" }, { status: 429 });
        }

        if (!token) return Response.json({ error: "Token not found!" }, { status: 400 });

        const decoded = verifyToken(token, "APP");
        if (!decoded) return Response.json({ error: "Invalid token!" }, { status: 401 });
        if (!email || !validator.isEmail(String(email))) {
            return Response.json({ error: "Invalid email format" }, { status: 400 });
        }
        if (typeof password !== "string" || password.length < 6) {
            return Response.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection("users").findOne({ email: String(email).toLowerCase() });

        if (!user) {
            await redis.incr(key);
            await redis.expire(key, BLOCK_TIME);
            return Response.json({ error: "User not found" }, { status: 401 });
        }

        const ok = await verifyPassword(password, user.password);
        if (!ok) {
            await redis.incr(key);
            await redis.expire(key, BLOCK_TIME);
            return Response.json({ error: "Invalid credentials" }, { status: 401 });
        }

        await redis.del(key);

        const clientAuthToken = generateToken(
            { uid: user._id.toString(), email: user.email, role: user.role || "client",name:user.name || " " },
        );
        const refreshToken = generateToken(
            { uid: user._id.toString(), email: user.email, role: user.role || "client" ,name:user.name || " " },
            "refresh"
        );

        // create a response instance, set cookies on that instance, then return it
        let res = Response.json({
            message: "Login successful",
            token: clientAuthToken, // returning the new auth token 
            user: {
                id: user._id.toString(),
                name: user.name || null,
                email: user.email,
                role: user.role || "client",
            },
        }, { status: 200 });

        // set cookies on the instance
        res.cookies.set({
            name: "authToken",
            value: clientAuthToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });
        res.cookies.set({
            name: "refreshToken",
            value: refreshToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });
        res.cookies.set({
            name: "appToken",
            value: " ",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch (error) {
        console.error("Login error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
