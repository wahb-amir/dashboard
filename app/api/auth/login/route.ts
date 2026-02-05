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
import { evaluateTrust } from "@/app/utils/trustEngine";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

// Safe redis helpers (no-op when redis missing)
const safeGet = (key: string): Promise<string | null> =>
  redis && typeof redis.get === "function"
    ? (redis.get(key) as Promise<string | null>)
    : Promise.resolve(null);

const safeSet = (key: string, val: string, exSeconds?: number): Promise<any> =>
  redis && typeof redis.set === "function"
    ? (exSeconds ? (redis.set(key, val, "EX", exSeconds) as Promise<any>) : (redis.set(key, val) as Promise<any>))
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

// constants (match your trust engine TTL)
const SESSION_CACHE_TTL = 15 * 60; // 15 minutes
const FP_CACHE_TTL = 15 * 60; // 15 minutes

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

    const decodedApp = verifyToken(token, "APP") as DecodedToken | null;
    if (!decodedApp) {
      await Promise.all([safeIncr(key), safeExpire(key, BLOCK_TIME)]);
      return Response.json({ error: "Invalid token" }, { status: 401 });
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

    // compute fingerprint
    const userAgent =
      request.headers.get("user-agent")?.slice(0, 1024) || "unknown_ua";
    const fingerprint = makeFingerprint(userAgent, ip);

    // hot-path: try redis mapping fingerprint -> sessionId to avoid DB scan
    const userFpKey = `trust:user:${user._id.toString()}:fp:${fingerprint}`;
    let sessionIdFromCache: string | null = null;
    try {
      if (redis) {
        sessionIdFromCache = await redis.get(userFpKey);
      }
    } catch (e) {
      sessionIdFromCache = null;
    }

    // attempt to resolve session
    let sessionDoc: any = null;
    if (sessionIdFromCache) {
      try {
        // try to read session snapshot from cache
        const sessionCacheKey = `trust:session:${sessionIdFromCache}`;
        let cachedRaw = null;
        if (redis) {
          cachedRaw = await redis.get(sessionCacheKey);
        }
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            sessionDoc = parsed.session ?? null;
            // make sure session belongs to this user
            if (sessionDoc && String(sessionDoc.userId) !== String(user._id)) {
              sessionDoc = null;
            }
          } catch (err) {
            sessionDoc = null;
          }
        }

        // if cache didn't have it, fallback to DB read by id
        if (!sessionDoc) {
          sessionDoc = await Session.findById(sessionIdFromCache).exec();
          // verify session belongs to this user (safety)
          if (sessionDoc && String(sessionDoc.userId) !== String(user._id)) {
            sessionDoc = null;
          }
        }
      } catch (e) {
        // ignore and fallback to DB query by fingerprint
        sessionDoc = null;
      }
    }

    // if not resolved via fingerprint mapping, search DB for matching session (userId + fingerprint)
    if (!sessionDoc) {
      try {
        sessionDoc = await Session.findOne({
          userId: user._id,
          fingerprint,
          revoked: false,
          blocked: false,
          expiresAt: { $gt: new Date() },
        }).exec();
      } catch (e) {
        sessionDoc = null;
      }
    }

    // If still not found -> new device -> require 2FA (do NOT create session yet)
    if (!sessionDoc) {
      const res = Response.json(
        { ok: false, message: "2FA required for new device", require2FA: true },
        { status: 403 }
      );
      const DEVICE_VERIFICATION_PAYLOAD ={
        uid: user._id.toString(),
        purpose: "DEVICE_VERIFICATION",
        fingerprint,
        ip,
        ua: userAgent,
        jti: uuidv4(),
        email:user.email,
        name:user.name,
      };
      const deviceVerificationToken = generateToken(
        DEVICE_VERIFICATION_PAYLOAD,
        "DEVICE_VERIFICATION",
        { expiresIn: "1h" }
      );
      // set device verification token cookie
        res.cookies.set({
          name: "deviceVerificationToken",
          value: deviceVerificationToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });
      return res;
    }

    // at this point a session is found. If it's a plain JSON snapshot from redis, it may not be a mongoose doc.
    // For saving later (refresh token hash), we need mongoose doc. If sessionDoc is a plain object, load mongoose doc.
    let sessionIsPlain = !(sessionDoc && typeof sessionDoc.save === "function");
    let sessionMDoc: any = sessionIsPlain ? null : sessionDoc;
    if (sessionIsPlain) {
      try {
        sessionMDoc = await Session.findById(sessionDoc._id).exec();
      } catch (e) {
        sessionMDoc = null;
      }
    } else {
      sessionMDoc = sessionDoc;
    }

    // Immediately check revoked/blocked flags regardless of trust score
    const isRevoked = sessionDoc.revoked || (sessionMDoc && sessionMDoc.revoked);
    const isBlocked = sessionDoc.blocked || (sessionMDoc && sessionMDoc.blocked);
    if (isRevoked) {
      // clear cookies on client by responding clear instruction
      return Response.json({ ok: false, message: "Session revoked", clearCookies: true }, { status: 401 });
    }
    if (isBlocked) {
      return Response.json({ ok: false, message: "Device blocked", clearCookies: true }, { status: 401 });
    }

    // Build a minimal decoded payload for evaluateTrust — include sessionId so trust engine can use hot path
    const decodedForTrust: any = {
      uid: user._id.toString(),
      sessionId: sessionMDoc ? sessionMDoc._id.toString() : sessionDoc._id?.toString?.() ?? null,
    };

    // call evaluateTrust with the session info
    const trustResult = await evaluateTrust({
      decoded: decodedForTrust,
      userDoc: user.toObject ? user.toObject() : user,
      currentFingerprint: fingerprint,
      ip,
      ua: userAgent,
      now: new Date(),
      recentFailedLoginCount: 0, // you can compute and pass real failed count if you track it
      ipReputationScore: null,
      redisClient: redis,
    });

    // Act on trust result
    if (trustResult.action === "reject") {
      return Response.json({ ok: false, message: "Access denied", reasons: trustResult.reasons }, { status: 401 });
    }
    if (trustResult.action === "requireDeviceApproval") {
      // session exists but needs admin/device approval
      return Response.json({ ok: false, message: "Device approval required", reasons: trustResult.reasons }, { status: 403 });
    }
    if (trustResult.action === "require2FA") {
      // require 2FA for this session before issuing tokens
      const res = Response.json({ ok: false, message: "2FA required", require2FA: true, reasons: trustResult.reasons }, { status: 403 });
      const DEVICE_VERIFICATION_PAYLOAD ={
        uid: user._id.toString(),
        purpose: "DEVICE_VERIFICATION",
        fingerprint,
        ip,
        ua: userAgent,
        jti: uuidv4(),
      };
      const deviceVerificationToken = generateToken(
        DEVICE_VERIFICATION_PAYLOAD,
        "DEVICE_VERIFICATION",
        { expiresIn: "1h" }
      );
      // set device verification token cookie
        res.cookies.set({
          name: "deviceVerificationToken",
          value: deviceVerificationToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });
      return res;
    }

    // allow -> issue tokens. Ensure sessionMDoc exists to save refreshTokenHash.
    if (!sessionMDoc) {
      // rare: we couldn't load mongoose doc, try fetching again
      sessionMDoc = await Session.findById(sessionDoc._id).exec();
      if (!sessionMDoc) {
        // fallback — treat as require device approval
        return Response.json({ ok: false, message: "Session load failed", status: 500 }, { status: 500 });
      }
    }

    // update lastUsedAt
    sessionMDoc.lastUsedAt = new Date();

    // generate tokens (include sessionId)
    const sessionId = sessionMDoc._id.toString();
    const sidCompat = sessionMDoc.sid;
    const clientAuthToken = generateToken(
      {
        uid: user._id.toString(),
        role: user.role || "client",
        name: user.name || "",
        company: user.company || "",
        sessionId,
        sid: sidCompat,
      },
      "AUTH",
      { expiresIn: "1h" }
    );

    const refreshTokenPayload = {
      uid: user._id.toString(),
      role: user.role || "client",
      sessionId,
      sid: sidCompat,
      version: user.refreshVersion,
    };

    const refreshToken = generateToken(refreshTokenPayload, "REFRESH", {
      expiresIn: "7d",
    });

    // store only hash of refresh token
    sessionMDoc.refreshTokenHash = hashToken(refreshToken);
    await sessionMDoc.save();

    // record successful login (history)
    try {
      await recordSuccessfulLogin(user._id.toString(), sidCompat, fingerprint, ip, userAgent);
    } catch (e) {
      // nonfatal
      console.log("recordSuccessfulLogin error:", e);
    }

    // cache fingerprint -> sessionId mapping & session snapshot for hot-path future requests
    try {
      if (redis) {
        await Promise.all([
          safeSet(userFpKey, sessionId, SESSION_CACHE_TTL),
          safeSet(`trust:session:${sessionId}`, JSON.stringify({ session: {
            _id: sessionMDoc._id,
            sid: sessionMDoc.sid,
            userId: sessionMDoc.userId,
            fingerprint: sessionMDoc.fingerprint ?? null,
            fingerprintHash: sessionMDoc.fingerprint ? crypto.createHash("sha256").update(String(sessionMDoc.fingerprint)).digest("hex") : null,
            revoked: !!sessionMDoc.revoked,
            blocked: !!sessionMDoc.blocked,
            lastUsedAt: sessionMDoc.lastUsedAt ?? null,
            createdAt: sessionMDoc.createdAt ?? null,
          }}), SESSION_CACHE_TTL),
          // also per-session fp cache
          currentFpHash(sessionMDoc.fingerprint ?? fingerprint) // helper below to compute fp-hash to set
        ]);
      }
    } catch (e) {
      // ignore cache failures
      console.log("Failed to write login caches:", e);
    }

    // helper to compute fp cache write (as part of Promise.all above)
    function currentFpHash(f: string | null) {
      try {
        const fp = f ?? fingerprint;
        if (!fp) return Promise.resolve(null);
        const h = crypto.createHash("sha256").update(String(fp)).digest("hex");
        if (!redis) return Promise.resolve(null);
        return redis.set(`trust:fp:${sessionId}`, h, "EX", FP_CACHE_TTL);
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    // prepare response with cookies
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
