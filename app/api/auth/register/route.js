// app/api/auth/register/route.js
import { NextResponse as Response } from "next/server";
import validator from "validator";
import connectToDatabase from "@/app/utils/mongodb";
import { verifyToken, generateToken } from "@/app/utils/token";
import { hashPassword } from "@/app/utils/hash";
import redis from "@/app/utils/redis";

export async function POST(request) {
    try {
        const body = await request.json();
        const token = request.cookies.get("appToken")?.value;
        const { name, email, password } = body;

        // identify client: prefer x-forwarded-for, fallback to unknown
        const ip = request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() || "unknown_ip";

        // rate limit config
        const MAX_ATTEMPTS_IP = 3;
        const MAX_ATTEMPTS_EMAIL = 5;
        const BLOCK_TIME = 60 * 30; // 30 minutes in seconds

        const emailLower = typeof email === "string" ? String(email).toLowerCase() : "";

        const keyIp = `register:ip:${ip}`;
        const keyEmail = emailLower ? `register:email:${emailLower}` : null;

        // fetch counters (safe parse)
        const [ipCountRaw, emailCountRaw] = await Promise.all([
            redis.get(keyIp),
            keyEmail ? redis.get(keyEmail) : Promise.resolve(null),
        ]);
        const ipCount = parseInt(ipCountRaw || "0", 10);
        const emailCount = parseInt(emailCountRaw || "0", 10);

        // block check
        if (ipCount >= MAX_ATTEMPTS_IP) {
            return Response.json({ error: "Too many registration attempts from this IP. Try again later." }, { status: 429 });
        }
        if (keyEmail && emailCount >= MAX_ATTEMPTS_EMAIL) {
            return Response.json({ error: "Too many registration attempts for this email. Try again later." }, { status: 429 });
        }

        // token requirement
        if (!token) {
            // increment counters because this looks like a failed attempt
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Token not found!" }, { status: 400 });
        }

        const decoded = verifyToken(token, "APP");
        if (!decoded) {
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Invalid token!" }, { status: 401 });
        }

        // validate inputs
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
        }

        if (!email || !validator.isEmail(String(email))) {
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Invalid email format" }, { status: 400 });
        }

        if (typeof password !== "string" || password.length < 6) {
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
        }

        // connect to DB
        const { db } = await connectToDatabase();

        // check existing user (use emailLower)
        const existing = await db.collection("users").findOne({ email: emailLower });
        if (existing) {
            // increment counters for attempted register on existing email
            await Promise.all([
                redis.incr(keyIp),
                redis.expire(keyIp, BLOCK_TIME),
                keyEmail ? redis.incr(keyEmail) : Promise.resolve(),
                keyEmail ? redis.expire(keyEmail, BLOCK_TIME) : Promise.resolve(),
            ]);
            return Response.json({ error: "Email already registered" }, { status: 409 });
        }

        // hash password & insert user
        const hashed = await hashPassword(password);
        const now = new Date();
        const insertResult = await db.collection("users").insertOne({
            name: name.trim(),
            email: emailLower,
            password: hashed,
            createdAt: now,
            updatedAt: now,
            role: "client",
        });

        const newUserId = insertResult.insertedId?.toString();

        // success: clear counters for ip/email
        await Promise.all([
            redis.del(keyIp),
            keyEmail ? redis.del(keyEmail) : Promise.resolve(),
        ]);

        // generate auth token (AUTH) and refresh token
        const authToken = generateToken({ uid: newUserId, email: emailLower, role: "client", name: name.trim() }, "AUTH");
        const refreshToken = generateToken({ uid: newUserId, email: emailLower, role: "client", name: name.trim() }, "refresh");

        // create a response instance, set cookies on it, then return it
        const res = Response.json({ message: "Registration successful", user: {
            id: newUserId,
            name: name.trim(),
            email: emailLower,
            role: "client",
        }, token: authToken }, { status: 201 });

        // set cookies on the response instance
        res.cookies.set({
            name: "authToken",
            value: authToken,
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

        // clear appToken by setting empty value and maxAge 0 (expire immediately)
        res.cookies.set({
            name: "appToken",
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch (error) {
        console.error("Register error:", error);

        // on unexpected error, increment IP counter (avoid leaking)
        try {
            const ip = request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() || "unknown_ip";
            await redis.incr(`register:ip:${ip}`);
            await redis.expire(`register:ip:${ip}`, 60 * 5);
        } catch (e) {
            // ignore
        }

        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
