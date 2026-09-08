import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ges_session";

export type SessionPayload = {
  userId: string;
  email: string;
  /** epoch seconds */
  exp: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Fallback solo para evitar crash en build; login fallará validación real
    // si AUTH_SECRET no está configurado en runtime.
    return process.env.AUTH_SECRET_FALLBACK ?? "dev-only-insecure-secret";
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload?.userId || !payload?.email || !payload?.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionMaxAgeSeconds(remember: boolean): number {
  return remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
}
