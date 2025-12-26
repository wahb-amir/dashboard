// lib/jwt.ts
import jwt from "jsonwebtoken";

/**
 * Environment secrets
 */
const APP_SECRET = process.env.JWT_SECRET_APP;
const AUTH_SECRET = process.env.JWT_SECRET_AUTH;
const INTERNAL_SECRET = process.env.JWT_INTERNAL_SECRET;

const AUTH_EXPIRES_IN_APP = process.env.JWT_AUTH_EXPIRES_IN_APP || "1h";
const origin = process.env.ORIGIN;

if (!APP_SECRET || !AUTH_SECRET) {
  console.warn(
    "JWT secrets are not set. Make sure JWT_SECRET_APP and JWT_SECRET_AUTH exist in .env."
  );
}

/**
 * Types
 */
export type TokenType = "AUTH" | "APP";

export interface InternalTokenPayload {
  origin?: string;
  uid: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export interface AuthTokenPayload {
  uid: string;
  email?: string;
  role?: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export interface GenerateTokenOptions {
  expiresIn?: string | number;
}

export interface VerifyResult {
  decoded: AuthTokenPayload;
}

/**
 * Function types (exported so other modules can reference them)
 */
export type GenerateInternalTokenFn = (uid: string) => string;
export type ValidateInternalTokenFn = (
  token: string
) => InternalTokenPayload | null;
export type GenerateTokenFn = (
  payload?: Record<string, any>,
  type?: TokenType,
  opts?: GenerateTokenOptions
) => string;
export type RenewAuthTokenFn = (refreshToken: string) => string | null;
export type VerifyTokenFn = (
  token: string,
  type?: TokenType
) => VerifyResult | null;
export type CheckAuthFn = (token: string) => AuthTokenPayload | null;

/* ---------------------------
   Implementation
   --------------------------- */

/**
 * generateInternalToken
 */
export const generateInternalToken: GenerateInternalTokenFn = (uid) => {
  if (!INTERNAL_SECRET)
    throw new Error("Missing JWT secret for internal token");
  return jwt.sign({ origin, uid }, INTERNAL_SECRET, { expiresIn: "8m" });
};

/**
 * validateInternalToken
 */
export const validateInternalToken: ValidateInternalTokenFn = (token) => {
  if (!INTERNAL_SECRET) return null;
  try {
    const decoded = jwt.verify(token, INTERNAL_SECRET) as InternalTokenPayload;
    return decoded;
  } catch (err) {
    return null;
  }
};

/**
 * generateToken
 */
export const generateToken: GenerateTokenFn = (
  payload = {},
  type = "AUTH",
  opts = {}
) => {
  const secret = type === "APP" ? APP_SECRET : AUTH_SECRET;
  if (!secret) throw new Error("Missing JWT secret for type " + type);

  const expiresIn: jwt.SignOptions["expiresIn"] = (opts.expiresIn ??
    (type === "AUTH"
      ? AUTH_EXPIRES_IN_APP
      : "7d")) as jwt.SignOptions["expiresIn"];

  const signOptions: jwt.SignOptions = { expiresIn };

  return jwt.sign(payload as jwt.JwtPayload, secret, signOptions) as string;
};

/**
 * renewAuthToken — renew a token using a refresh token (expects AUTH token data)
 */
export const renewAuthToken: RenewAuthTokenFn = (refreshToken) => {
  const tokenData = verifyToken(refreshToken, "AUTH");
  if (!tokenData) return null;

  const { decoded } = tokenData;
  if (!decoded) return null;

  const newAuthToken = generateToken(
    {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    },
    "AUTH",
    { expiresIn: "1h" }
  );

  return newAuthToken;
};

/**
 * verifyToken
 */
export const verifyToken: VerifyTokenFn = (token, type = "AUTH") => {
  try {
    const secret = type === "APP" ? APP_SECRET : AUTH_SECRET;
    if (!secret) return null;

    const decodedRaw = jwt.verify(token, secret);
    const decoded =
      typeof decodedRaw === "string"
        ? { uid: decodedRaw }
        : (decodedRaw as AuthTokenPayload);

    return { decoded };
  } catch (err) {
    return null;
  }
};

/**
 * checkAuth — helper that returns decoded user info or null
 */
export const checkAuth: CheckAuthFn = (token) => {
  const result = verifyToken(token, "AUTH");
  if (!result) return null;
  return result.decoded;
};
