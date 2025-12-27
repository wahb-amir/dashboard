import { cookies } from "next/headers";
import { verifyToken } from "./token";
import type { AuthTokenPayload } from "./token";

export type CheckAuthResult =
  | { payload: AuthTokenPayload; needsRefresh: false }
  | { payload: null; needsRefresh: true }
  | false;

export async function checkAuth(): Promise<CheckAuthResult> {
  const cookieStore = await cookies();

  const authToken = cookieStore.get("authToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // 1️⃣ No auth token, but refresh exists → client needs to fetch new auth
  if (!authToken && refreshToken) {
    return { payload: null, needsRefresh: true };
  }

  // 2️⃣ No tokens → unauthenticated
  if (!authToken) return false;

  // 3️⃣ Verify existing auth token
  const result = verifyToken(authToken, "AUTH");
  if (!result?.decoded) return false;

  return { payload: result.decoded, needsRefresh: false };
}
