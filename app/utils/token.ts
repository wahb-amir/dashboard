// lib/jwt.ts
import jwt from "jsonwebtoken";

/**
 * Environment secrets
 */
const APP_SECRET = process.env.JWT_SECRET_APP;
const INTERNAL_SECRET = process.env.JWT_INTERNAL_SECRET;
const AUTH_SECRET = process.env.JWT_SECRET_AUTH;
const REFRESH_SECRET = process.env.JWT_SECRET_REFRESH;

const AUTH_EXPIRES_IN_APP = process.env.JWT_AUTH_EXPIRES_IN_APP || "1h";
const origin = process.env.ORIGIN;

if (!APP_SECRET || !AUTH_SECRET || !REFRESH_SECRET || !INTERNAL_SECRET) {
  console.warn(
    "One or more JWT secrets are not set. Ensure JWT_SECRET_APP, JWT_SECRET_AUTH, JWT_SECRET_REFRESH and JWT_INTERNAL_SECRET exist in .env."
  );
}

/**
 * Types
 */
export type TokenType = "AUTH" | "APP" | "REFRESH";

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
export type DecodedToken = {
  uid: string;
  email?: string;
  role?: string;
  name?: string;
  company?: string;
  [k: string]: any;
};
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
export type CheckAuthFn = (
  token: string,
  type: "AUTH" | "REFRESH"
) => AuthTokenPayload | null;

export const generateToken: GenerateTokenFn = (
  payload: Record<string, any> = {},
  type: TokenType = "AUTH",
  opts: GenerateTokenOptions = {}
): string => {
  // Choose secret based on token type
  const secret =
    type === "APP"
      ? APP_SECRET
      : type === "REFRESH"
      ? REFRESH_SECRET
      : AUTH_SECRET;

  if (!secret) throw new Error("Missing JWT secret for type " + type);

  // Set default expiration
  let expiresIn: string | number;
  if (opts.expiresIn !== undefined) {
    expiresIn = opts.expiresIn;
  } else {
    switch (type) {
      case "AUTH":
        expiresIn = AUTH_EXPIRES_IN_APP; // e.g., '1h'
        break;
      case "REFRESH":
        expiresIn = "7d"; // typical refresh token duration
        break;
      case "APP":
      default:
        expiresIn = "1h";
    }
  }
  const signOptions: jwt.SignOptions = { expiresIn: expiresIn as any };

  return jwt.sign(payload as jwt.JwtPayload, secret, signOptions);
};

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
 * renewAuthToken — renew an AUTH token using a REFRESH token (expects REFRESH token data)
 *
 * NOTE: verifyToken(refreshToken, "REFRESH") is used — previous bug verified REFRESH with AUTH secret.
 */
export const renewAuthToken: RenewAuthTokenFn = (refreshToken) => {
  const tokenData = verifyToken(refreshToken, "REFRESH");
  if (!tokenData) return null;

  const { decoded } = tokenData;
  if (!decoded || !decoded.uid) return null;

  const newAuthToken = generateToken(
    {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    },
    "AUTH",
    { expiresIn: AUTH_EXPIRES_IN_APP }
  );

  return newAuthToken;
};

/**
 * verifyToken
 */
export const verifyToken: VerifyTokenFn = (token, type = "AUTH") => {
  try {
    let secret: string | undefined;

    switch (type) {
      case "APP":
        secret = APP_SECRET;
        break;
      case "REFRESH":
        secret = REFRESH_SECRET;
        break;
      case "AUTH":
      default:
        secret = AUTH_SECRET;
    }

    if (!secret) return null;

    const decodedRaw = jwt.verify(token, secret);
    const decoded =
      typeof decodedRaw === "string"
        ? ({ uid: decodedRaw } as AuthTokenPayload)
        : (decodedRaw as AuthTokenPayload);

    return { decoded };
  } catch (err: any) {
    // Be explicit about common JWT errors to help debugging
    if (err && err.name) {
      console.log("JWT verify error:", err.name, err.message);
    } else {
      console.log("JWT verify error:", err);
    }
    return null;
  }
};

export const checkAuth: CheckAuthFn = (token, type = "AUTH") => {
  const result = verifyToken(token, type);
  if (!result) return null;
  return result.decoded;
};
