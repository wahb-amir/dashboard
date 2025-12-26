// app/lib/checkAuth.ts
import { cookies } from "next/headers";
import { verifyToken, type AuthTokenPayload } from "./token";

export type CheckAuthResult = AuthTokenPayload | false;

export async function checkAuth(): Promise<CheckAuthResult> {
  const cookieStore = await cookies();

  const authToken = cookieStore.get("authToken")?.value;
  if (!authToken) return false;

  const result = verifyToken(authToken, "AUTH");
  if (!result?.decoded) return false;

  return result.decoded;
}
