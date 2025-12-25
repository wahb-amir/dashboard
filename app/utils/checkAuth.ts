// app/lib/checkAuth.ts
import { cookies } from "next/headers";
import { verifyToken, type AuthTokenPayload } from "./token";

export type CheckAuthResult = AuthTokenPayload | false;
export type CheckAuthFn = () => Promise<CheckAuthResult>;

export const checkAuth: CheckAuthFn = async (): Promise<CheckAuthResult> => {
  const cookieStore = await cookies();

  const authToken = cookieStore.get("authToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const token = authToken ?? refreshToken;

  if (!token) return false;

  const result = verifyToken(token, "AUTH");
  if (!result || !result.decoded) return false;

  return result.decoded;
};
