// app/api/auth/login/route.ts
import { NextResponse as Response, NextRequest } from "next/server";
import validator from "validator";
import connectToMongoose from "@/app/utils/mongodb";
import User from "@/app/models/User";
import Session from "@/app/models/Session";
import { verifyToken, generateToken } from "@/app/utils/token";
import type { DecodedToken } from "@/app/utils/token";
import { verifyPassword } from "@/app/utils/hash";
import redis from "@/app/utils/redis";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { recordSuccessfulLogin } from "@/app/utils/session";
type LoginBody = {
  email?: unknown;
  password?: unknown;
};

// Safe redis helpers (no-op when redis missing)
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

// -------------------- helpers --------------------
function makeFingerprint(userAgent: string, ip: string) {
  const secret = process.env.FP_SECRET || "change_this_secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${userAgent}|${ip}`)
    .digest("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// -------------------- route --------------------
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as LoginBody;
    const token = request.headers.get("x-app-token");
    const emailVal = body.email;
    const passwordVal = body.password;

    const email =
      typeof emailVal === "string" ? emailVal.trim().toLowerCase() : "";
    const password = typeof passwordVal === "string" ? passwordVal : "";

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
      (request as any).ip ||
      "unknown_ip";

    const key = `login_attempts:${ip}`;
    const MAX_ATTEMPTS = 6;
    const BLOCK_TIME = 60 * 10; // 10 minutes

    if (!redis) {
      console.warn(
        "Redis client not available — login rate limiting disabled."
      );
    }

    const attemptsRaw = await safeGet(key);
    const attempts = parseInt(attemptsRaw || "0", 10);

    if (attempts >= MAX_ATTEMPTS) {
      return Response.json(
        { error: "Too many login attempts" },
        { status: 429 }
      );
    }

    if (!token) {
      // increment attempt (no-op if redis missing)
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "Token not found!" }, { status: 400 });
    }

    const decoded = verifyToken(token, "APP") as DecodedToken | null;
    if (!decoded) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: decoded }, { status: 401 });
    }

    if (!email || !validator.isEmail(String(email))) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // ensure mongoose connection
    await connectToMongoose();

    // find user and explicitly select password (schema has select: false)
    const user = await User.findOne({ email }).select("+password").exec();

    if (!user) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "User not found" }, { status: 401 });
    }

    const hashed = (user as any).password as string | undefined;
    if (!hashed) {
      // Extremely defensive check — won't typically happen
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, hashed);
    if (!ok) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // success — clear attempts
    await safeDel(key);

    // -------------------- create session & tokens --------------------
    const userAgent =
      request.headers.get("user-agent")?.slice(0, 1024) || "unknown_ua";

    const fingerprint = makeFingerprint(userAgent, ip);
    const sid = uuidv4();

    const sessionDoc = new Session({
      userId: user._id,
      sid,
      userAgent,
      ip,
      os: undefined,
      browser: undefined,
      deviceName: undefined,
      fingerprint,
      revoked: false,
      blocked: false,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await recordSuccessfulLogin(user._id.toString(), sid, fingerprint, ip, userAgent);
    // access token (short-lived) — include sid optionally
    const clientAuthToken = generateToken(
      {
        uid: user._id.toString(),
        role: user.role || "client",
        name: user.name || "",
        company: user.company || "",
        sid,
      },
      "AUTH",
      { expiresIn: "1h" }
    );

    // refresh token payload includes sid + fingerprint hash
    const refreshToken = generateToken(
      {
        uid: user._id.toString(),
        role: user.role || "client",
        name: user.name || "",
        company: user.company || "",
        sid,
        fp: fingerprint,
        version: user.refreshVersion,
      },
      "REFRESH",
      { expiresIn: "7d" }
    );

    // store only hash of refresh token
    sessionDoc.refreshTokenHash = hashToken(refreshToken);
    await sessionDoc.save();

    const userId = user._id.toString();
    const res = Response.json(
      {
        message: "Login successful",
        token: clientAuthToken,
        user: {
          id: userId,
          name: user.name || null,
          email: user.email,
          role: user.role || "client",
        },
      },
      { status: 200 }
    );

    // set cookies
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
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    try {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
        (request as any).ip ||
        "unknown_ip";
      await safeIncr(`login_attempts:${ip}`);
      await safeExpire(`login_attempts:${ip}`, 60 * 5);
    } catch (e) {
      // ignore
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
