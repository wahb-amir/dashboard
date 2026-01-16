// app/utils/trustEngine.ts
import type { AuthTokenPayload } from "@/app/utils/token";
import crypto from "crypto";
import mongoose from "mongoose";
import SessionModel from "@/app/models/Session";

export type TrustAction = "allow" | "require2FA" | "requireDeviceApproval" | "reject";
export interface TrustResult {
  score: number;
  action: TrustAction;
  reasons: string[];
}

const CONFIG = {
  START_SCORE: 0,
  POINTS: {
    fingerprintMatch: 40,
    fingerprintMatchPartial: Math.round(40 * 0.6),
    geoClose: 30,
    knownSid: 20,
    goodIpReputation: 20,
    timeMatch: 10,
    noRecentFailedLogins: 10,
    sessionFamiliarity: 10,
  },
  DECISIONS: { allow: 80, require2FA: 50, requireDeviceApproval: 30 },
  GEO_KM_SAFE: 300,
  SESSION_CACHE_TTL_SECONDS: 15 * 60, // 15 minutes
  FP_CACHE_TTL_SECONDS: 15 * 60, // 15 minutes per-session fp cache
  FP_SIMILARITY_FULL: 0.9,
  FP_SIMILARITY_PARTIAL: 0.7,
};

function clamp(n: number) {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function deviceFromUA(ua: string | null): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  const u = ua.toLowerCase();
  if (/mobile|iphone|android.*mobile|android.*;.*mobile/.test(u)) return "mobile";
  if (/tablet|ipad|nexus 7|nexus 9|kindle|silk/.test(u)) return "tablet";
  if (/windows|macintosh|linux|x11/.test(u)) return "desktop";
  return "unknown";
}

// simple hex-similarity: fraction of equal characters
function hexSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a.length !== b.length) {
    const min = Math.min(a.length, b.length);
    let same = 0;
    for (let i = 0; i < min; i++) if (a[i] === b[i]) same++;
    return same / Math.max(a.length, b.length);
  }
  let same = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
  return same / a.length;
}

/**
 * Read-only trust engine using only Session model + Redis caching for session snapshot.
 *
 * options.decoded: token payload (must include sessionId or sid)
 * options.currentFingerprint: fingerprint string computed on client (required to use fp checks)
 * options.redisClient: optional ioredis client (used to cache session snapshot & fp)
 *
 * Returns { score, action, reasons } — no DB writes except Redis caching.
 */
export async function evaluateTrust(options: {
  decoded: AuthTokenPayload | Record<string, any>;
  userDoc?: any | null; // optional, for geo/time history
  currentFingerprint?: string | null;
  ip?: string | null;
  geo?: { lat: number; lon: number } | null;
  ua?: string | null;
  now?: Date;
  recentFailedLoginCount?: number;
  ipReputationScore?: number | null;
  redisClient?: any; // ioredis - optional, used for caching only
}): Promise<TrustResult> {
  const {
    decoded,
    userDoc = null,
    currentFingerprint = null,
    ip = null,
    geo = null,
    ua = null,
    now = new Date(),
    recentFailedLoginCount = 0,
    ipReputationScore = null,
    redisClient = null,
  } = options;

  try {
    let score = CONFIG.START_SCORE;
    const reasons: string[] = [];

    // prefer ObjectId sessionId in token; fallback to sid string
    const tokenSessionId = (decoded as any).sessionId ?? (decoded as any).sid ?? null;
    const uid = (decoded as any).uid ?? (decoded as any).sub ?? null;
    const hour = now.getHours();
    const sessionDeviceType = deviceFromUA(ua);

    // compute current fingerprint hash (sha256) if provided
    const currentFpHash = currentFingerprint
      ? crypto.createHash("sha256").update(String(currentFingerprint)).digest("hex")
      : null;

    // never trust fingerprint in token
    if ((decoded as any).fingerprint || (decoded as any).fp) reasons.push("token_fp_ignored");

    // ===== read cache: trust:session:{sessionId} =====
    let sessionCached: any = null;
    const sessionCacheKey = tokenSessionId ? `trust:session:${String(tokenSessionId)}` : null;
    if (redisClient && sessionCacheKey) {
      try {
        const raw = await redisClient.get(sessionCacheKey);
        if (raw) {
          try {
            sessionCached = JSON.parse(raw);
          } catch (err) {
            sessionCached = null;
          }
        }
      } catch (e) {
        sessionCached = null;
      }
    }

    // ===== fetch session from DB if cache miss (read-only) =====
    let sessionDoc: any = sessionCached?.session ?? null;
    if (!sessionDoc) {
      if (!tokenSessionId) {
        reasons.push("no_session_token");
        return { score: 0, action: "requireDeviceApproval", reasons };
      }

      // validate object id before DB search (fast fail)
      try {
        if (mongoose.Types.ObjectId.isValid(String(tokenSessionId))) {
          sessionDoc = await SessionModel.findById(String(tokenSessionId)).lean().exec();
        } else {
          // fallback: treat as sid string
          sessionDoc = await SessionModel.findOne({ sid: String(tokenSessionId) }).lean().exec();
        }
      } catch (e) {
        sessionDoc = null;
      }

      // cache fetched session (lightweight snapshot) if redis available
      if (sessionDoc && redisClient && sessionCacheKey) {
        try {
          const sessionSnapshot: any = {
            _id: sessionDoc._id,
            sid: sessionDoc.sid,
            userId: sessionDoc.userId,
            fingerprint: sessionDoc.fingerprint ?? null,
            fingerprintHash: sessionDoc.fingerprint ? crypto.createHash("sha256").update(String(sessionDoc.fingerprint)).digest("hex") : null,
            revoked: !!sessionDoc.revoked,
            blocked: !!sessionDoc.blocked,
            lastUsedAt: sessionDoc.lastUsedAt ?? null,
            createdAt: sessionDoc.createdAt ?? null,
          };
          await redisClient.set(sessionCacheKey, JSON.stringify({ session: sessionSnapshot }), "EX", CONFIG.SESSION_CACHE_TTL_SECONDS);
          // optionally store per-session fp cache if session has fp
          if (sessionSnapshot.fingerprintHash) {
            await redisClient.set(`trust:fp:${String(tokenSessionId)}`, sessionSnapshot.fingerprintHash, "EX", CONFIG.FP_CACHE_TTL_SECONDS);
          }
          // reuse sessionDoc as snapshot (so later logic reads same shape)
          sessionDoc = sessionSnapshot;
        } catch (e) {
          // caching failure non-fatal
        }
      }
    }

    // if still no session -> require admin/device approval
    if (!sessionDoc) {
      reasons.push("no_session");
      return { score: 0, action: "requireDeviceApproval", reasons };
    }

    // revoked or blocked session -> immediate reject (clear cookies)
    if (sessionDoc.revoked) {
      reasons.push("session_revoked");
      return { score: 0, action: "reject", reasons };
    }
    if (sessionDoc.blocked) {
      reasons.push("session_blocked");
      return { score: 0, action: "reject", reasons };
    }

    // ===== trusted fingerprint source (session.fingerprintHash or cached trust:fp) =====
    let trustedFpHash: string | null = null;

    if (sessionDoc.fingerprintHash) {
      trustedFpHash = sessionDoc.fingerprintHash;
    } else if (sessionDoc.fingerprint) {
      // if snapshot had raw fingerprint, hash it
      trustedFpHash = crypto.createHash("sha256").update(String(sessionDoc.fingerprint)).digest("hex");
    } else if (redisClient && tokenSessionId) {
      try {
        const sidFp = await redisClient.get(`trust:fp:${String(tokenSessionId)}`);
        if (sidFp) trustedFpHash = String(sidFp);
      } catch (e) {
        trustedFpHash = null;
      }
    } else {
      trustedFpHash = null;
    }

    // ===== fuzzy fingerprint comparison (server-side trusted vs current request) =====
    if (currentFpHash && trustedFpHash) {
      const sim = hexSimilarity(trustedFpHash, currentFpHash);
      if (sim >= CONFIG.FP_SIMILARITY_FULL) {
        score += CONFIG.POINTS.fingerprintMatch;
        reasons.push("fingerprint_match");
      } else if (sim >= CONFIG.FP_SIMILARITY_PARTIAL) {
        score += CONFIG.POINTS.fingerprintMatchPartial;
        reasons.push("fingerprint_match_partial");
      } else {
        reasons.push("no_fp_match");
      }
    } else if (currentFpHash && !trustedFpHash) {
      reasons.push("no_fp_stored");
    } else {
      reasons.push("currentFp_missing");
    }

    // ===== known session id reward (sessionDoc._id or sid authoritative) =====
    const sidMatch =
      String(sessionDoc._id) === String(tokenSessionId) || String(sessionDoc.sid) === String(tokenSessionId);
    if (sidMatch) {
      score += CONFIG.POINTS.knownSid;
      reasons.push("known_sid");
    } else {
      reasons.push("unknown_sid");
    }

    // ===== geo check (use userDoc.lastLogin as fallback for user's last geo) =====
    try {
      let lastLat: number | null = null;
      let lastLon: number | null = null;
      if (userDoc && Array.isArray(userDoc.lastLogin) && userDoc.lastLogin.length > 0) {
        const last = userDoc.lastLogin[userDoc.lastLogin.length - 1];
        if (typeof last.lat === "number" && typeof last.lon === "number") {
          lastLat = last.lat;
          lastLon = last.lon;
        }
      }

      if (geo && lastLat !== null && lastLon !== null) {
        const dist = haversineKm([lastLat, lastLon], [geo.lat, geo.lon]);
        if (dist <= CONFIG.GEO_KM_SAFE) {
          score += CONFIG.POINTS.geoClose;
          reasons.push("geo_close");
        } else {
          reasons.push(`geo_jump_${Math.round(dist)}km`);
        }
      } else {
        reasons.push("no_geo_info");
      }
    } catch (e) {
      reasons.push("geo_calc_error");
    }

    // ===== ip reputation =====
    if (typeof ipReputationScore === "number") {
      if (ipReputationScore >= 60) {
        score += CONFIG.POINTS.goodIpReputation;
        reasons.push("good_ip_reputation");
      } else {
        reasons.push("bad_ip_reputation");
      }
    } else {
      reasons.push("no_ip_reputation");
    }

    // ===== time-of-day similarity (use userDoc.avgLoginHour if available) =====
    try {
      let avgHour: number | null = null;
      if (userDoc && typeof userDoc.avgLoginHour === "number") avgHour = Math.round(userDoc.avgLoginHour);

      if (avgHour !== null) {
        const diff = Math.abs(hour - avgHour);
        if (diff <= 3) {
          score += CONFIG.POINTS.timeMatch;
          reasons.push("time_match");
        } else {
          reasons.push(`time_mismatch_now_${hour}_avg_${avgHour}`);
        }
      } else {
        reasons.push("no_avg_hour");
      }
    } catch (e) {
      reasons.push("time_check_error");
    }

    // ===== recent failed logins =====
    if (recentFailedLoginCount <= 1) {
      score += CONFIG.POINTS.noRecentFailedLogins;
      reasons.push("no_recent_failed_logins");
    } else {
      reasons.push(`recent_failed_${recentFailedLoginCount}`);
    }

    // ===== session familiarity (did we see this session before?) =====
    try {
      if (sessionDoc.lastUsedAt) {
        score += CONFIG.POINTS.sessionFamiliarity;
        reasons.push("session_familiar");
      } else {
        reasons.push("session_new");
      }
    } catch (e) {
      reasons.push("session_check_error");
    }

    score = clamp(score);

    // decide action
    let action: TrustAction = "reject";
    if (score >= CONFIG.DECISIONS.allow) action = "allow";
    else if (score >= CONFIG.DECISIONS.require2FA) action = "require2FA";
    else if (score >= CONFIG.DECISIONS.requireDeviceApproval) action = "requireDeviceApproval";
    else action = "reject";

    // ===== final overrides: revoked/blocked check already done above for session; repeat safety check from cache if present =====
    if (sessionDoc && sessionDoc.revoked) {
      action = "reject";
      if (!reasons.includes("session_revoked")) reasons.push("session_revoked");
    }
    if (sessionDoc && sessionDoc.blocked) {
      action = "reject";
      if (!reasons.includes("session_blocked")) reasons.push("session_blocked");
    }

    // ===== cache per-session fp (for faster future checks) =====
    if (redisClient && tokenSessionId && currentFpHash) {
      try {
        await redisClient.set(`trust:fp:${String(tokenSessionId)}`, currentFpHash, "EX", CONFIG.FP_CACHE_TTL_SECONDS);
      } catch (e) {
        // ignore cache write failure
      }
    }

    // ===== also refresh session cache TTL if it exists (best-effort) =====
    if (redisClient && sessionCacheKey) {
      try {
        // if we cached earlier, re-set TTL by rewriting current snapshot (best-effort)
        const curSnapshot = {
          session: {
            _id: sessionDoc._id,
            sid: sessionDoc.sid,
            userId: sessionDoc.userId,
            fingerprint: sessionDoc.fingerprint ?? null,
            fingerprintHash: trustedFpHash ?? null,
            revoked: !!sessionDoc.revoked,
            blocked: !!sessionDoc.blocked,
            lastUsedAt: sessionDoc.lastUsedAt ?? null,
            createdAt: sessionDoc.createdAt ?? null,
          },
        };
        await redisClient.set(sessionCacheKey, JSON.stringify(curSnapshot), "EX", CONFIG.SESSION_CACHE_TTL_SECONDS);
      } catch (e) {
        // ignore
      }
    }

    return { score, action, reasons };
  } catch (err) {
    console.log("Unexpected error in trust engine (session-only):", err);
    return { score: 0, action: "reject", reasons: ["trust_engine_error"] };
  }
}
