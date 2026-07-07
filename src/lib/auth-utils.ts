import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "default_aba_crm_secret_key_1234567890_abcd_please_change_me_in_production";

export interface SessionPayload {
    username: string;
    name: string;
    role: string;
}

export function hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export function generateSalt(): string {
    return crypto.randomBytes(16).toString("hex");
}

// Custom simple JWT signer/verifier compatible with Next.js Server & Edge Middleware
export function signToken(payload: SessionPayload, durationDays = 7): string {
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    
    // We use standard JSON stringify and base64url encoding
    const headerStr = JSON.stringify({ alg: "HS256", typ: "JWT" });
    const payloadStr = JSON.stringify({ ...payload, exp: expiresAt });
    
    const headerBase64 = Buffer.from(headerStr).toString("base64url");
    const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
    
    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(`${headerBase64}.${payloadBase64}`);
    const signature = hmac.digest("base64url");
    
    return `${headerBase64}.${payloadBase64}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        
        const [headerBase64, payloadBase64, signature] = parts;
        
        const hmac = crypto.createHmac("sha256", SESSION_SECRET);
        hmac.update(`${headerBase64}.${payloadBase64}`);
        const expectedSignature = hmac.digest("base64url");
        
        if (signature !== expectedSignature) return null;
        
        const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
        const payload = JSON.parse(payloadStr);
        
        if (payload.exp && payload.exp < Date.now()) {
            return null; // Expired
        }
        
        return {
            username: payload.username,
            name: payload.name,
            role: payload.role,
        };
    } catch {
        return null;
    }
}
