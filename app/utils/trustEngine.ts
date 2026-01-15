// app/utils/trustEngine.ts
import type { AuthTokenPayload } from "@/app/utils/token";
import TrustEvent from "@/app/models/TrustEvent";
import crypto from "crypto";
import { upsertDeviceForUser, devicesSnapshotForUser } from "@/app/services/deviceService";

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
    geoClose: 30,
    knownSid: 20,
    goodIpReputation: 20,
    timeMatch: 10,
    noRecentFailedLogins: 10,
    deviceFamiliarity: 10,
  },
  DECISIONS: { allow: 80, require2FA: 50, requireDeviceApproval: 30 },
  GEO_KM_SAFE: 300,
  REDIS_TTL_SECONDS: 60 * 5,
  PERSIST_EVENT_THRESHOLD: 10,
  RESET_AFTER_PERSIST: true,
  FP_CACHE_TTL_SECONDS: 15 * 60, // 15 minutes for per-sid fp cache
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

/**
 * evaluateTrust:
 * - decoded: token payload (we will NOT trust token.fp)
 * - sessionDoc: server-side session (may contain deviceId or stored fingerprint)
 * - userDoc: user doc from DB (may be null)
 * - currentFingerprint: fingerprint computed from the current request (client JS or headers) -- MUST be provided by caller
 * - ephemeral signals: ip, geo (lat/lon), ua, recentFailedLoginCount, ipReputationScore
 * - redisClient: optional redis client for fast aggregation (recommended)
 */
export async function evaluateTrust(options: {
  decoded: AuthTokenPayload | Record<string, any>;
  sessionDoc: any | null;
  userDoc: any | null;
  currentFingerprint?: string | null; // NEW: fingerprint from current request (not from token)
  ip?: string | null;
  geo?: { lat: number; lon: number } | null;
  ua?: string | null;
  now?: Date;
  recentFailedLoginCount?: number;
  ipReputationScore?: number | null;
  redisClient?: any; // ioredis or similar
}): Promise<TrustResult> {
  const {
    decoded,
    sessionDoc,
    userDoc,
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

    // NOTE: we ignore any fingerprint that might be embedded in the token.
    // Caller MUST provide currentFingerprint computed from the current request.
    const tokenSid = (decoded as any).sid ?? null;
    const uid = (decoded as any).uid ?? (decoded as any).sub ?? null;
    const hour = now.getHours();
    const device = deviceFromUA(ua);

    // compute hash of current fingerprint (if provided)
    const currentFpHash = currentFingerprint
      ? crypto.createHash("sha256").update(String(currentFingerprint)).digest("hex")
      : null;

    if ((decoded as any).fingerprint || (decoded as any).fp) {
      // token contained a fingerprint — ignore it and add a reason for visibility
      reasons.push("token_fp_ignored");
    }

    const redisKey = uid ? `trust:${String(uid)}` : null;
    let redisAgg: Record<string, any> | null = null;
    let eventCount = 0;
    let cachedSidFp: string | null = null;

    try {
      if (redisClient && redisKey) {
        // Use currentFpHash (not token fp) for Redis aggregation if available.
        const fpField = currentFpHash ? `fp:${currentFpHash}` : "fp:none";
        const ops: Promise<any>[] = [];

        ops.push(redisClient.hincrby(redisKey, "eventCount", 1));
        ops.push(redisClient.hincrby(redisKey, `dev:${device}`, 1));
        if (currentFpHash) ops.push(redisClient.hincrby(redisKey, fpField, 1));
        ops.push(redisClient.hincrby(redisKey, "sumLoginHour", hour));
        ops.push(redisClient.hincrby(redisKey, "loginCount", 1));
        if (ip) ops.push(redisClient.hset(redisKey, "lastIp", ip));
        if (tokenSid) ops.push(redisClient.hset(redisKey, "lastSid", tokenSid));
        if (ua) ops.push(redisClient.hset(redisKey, "lastUa", ua));
        if (geo) {
          ops.push(redisClient.hset(redisKey, "lastLat", `${geo.lat}`));
          ops.push(redisClient.hset(redisKey, "lastLon", `${geo.lon}`));
        }
        // keep the user aggregation short-lived
        ops.push(redisClient.expire(redisKey, CONFIG.REDIS_TTL_SECONDS));

        await Promise.all(ops);

        // also try to read a cached fp for this sid (fast path)
        if (tokenSid) {
          try {
            const val = await redisClient.get(`trust:fp:${tokenSid}`);
            if (val) cachedSidFp = String(val);
          } catch (e) {
            // ignore read error, we'll fall back to DB
            cachedSidFp = null;
          }
        }

        const [
          evCountStr,
          sumHourStr,
          loginCountStr,
          lastLat,
          lastLon,
          devMobile,
          devTablet,
          devDesktop,
          fpCountStr,
          lastSidVal,
        ] = await Promise.all([
          redisClient.hget(redisKey, "eventCount"),
          redisClient.hget(redisKey, "sumLoginHour"),
          redisClient.hget(redisKey, "loginCount"),
          redisClient.hget(redisKey, "lastLat"),
          redisClient.hget(redisKey, "lastLon"),
          redisClient.hget(redisKey, "dev:mobile"),
          redisClient.hget(redisKey, "dev:tablet"),
          redisClient.hget(redisKey, "dev:desktop"),
          currentFpHash ? redisClient.hget(redisKey, `fp:${currentFpHash}`) : Promise.resolve(null),
          redisClient.hget(redisKey, "lastSid"),
        ]);

        eventCount = evCountStr ? parseInt(evCountStr as string, 10) || 0 : 0;
        const sumHour = sumHourStr ? parseInt(sumHourStr as string, 10) || 0 : 0;
        const loginCount = loginCountStr ? parseInt(loginCountStr as string, 10) || 0 : 0;
        const avgLoginHour = loginCount > 0 ? Math.round(sumHour / loginCount) : null;

        redisAgg = {
          eventCount,
          avgLoginHour,
          lastLat: lastLat ?? null,
          lastLon: lastLon ?? null,
          devices: {
            mobile: devMobile ? parseInt(devMobile as any, 10) || 0 : 0,
            tablet: devTablet ? parseInt(devTablet as any, 10) || 0 : 0,
            desktop: devDesktop ? parseInt(devDesktop as any, 10) || 0 : 0,
          },
          fpCount: fpCountStr ? parseInt(fpCountStr as any, 10) || 0 : 0,
          lastSid: lastSidVal ?? null,
        };
      }
    } catch (redisErr) {
      console.log("Redis error in trust engine (falling back):", redisErr);
      redisAgg = null;
      cachedSidFp = null;
    }

    // --- Lookup Device doc properly (server-side) ---
    // Try to find the device via server-session linkage (preferred), then by current fingerprint hash
    let deviceDoc: any = null;
    try {
      // If sessionDoc stores a deviceId, prefer that lookup (server-side trusted)
      if (sessionDoc && sessionDoc.deviceId) {
        // up to your Device model to index by deviceId
        const DeviceModel = (await import("@/app/models/Device")).default;
        deviceDoc = await DeviceModel.findOne({ userId: uid, deviceId: sessionDoc.deviceId }).exec();
      }

      // If not found and current fingerprint hash exists, try fingerprint lookup (persistent device)
      if (!deviceDoc && currentFpHash) {
        const DeviceModel = (await import("@/app/models/Device")).default;
        deviceDoc = await DeviceModel.findOne({ userId: uid, fingerprintHash: currentFpHash }).exec();
      }

      // If still not found, and sessionDoc has a server-side stored fingerprint (not token), try that
      if (!deviceDoc && sessionDoc && sessionDoc.fingerprint) {
        const DeviceModel = (await import("@/app/models/Device")).default;
        const sFpHash = crypto.createHash("sha256").update(String(sessionDoc.fingerprint)).digest("hex");
        deviceDoc = await DeviceModel.findOne({ userId: uid, fingerprintHash: sFpHash }).exec();
      }

      // If still not found, we will rely on upsertDeviceForUser to create a persistent device record (below)
    } catch (devLookupErr) {
      console.log("Device lookup error:", devLookupErr);
      deviceDoc = null;
    }

    // --- Update/create Device doc (persistent) ---
    try {
      // We pass the currentFingerprint (not token fp) to upsert. upsertDeviceForUser will
      // create a Device doc if none found. We pass redisAgg so it can optimize writes.
      const persisted = await upsertDeviceForUser({
        userId: uid,
        fingerprint: currentFingerprint ?? null,
        ua,
        deviceType: device,
        ip,
        now,
        redisAgg,
        shouldPersistToDb: !!redisAgg && eventCount >= CONFIG.PERSIST_EVENT_THRESHOLD,
      });
      // If upsert created/returned a device doc and we didn't have one earlier, use it
      if (!deviceDoc && persisted) deviceDoc = persisted;
    } catch (devErr) {
      console.log("Device upsert error:", devErr);
    }

    // --- scoring logic (use DB/cached fp, NOT token fp) ---
    // fingerprintMatch: true only if deviceDoc.fingerprintHash === currentFpHash OR cachedSidFp matches
    let fingerprintMatched = false;
    if (deviceDoc && currentFpHash && deviceDoc.fingerprintHash === currentFpHash) {
      fingerprintMatched = true;
      reasons.push("fingerprint_match");
      score += CONFIG.POINTS.fingerprintMatch;
    } else if (cachedSidFp && currentFpHash && cachedSidFp === currentFpHash) {
      // fast path: cached per-sid fp match
      fingerprintMatched = true;
      reasons.push("fingerprint_match_cached");
      score += CONFIG.POINTS.fingerprintMatch;
    } else {
      reasons.push("no_fp_match");
    }

    // known session id
    const sidMatch =
      (!!sessionDoc && tokenSid && sessionDoc.sid === tokenSid) ||
      (redisAgg && (redisAgg as any).lastSid && tokenSid && (redisAgg as any).lastSid === tokenSid);

    if (sidMatch) {
      score += CONFIG.POINTS.knownSid;
      reasons.push("known_sid");
    } else {
      reasons.push("unknown_sid");
    }

    // geo check (same as before)
    try {
      let lastLat: number | null = null;
      let lastLon: number | null = null;
      if (redisAgg && redisAgg.lastLat && redisAgg.lastLon) {
        lastLat = Number(redisAgg.lastLat);
        lastLon = Number(redisAgg.lastLon);
      } else if (userDoc && Array.isArray(userDoc.lastLogin) && userDoc.lastLogin.length > 0) {
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
          reasons.push(`geo_close_${Math.round(dist)}km`);
        } else {
          reasons.push(`geo_jump_${Math.round(dist)}km`);
        }
      } else {
        reasons.push("no_geo_info");
      }
    } catch (e) {
      reasons.push("geo_calc_error");
    }

    // ip reputation
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

    // time-of-day similarity
    try {
      let avgHour: number | null = null;
      if (redisAgg && redisAgg.avgLoginHour !== null) avgHour = redisAgg.avgLoginHour as number;
      else if (userDoc && typeof userDoc.avgLoginHour === "number") avgHour = Math.round(userDoc.avgLoginHour);

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

    // recent failed logins
    if (recentFailedLoginCount <= 1) {
      score += CONFIG.POINTS.noRecentFailedLogins;
      reasons.push("no_recent_failed_logins");
    } else {
      reasons.push(`recent_failed_${recentFailedLoginCount}`);
    }

    // device familiarity (combine redisAgg, userDoc.devices, deviceDoc.seenCount)
    try {
      let deviceSeen = false;
      if (redisAgg) {
        const devCounts = redisAgg.devices;
        if (devCounts && devCounts[device] && Number(devCounts[device]) > 1) deviceSeen = true;
      } else if (userDoc && userDoc.devices && typeof userDoc.devices[device] === "number" && userDoc.devices[device] > 1) {
        deviceSeen = true;
      }
      if (deviceDoc && (deviceDoc.seenCount || 0) > 1) deviceSeen = true;

      if (deviceSeen) {
        score += CONFIG.POINTS.deviceFamiliarity;
        reasons.push(`device_familiar_${device}`);
      } else {
        reasons.push(`device_new_${device}`);
      }
    } catch (e) {
      reasons.push("device_check_error");
    }

    score = clamp(score);

    let action: TrustAction = "reject";
    if (score >= CONFIG.DECISIONS.allow) action = "allow";
    else if (score >= CONFIG.DECISIONS.require2FA) action = "require2FA";
    else if (score >= CONFIG.DECISIONS.requireDeviceApproval) action = "requireDeviceApproval";
    else action = "reject";

    // Device policy overrides (blocked/revoked)
    try {
      if (deviceDoc) {
        if (deviceDoc.blocked) {
          action = "reject";
          reasons.push("device_blocked");
        } else if (deviceDoc.revoked) {
          if (action === "allow") action = "requireDeviceApproval";
          reasons.push("device_revoked");
        }
      }
    } catch (e) {
      console.log("device policy check failed:", e);
    }

    // Cache the current fingerprint hash in Redis per-SID for a fast future check
    try {
      if (redisClient && tokenSid && currentFpHash) {
        // store simple string key per sid (expires after FP_CACHE_TTL_SECONDS)
        await redisClient.set(`trust:fp:${tokenSid}`, currentFpHash, "EX", CONFIG.FP_CACHE_TTL_SECONDS);
      }
    } catch (e) {
      // caching failure shouldn't block evaluation
      console.log("Failed to cache fp in redis:", e);
    }

    // --- Persistence / DB summary write ---
    if (redisAgg && eventCount >= CONFIG.PERSIST_EVENT_THRESHOLD) {
      try {
        const devicesSnapshot = await devicesSnapshotForUser(uid);
        await TrustEvent.create({
          userId: uid,
          sid: tokenSid ?? null,
          ip,
          ua,
          score,
          reasons,
          createdAt: new Date(),
        });

        if (CONFIG.RESET_AFTER_PERSIST && redisClient && redisKey) {
          try {
            await Promise.all([
              redisClient.hset(redisKey, "eventCount", 0),
              redisClient.hset(redisKey, "sumLoginHour", 0),
              redisClient.hset(redisKey, "loginCount", 0),
            ]);
          } catch (e) {
            console.log("Redis reset after persist failed:", e);
          }
        }
      } catch (dbErr) {
        console.log("Failed to persist summarized TrustEvent:", dbErr);
      }
    } else if (!redisAgg) {
      try {
        await TrustEvent.create({
          userId: uid,
          sid: tokenSid ?? null,
          ip,
          ua,
          score,
          reasons,
          createdAt: new Date(),
        });
      } catch (e) {
        console.log("Fallback TrustEvent logging failed:", e);
      }
    }

    return { score, action, reasons };
  } catch (err) {
    console.log("Unexpected error in trust engine:", err);
    return { score: 0, action: "reject", reasons: ["trust_engine_error"] };
  }
}
