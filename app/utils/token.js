import jwt from "jsonwebtoken";

const APP_SECRET = process.env.JWT_SECRET_APP;
const AUTH_SECRET = process.env.JWT_SECRET_AUTH;
const INTERAL_SECRET = process.env.JWT_INTERNAL_SECRET;

const AUTH_EXPIRES_IN_APP = process.env.JWT_AUTH_EXPIRES_IN_APP || "1h";
const origin = process.env.ORIGIN;

if (!APP_SECRET || !AUTH_SECRET) {
    console.warn("JWT secrets are not set. Make sure JWT_SECRET_APP and JWT_SECRET_AUTH exist in .env.");
}

// --- Internal Token ---
export function generateInternalToken(uid) {
    if (!INTERAL_SECRET) throw new Error("Missing JWT secret for internal token");
    return jwt.sign({ origin, uid }, INTERAL_SECRET, { expiresIn: "8m" });
}

export function validateInternalToken(token) {
    if (!INTERAL_SECRET) return null;
    try {
        return jwt.verify(token, INTERAL_SECRET);
    } catch (err) {
        return null;
    }
}

// --- Auth Token ---
export function generateToken(payload = {}, type = "AUTH", opts = {}) {
    const secret = type === "APP" ? APP_SECRET : AUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret for type " + type);
    const signOptions = { expiresIn: opts.expiresIn || (type === "AUTH" ? AUTH_EXPIRES_IN_APP : "7d") };
    return jwt.sign(payload, secret, signOptions);
}

// Renew token while keeping all user info
export function renewAuthToken(refreshToken) {
    const tokenData = verifyToken(refreshToken, "AUTH");
    if (!tokenData) return null;

    const { decoded } = tokenData; // <-- unwrap decoded
    if (!decoded) return null;

    const newAuthToken = generateToken({
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
    }, "AUTH", { expiresIn: "1h" });

    return newAuthToken;
}


// Verify token and return decoded payload
export function verifyToken(token, type = "AUTH") {
    try {
        const secret = type === "APP" ? APP_SECRET : AUTH_SECRET;
        if (!secret) return null;

        const decoded = jwt.verify(token, secret);
        return { decoded };
    } catch (err) {
        return null;
    }
}

// Check auth wrapper
export function checkAuth(token) {
    const result = verifyToken(token, "AUTH");
    if (!result) return null;
    return result.decoded; // always return decoded user info
}
