// app/api/auth/register/route.ts
import { NextResponse as Response, NextRequest } from "next/server";
import validator from "validator";
import connectToMongoose from "@/app/utils/mongodb";
import User from "@/app/models/User";
import { verifyToken, generateToken } from "@/app/utils/token";
import redis from "@/app/utils/redis";

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  company?: unknown;
};

type DecodedToken = {
  uid?: string;
  email?: string;
  role?: string;
  name?: string;
  [k: string]: any;
};

// --- Safe Redis helpers (no-op when redis is null/undefined) ---
const safeGet = (key: string): Promise<string | null> =>
  redis && typeof redis.get === "function"
    ? (redis.get(key) as Promise<string | null>)
    : Promise.resolve(null);

const safeIncr = (key: string): Promise<any> =>
  redis && typeof redis.incr === "function"
    ? (redis.incr(key) as Promise<any>)
    : Promise.resolve(null);

const safeExpire = (key: string, seconds: number): Promise<any> =>
  redis && typeof redis.expire === "function"
    ? (redis.expire(key, seconds) as Promise<any>)
    : Promise.resolve(null);

const safeDel = (key: string): Promise<any> =>
  redis && typeof redis.del === "function"
    ? (redis.del(key) as Promise<any>)
    : Promise.resolve(null);

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as RegisterBody;

    const token = request.headers.get("x-app-token");
    const name = typeof body.name === "string" ? body.name : undefined;
    const email = body.email;
    const password = body.password;
    const company = body.company ?? false;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
      "unknown_ip";

    const MAX_ATTEMPTS_IP = 3;
    const MAX_ATTEMPTS_EMAIL = 5;
    const BLOCK_TIME = 60 * 30; // 30 minutes

    const emailLower =
      typeof email === "string" ? String(email).toLowerCase() : "";

    const keyIp = `register:ip:${ip}`;
    const keyEmail = emailLower ? `register:email:${emailLower}` : null;

    // If redis is not available, safeGet will resolve to null => counters treated as 0
    if (!redis) {
      // optional: you can remove this console.warn in production
      console.warn(
        "Redis client is not available — skipping rate limiting checks."
      );
    }

    const [ipCountRaw, emailCountRaw] = await Promise.all([
      safeGet(keyIp),
      keyEmail ? safeGet(keyEmail) : Promise.resolve(null),
    ]);
    const ipCount = parseInt(ipCountRaw || "0", 10);
    const emailCount = parseInt(emailCountRaw || "0", 10);

    if (ipCount >= MAX_ATTEMPTS_IP) {
      return Response.json(
        {
          error:
            "Too many registration attempts from this IP. Try again later.",
        },
        { status: 429 }
      );
    }
    if (keyEmail && emailCount >= MAX_ATTEMPTS_EMAIL) {
      return Response.json(
        {
          error:
            "Too many registration attempts for this email. Try again later.",
        },
        { status: 429 }
      );
    }

    if (!token) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json({ error: "Token not found!" }, { status: 400 });
    }

    const decoded = verifyToken(token, "APP") as DecodedToken | null;
    if (!decoded) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json({ error: "Invalid token!" }, { status: 401 });
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json(
        { error: "Name is required (min 2 chars)" },
        { status: 400 }
      );
    }

    if (!email || !validator.isEmail(String(email))) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // connect mongoose
    await connectToMongoose();

    // check existing user
    const existing = await User.findOne({ email: emailLower }).lean();
    if (existing) {
      await Promise.all([
        safeIncr(keyIp),
        safeExpire(keyIp, BLOCK_TIME),
        keyEmail ? safeIncr(keyEmail) : Promise.resolve(),
        keyEmail ? safeExpire(keyEmail, BLOCK_TIME) : Promise.resolve(),
      ]);
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // create and save user (pre-save hook hashes password)

    const userDoc = new User({
      name: name.trim(),
      email: emailLower,
      password: password,
      role: "client",
      company: company ? company : false,
    });

    const saved = await userDoc.save();

    const newUserId = saved._id?.toString();

    await Promise.all([
      safeDel(keyIp),
      keyEmail ? safeDel(keyEmail) : Promise.resolve(),
    ]);

    // tokens
    const authToken = generateToken({
      uid: newUserId,
      email: emailLower,
      role: "client",
      name: name.trim(),
      company: company ? company : false,
    });
    const refreshToken = generateToken({
      uid: newUserId,
      email: emailLower,
      role: "client",
      name: name.trim(),
      company: company ? company : false,
    });

    const res = Response.json(
      {
        message: "Registration successful",
        user: {
          id: newUserId,
          name: saved.name,
          email: saved.email,
          role: saved.role,
        },
        token: authToken,
      },
      { status: 201 }
    );

    res.cookies.set({
      name: "authToken",
      value: authToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    res.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

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
    try {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
        "unknown_ip";
      await safeIncr(`register:ip:${ip}`);
      await safeExpire(`register:ip:${ip}`, 60 * 5);
    } catch (e) {
      // ignore
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
