// services/deviceService.ts
import crypto from "crypto";
import { nanoid } from "nanoid";
import Device, { IDevice } from "@/app/models/Device";

function hashFp(fp?: string | null) {
  if (!fp) return null;
  return crypto.createHash("sha256").update(String(fp)).digest("hex");
}

/**
 * upsertDeviceForUser
 * - Creates device doc on first-seen (immediate) so you have a persistent record.
 * - When redisAgg is present, we avoid updating the Document on every request.
 *   Instead we update only when `shouldPersistToDb` is true (like eventCount threshold).
 *
 * Returns the device doc (fresh from DB if created/updated).
 */
export async function upsertDeviceForUser(opts: {
  userId: string;
  fingerprint?: string | null;
  ua?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop" | "unknown";
  ip?: string | null;
  now?: Date;
  redisAgg?: { eventCount?: number } | null;
  shouldPersistToDb?: boolean; // force DB update even if redisAgg present
}): Promise<IDevice | null> {
  const {
    userId,
    fingerprint = null,
    ua = null,
    deviceType = "unknown",
    ip = null,
    now = new Date(),
    redisAgg = null,
    shouldPersistToDb = false,
  } = opts;

  if (!userId) return null;

  const fpHash = hashFp(fingerprint);

  // Try to find by fingerprint first
  let device = fpHash ? await Device.findOne({ userId, fingerprintHash: fpHash }) : null;

  // If not found by fp, try by ua heuristic (recent)
  if (!device) {
    if (ua) {
      device = await Device.findOne({ userId, ua }).sort({ lastSeen: -1 }).limit(1).exec();
    }
  }

  // If still not found -> create new persistent device doc immediately
  if (!device) {
    const deviceId = nanoid();
    const seenCount = redisAgg?.eventCount && Number(redisAgg.eventCount) > 0 ? Number(redisAgg.eventCount) : 1;
    const doc = new Device({
      userId,
      deviceId,
      fingerprintHash: fpHash,
      ua,
      deviceType,
      trustScore: 50, // neutral baseline
      lastSeen: now,
      seenCount,
      metadata: ip ? { lastIp: ip } : null,
    });
    await doc.save(); // correct .save() usage
    return doc;
  }

  // If device exists:
  // - If Redis is present and we're not asked to persist, skip heavy updates.
  // - If Redis absent or shouldPersistToDb true, make DB update.
  const hasRedis = !!redisAgg;
  const persist = !hasRedis || shouldPersistToDb || (redisAgg && (redisAgg.eventCount || 0) > 0 && (redisAgg.eventCount as number) >= 1);

  if (persist) {
    // Update counters conservatively: if redisAgg.eventCount exists, add that, else +1
    const increment = redisAgg && typeof redisAgg.eventCount === "number" ? Number(redisAgg.eventCount) : 1;
    device.seenCount = (device.seenCount || 0) + increment;
    device.lastSeen = now;
    if (!device.fingerprintHash && fpHash) device.fingerprintHash = fpHash;
    if (ua) device.ua = ua;
    if (deviceType) device.deviceType = deviceType;
    if (ip) device.metadata = { ...(device.metadata || {}), lastIp: ip };

    // gentle trust score smoothing: move device.trustScore slightly toward current computed score later
    await device.save();
  }

  return device;
}

/** produce compact devices snapshot for TrustEvent (limit optional) */
export async function devicesSnapshotForUser(userId: string, limit = 10) {
  const docs = await Device.find({ userId }).sort({ lastSeen: -1 }).limit(limit).lean().exec();
  return docs.map(d => ({
    deviceId: d.deviceId,
    deviceType: d.deviceType,
    fingerprintHash: d.fingerprintHash,
    trustScore: d.trustScore,
    revoked: d.revoked,
    blocked: d.blocked,
    approved: d.approved,
    lastSeen: d.lastSeen,
    seenCount: d.seenCount,
  }));
}

export async function setDeviceRevoked(userId: string, deviceId: string, revoked = true) {
  return Device.findOneAndUpdate({ userId, deviceId }, { revoked, updatedAt: new Date() }, { new: true }).exec();
}

export async function setDeviceBlocked(userId: string, deviceId: string, blocked = true) {
  return Device.findOneAndUpdate({ userId, deviceId }, { blocked, updatedAt: new Date() }, { new: true }).exec();
}
