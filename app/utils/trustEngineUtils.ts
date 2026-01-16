
export async function invalidateTrustCache(sessionId: string, redisClient: any) {
  if (!redisClient || !sessionId) return;

  const sessionKey = `trust:session:${String(sessionId)}`;
  const fpKey = `trust:fp:${String(sessionId)}`;

  try {
    await Promise.all([redisClient.del(sessionKey), redisClient.del(fpKey)]);
    console.log(`[TrustEngine] Cleared cache for session ${sessionId}`);
  } catch (err) {
    console.log(`[TrustEngine] Failed to clear cache for session ${sessionId}:`, err);
  }
}


//usage
// import { invalidateTrustCache } from "@/app/utils/trustEngineUtils";

// // after marking session as revoked/blocked
// await SessionModel.findByIdAndUpdate(sessionId, { revoked: true });
// await invalidateTrustCache(sessionId, redisClient);