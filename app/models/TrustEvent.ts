// // app/utils/trustEngine.ts
// import type { AuthTokenPayload } from "@/app/utils/token";
// import crypto from "crypto";
// import mongoose from "mongoose";
// import SessionModel from "@/app/models/Session";
// import DeviceModel from "@/app/models/Device";

// export type TrustAction = "allow" | "require2FA" | "requireDeviceApproval" | "reject";
// export interface TrustResult {
//   score: number;
//   action: TrustAction;
//   reasons: string[];
// }

// const CONFIG = {
//   START_SCORE: 0,
//   POINTS: {
//     fingerprintMatch: 40,
//     fingerprintMatchPartial: Math.round(40 * 0.6),
//     geoClose: 30,
//     knownSid: 20,
//     goodIpReputation: 20,
//     timeMatch: 10,
//     noRecentFailedLogins: 10,
//     deviceFamiliarity: 10,
//   },
//   DECISIONS: { allow: 80, require2FA: 50, requireDeviceApproval: 30 },
//   GEO_KM_SAFE: 300,
//   FP_CACHE_TTL_SECONDS: 15 * 60, // 15 minutes
//   SESSION_CACHE_TTL_SECONDS: 15 * 60, // 15 minutes
//   FP_SIMILARITY_FULL: 0.9,
//   FP_SIMILARITY_PARTIAL: 0.7,
//   REDIS_TTL_SECONDS: 60 * 5, // for user aggregation (if used)
// };

// function clamp(n: number) {
//   if (n < 0) return 0;
//   if (n > 100) return 100;
//   return Math.round(n);
// }

// function deviceFromUA(ua: string | null): "mobile" | "tablet" | "desktop" | "unknown" {
//   if (!ua) return "unknown";
//   const u = ua.toLowerCase();
//   if (/mobile|iphone|android.*mobile|android.*;.*mobile/.test(u)) return "mobile";
//   if (/tablet|ipad|nexus 7|nexus 9|kindle|silk/.test(u)) return "tablet";
//   if (/windows|macintosh|linux|x11/.test(u)) return "desktop";
//   return "unknown";
// }

// // simple hex-similarity
// function hexSimilarity(a: string, b: string) {
//   if (!a || !b) return 0;
//   if (a.length !== b.length) {
//     const min = Math.min(a.length, b.length);
//     let same = 0;
//     for (let i = 0; i < min; i++) if (a[i] === b[i]) same++;
//     return same / Math.max(a.length, b.length);
//   }
//   let same = 0;
//   for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
//   return same / a.length;
// }

// /**
//  * evaluateTrust - now with session+device caching in Redis (writes allowed only for caching).
//  *
//  * Notes:
//  * - This function WILL write small cache entries to Redis:
//  *    - trust:session:{sessionId} -> JSON { sessionDocFields..., deviceDocFields... } (EX SESSION_CACHE_TTL_SECONDS)
//  *    - trust:fp:{sessionId} -> currentFpHash (EX FP_CACHE_TTL_SECONDS)
//  *
//  * - It will NOT write to MongoDB.
//  * - Caller must pass redisClient (ioredis) to enable caching and user-aggregation.
//  */
// export async function evaluateTrust(options: {
//   decoded: AuthTokenPayload | Record<string, any>;
//   sessionDoc?: any | null; // optional already-fetched session
//   userDoc?: any | null;
//   currentFingerprint?: string | null;
//   ip?: string | null;
//   geo?: { lat: number; lon: number } | null;
//   ua?: string | null;
//   now?: Date;
//   recentFailedLoginCount?: number;
//   ipReputationScore?: number | null;
//   redisClient?: any; // ioredis - used for caching and user-level aggregation
// }): Promise<TrustResult> {
//   const {
//     decoded,
//     sessionDoc: sessionDocArg = null,
//     userDoc = null,
//     currentFingerprint = null,
//     ip = null,
//     geo = null,
//     ua = null,
//     now = new Date(),
//     recentFailedLoginCount = 0,
//     ipReputationScore = null,
//     redisClient = null,
//   } = options;

//   try {
//     let score = CONFIG.START_SCORE;
//     const reasons: string[] = [];

//     const tokenSessionId = (decoded as any).sessionId ?? (decoded as any).sid ?? null;
//     const uid = (decoded as any).uid ?? (decoded as any).sub ?? null;
//     const hour = now.getHours();
//     const deviceType = deviceFromUA(ua);

//     // compute current fingerprint hash
//     const currentFpHash = currentFingerprint
//       ? crypto.createHash("sha256").update(String(currentFingerprint)).digest("hex")
//       : null;

//     if ((decoded as any).fingerprint || (decoded as any).fp) reasons.push("token_fp_ignored");

//     // ---------- user-level Redis aggregation (write allowed) ----------
//     // this is optional — if redisClient provided, we increment per-user counters (fast)
//     let redisAgg: Record<string, any> | null = null;
//     try {
//       if (redisClient && uid) {
//         const redisKey = `trust:${String(uid)}`;
//         const ops: Promise<any>[] = [];
//         // increment event count + device type counter + sumLoginHour/loginCount
//         ops.push(redisClient.hincrby(redisKey, "eventCount", 1));
//         ops.push(redisClient.hincrby(redisKey, `dev:${deviceType}`, 1));
//         if (currentFpHash) ops.push(redisClient.hincrby(redisKey, `fp:${currentFpHash}`, 1));
//         ops.push(redisClient.hincrby(redisKey, "sumLoginHour", hour));
//         ops.push(redisClient.hincrby(redisKey, "loginCount", 1));
//         if (ip) ops.push(redisClient.hset(redisKey, "lastIp", ip));
//         if (tokenSessionId) ops.push(redisClient.hset(redisKey, "lastSession", String(tokenSessionId)));
//         if (ua) ops.push(redisClient.hset(redisKey, "lastUa", ua));
//         if (geo) {
//           ops.push(redisClient.hset(redisKey, "lastLat", `${geo.lat}`));
//           ops.push(redisClient.hset(redisKey, "lastLon", `${geo.lon}`));
//         }
//         ops.push(redisClient.expire(redisKey, CONFIG.REDIS_TTL_SECONDS));

//         // run async (we'll await so failures are visible)
//         await Promise.all(ops);

//         // read back a few fields (read-only) for scoring
//         const [
//           evCountStr,
//           sumHourStr,
//           loginCountStr,
//           lastLat,
//           lastLon,
//           devMobile,
//           devTablet,
//           devDesktop,
//         ] = await Promise.all([
//           redisClient.hget(redisKey, "eventCount"),
//           redisClient.hget(redisKey, "sumLoginHour"),
//           redisClient.hget(redisKey, "loginCount"),
//           redisClient.hget(redisKey, "lastLat"),
//           redisClient.hget(redisKey, "lastLon"),
//           redisClient.hget(redisKey, "dev:mobile"),
//           redisClient.hget(redisKey, "dev:tablet"),
//           redisClient.hget(redisKey, "dev:desktop"),
//         ]);

//         const eventCount = evCountStr ? parseInt(evCountStr as string, 10) || 0 : 0;
//         const sumHour = sumHourStr ? parseInt(sumHourStr as string, 10) || 0 : 0;
//         const loginCount = loginCountStr ? parseInt(loginCountStr as string, 10) || 0 : 0;
//         const avgLoginHour = loginCount > 0 ? Math.round(sumHour / loginCount) : null;

//         redisAgg = {
//           eventCount,
//           avgLoginHour,
//           lastLat: lastLat ?? null,
//           lastLon: lastLon ?? null,
//           devices: {
//             mobile: devMobile ? parseInt(devMobile as any, 10) || 0 : 0,
//             tablet: devTablet ? parseInt(devTablet as any, 10) || 0 : 0,
//             desktop: devDesktop ? parseInt(devDesktop as any, 10) || 0 : 0,
//           },
//         };
//       }
//     } catch (e) {
//       // Redis may fail — fall back to DB-only logic
//       console.log("Redis user-agg error (continuing):", e);
//       redisAgg = null;
//     }

//     // ---------- session+device cache in Redis ----------
//     // Key: trust:session:{sessionId} -> JSON { session: {...}, device: {...} }
//     // Also cache per-session fp at trust:fp:{sessionId}
//     let sessionCached: any = null;
//     let deviceCached: any = null;
//     if (redisClient && tokenSessionId) {
//       try {
//         const cacheKey = `trust:session:${String(tokenSessionId)}`;
//         const raw = await redisClient.get(cacheKey);
//         if (raw) {
//           try {
//             const parsed = JSON.parse(raw);
//             sessionCached = parsed.session ?? null;
//             deviceCached = parsed.device ?? null;
//           } catch (err) {
//             sessionCached = null;
//             deviceCached = null;
//           }
//         }
//       } catch (e) {
//         // ignore redis read error and fallback to DB
//         sessionCached = null;
//         deviceCached = null;
//       }
//     }

//     // ---------- fetch session (DB) if cache miss ----------
//     let sessionDoc: any = sessionDocArg ?? null;
//     if (!sessionCached) {
//       // if caller provided sessionDocArg, use it; otherwise fetch
//       if (!sessionDoc) {
//         try {
//           if (tokenSessionId && mongoose.Types.ObjectId.isValid(String(tokenSessionId))) {
//             sessionDoc = await SessionModel.findById(String(tokenSessionId)).lean().exec();
//           } else if (tokenSessionId) {
//             sessionDoc = await SessionModel.findOne({ sid: String(tokenSessionId) }).lean().exec();
//           } else {
//             sessionDoc = null;
//           }
//         } catch (e) {
//           sessionDoc = null;
//         }
//       }
//     } else {
//       // use cached session
//       sessionDoc = sessionCached;
//     }

//     if (!sessionDoc) {
//       reasons.push("no_session");
//       return { score: 0, action: "requireDeviceApproval", reasons };
//     }

//     // immediate revoked check (from cache or DB)
//     if (sessionCached ? sessionCached.revoked : sessionDoc.revoked) {
//       reasons.push("session_revoked");
//       return { score: 0, action: "reject", reasons };
//     }

//     // ---------- device load (cache preferred) ----------
//     if (deviceCached) {
//       // deviceCached may be null if session had no device mapping previously
//       deviceCached = deviceCached;
//     } else {
//       // try to load device from DB using session.deviceId or session.fingerprint or currentFpHash
//       try {
//         if (sessionDoc.deviceId) {
//           deviceCached = await DeviceModel.findOne({ userId: uid, deviceId: sessionDoc.deviceId }).lean().exec();
//         } else if (sessionDoc.fingerprint) {
//           const sFpHash = crypto.createHash("sha256").update(String(sessionDoc.fingerprint)).digest("hex");
//           deviceCached = await DeviceModel.findOne({ userId: uid, fingerprintHash: sFpHash }).lean().exec();
//         } else if (currentFpHash) {
//           deviceCached = await DeviceModel.findOne({ userId: uid, fingerprintHash: currentFpHash }).lean().exec();
//         } else {
//           deviceCached = null;
//         }
//       } catch (e) {
//         console.log("Device DB read error (continuing):", e);
//         deviceCached = null;
//       }
//     }

//     // If we had DB results and Redis client available, cache the pair for future speed
//     if (redisClient && tokenSessionId && !sessionCached) {
//       try {
//         const cacheKey = `trust:session:${String(tokenSessionId)}`;
//         const toCache = {
//           session: {
//             _id: sessionDoc._id,
//             sid: sessionDoc.sid,
//             userId: sessionDoc.userId,
//             fingerprint: sessionDoc.fingerprint ?? null,
//             revoked: !!sessionDoc.revoked,
//             blocked: !!sessionDoc.blocked,
//             deviceId: sessionDoc.deviceId ?? null,
//             lastUsedAt: sessionDoc.lastUsedAt ?? null,
//           },
//           device: deviceCached
//             ? {
//                 deviceId: deviceCached.deviceId,
//                 fingerprintHash: deviceCached.fingerprintHash ?? null,
//                 revoked: !!deviceCached.revoked,
//                 blocked: !!deviceCached.blocked,
//                 seenCount: deviceCached.seenCount ?? 0,
//                 lastSeen: deviceCached.lastSeen ?? null,
//               }
//             : null,
//         };
//         await redisClient.set(cacheKey, JSON.stringify(toCache), "EX", CONFIG.SESSION_CACHE_TTL_SECONDS);
//         // also set per-session fp short cache if available
//         if (currentFpHash) {
//           await redisClient.set(`trust:fp:${String(tokenSessionId)}`, currentFpHash, "EX", CONFIG.FP_CACHE_TTL_SECONDS);
//         }
//       } catch (e) {
//         // cache failure is non-fatal
//         console.log("Failed to write session/device cache:", e);
//       }
//     }

//     // If cache existed, but deviceCached is still null, attempt to read per-session fp cached key
//     if (!deviceCached && redisClient && tokenSessionId) {
//       try {
//         const sidFp = await redisClient.get(`trust:fp:${String(tokenSessionId)}`);
//         if (sidFp) {
//           // attempt DB lookup by sidFp
//           try {
//             deviceCached = await DeviceModel.findOne({ userId: uid, fingerprintHash: sidFp }).lean().exec();
//           } catch (e) {
//             deviceCached = null;
//           }
//         }
//       } catch (e) {
//         // ignore
//       }
//     }

//     // check device-level flags from cached or db result
//     if (deviceCached) {
//       if (deviceCached.blocked) {
//         reasons.push("device_blocked");
//         return { score: 0, action: "reject", reasons };
//       }
//       if (deviceCached.revoked) {
//         reasons.push("device_revoked");
//         // allow evaluation to continue with at least requireDeviceApproval
//       }
//     }

//     // ---------- fingerprint comparison ----------
//     let trustedFpHash: string | null = null;
//     if (sessionDoc && sessionDoc.fingerprint) {
//       trustedFpHash = crypto.createHash("sha256").update(String(sessionDoc.fingerprint)).digest("hex");
//     } else if (deviceCached && deviceCached.fingerprintHash) {
//       trustedFpHash = deviceCached.fingerprintHash;
//     } else {
//       // fallback: cached per-session fp in redis
//       if (redisClient && tokenSessionId) {
//         try {
//           const sidFp = await redisClient.get(`trust:fp:${String(tokenSessionId)}`);
//           if (sidFp) trustedFpHash = String(sidFp);
//         } catch (e) {
//           trustedFpHash = null;
//         }
//       } else {
//         trustedFpHash = null;
//       }
//     }

//     if (currentFpHash && trustedFpHash) {
//       const sim = hexSimilarity(trustedFpHash, currentFpHash);
//       if (sim >= CONFIG.FP_SIMILARITY_FULL) {
//         score += CONFIG.POINTS.fingerprintMatch;
//         reasons.push("fingerprint_match");
//       } else if (sim >= CONFIG.FP_SIMILARITY_PARTIAL) {
//         score += CONFIG.POINTS.fingerprintMatchPartial;
//         reasons.push("fingerprint_match_partial");
//       } else {
//         reasons.push("no_fp_match");
//       }
//     } else if (currentFpHash && !trustedFpHash) {
//       reasons.push("no_fp_stored");
//     } else {
//       reasons.push("currentFp_missing");
//     }

//     // session id known reward
//     const sidMatch =
//       String(sessionDoc._id) === String(tokenSessionId) || String(sessionDoc.sid) === String(tokenSessionId);
//     if (sidMatch) {
//       score += CONFIG.POINTS.knownSid;
//       reasons.push("known_sid");
//     } else {
//       reasons.push("unknown_sid");
//     }

//     // geo check
//     try {
//       let lastLat: number | null = null;
//       let lastLon: number | null = null;
//       if (redisAgg && redisAgg.lastLat && redisAgg.lastLon) {
//         lastLat = Number(redisAgg.lastLat);
//         lastLon = Number(redisAgg.lastLon);
//       } else if (userDoc && Array.isArray(userDoc.lastLogin) && userDoc.lastLogin.length > 0) {
//         const last = userDoc.lastLogin[userDoc.lastLogin.length - 1];
//         if (typeof last.lat === "number" && typeof last.lon === "number") {
//           lastLat = last.lat;
//           lastLon = last.lon;
//         }
//       }

//       if (geo && lastLat !== null && lastLon !== null) {
//         const dist = haversineKm([lastLat, lastLon], [geo.lat, geo.lon]);
//         if (dist <= CONFIG.GEO_KM_SAFE) {
//           score += CONFIG.POINTS.geoClose;
//           reasons.push("geo_close");
//         } else {
//           reasons.push(`geo_jump_${Math.round(dist)}km`);
//         }
//       } else {
//         reasons.push("no_geo_info");
//       }
//     } catch (e) {
//       reasons.push("geo_calc_error");
//     }

//     // ip reputation
//     if (typeof ipReputationScore === "number") {
//       if (ipReputationScore >= 60) {
//         score += CONFIG.POINTS.goodIpReputation;
//         reasons.push("good_ip_reputation");
//       } else {
//         reasons.push("bad_ip_reputation");
//       }
//     } else {
//       reasons.push("no_ip_reputation");
//     }

//     // time-of-day
//     try {
//       let avgHour: number | null = null;
//       if (redisAgg && redisAgg.avgLoginHour !== null) avgHour = redisAgg.avgLoginHour as number;
//       else if (userDoc && typeof userDoc.avgLoginHour === "number") avgHour = Math.round(userDoc.avgLoginHour);

//       if (avgHour !== null) {
//         const diff = Math.abs(hour - avgHour);
//         if (diff <= 3) {
//           score += CONFIG.POINTS.timeMatch;
//           reasons.push("time_match");
//         } else {
//           reasons.push(`time_mismatch_now_${hour}_avg_${avgHour}`);
//         }
//       } else {
//         reasons.push("no_avg_hour");
//       }
//     } catch (e) {
//       reasons.push("time_check_error");
//     }

//     // recent failed
//     if (recentFailedLoginCount <= 1) {
//       score += CONFIG.POINTS.noRecentFailedLogins;
//       reasons.push("no_recent_failed_logins");
//     } else {
//       reasons.push(`recent_failed_${recentFailedLoginCount}`);
//     }

//     // device familiarity
//     try {
//       let deviceSeen = false;
//       if (redisAgg) {
//         const devCounts = redisAgg.devices;
//         if (devCounts && devCounts[deviceType] && Number(devCounts[deviceType]) > 1) deviceSeen = true;
//       } else if (userDoc && userDoc.devices && typeof userDoc.devices[deviceType] === "number" && userDoc.devices[deviceType] > 1) {
//         deviceSeen = true;
//       }
//       if (deviceCached && (deviceCached.seenCount || 0) > 1) deviceSeen = true;

//       if (deviceSeen) {
//         score += CONFIG.POINTS.deviceFamiliarity;
//         reasons.push("device_familiar");
//       } else {
//         reasons.push("device_new");
//       }
//     } catch (e) {
//       reasons.push("device_check_error");
//     }

//     score = clamp(score);

//     let action: TrustAction = "reject";
//     if (score >= CONFIG.DECISIONS.allow) action = "allow";
//     else if (score >= CONFIG.DECISIONS.require2FA) action = "require2FA";
//     else if (score >= CONFIG.DECISIONS.requireDeviceApproval) action = "requireDeviceApproval";
//     else action = "reject";

//     // device overrides (re-check)
//     if (deviceCached) {
//       if (deviceCached.blocked) {
//         action = "reject";
//         if (!reasons.includes("device_blocked")) reasons.push("device_blocked");
//       } else if (deviceCached.revoked) {
//         if (action === "allow") action = "requireDeviceApproval";
//         if (!reasons.includes("device_revoked")) reasons.push("device_revoked");
//       }
//     }

//     // optionally update per-session fp cache: keep current fp cached for quick future checks
//     try {
//       if (redisClient && tokenSessionId && currentFpHash) {
//         await redisClient.set(`trust:fp:${String(tokenSessionId)}`, currentFpHash, "EX", CONFIG.FP_CACHE_TTL_SECONDS);
//       }
//     } catch (e) {
//       // ignore cache write failure
//     }

//     return { score, action, reasons };
//   } catch (err) {
//     console.log("Unexpected error in trust engine:", err);
//     return { score: 0, action: "reject", reasons: ["trust_engine_error"] };
//   }
// }
