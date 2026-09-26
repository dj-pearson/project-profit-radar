/**
 * Apple Push Notification service (APNs) sender, token-based auth.
 *
 * Needs three secrets from the Apple Developer account (Certificates, IDs &
 * Profiles -> Keys -> a key with "Apple Push Notifications service"):
 *   APNS_KEY_ID       the key's 10-character id
 *   APNS_TEAM_ID      the team id
 *   APNS_PRIVATE_KEY  the .p8 file's contents, PEM header and all
 * and optionally APNS_BUNDLE_ID (defaults to com.brikly.app).
 */

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  privateKeyPem: string;
  bundleId: string;
}

export function apnsConfigFromEnv(): ApnsConfig | null {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const privateKeyPem = Deno.env.get("APNS_PRIVATE_KEY");
  if (!keyId || !teamId || !privateKeyPem) return null;
  return { keyId, teamId, privateKeyPem, bundleId: Deno.env.get("APNS_BUNDLE_ID") || "com.brikly.app" };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// APNs rejects a provider token older than an hour and throttles one that is
// refreshed more than every 20 minutes. Reuse for 50.
let cached: { jwt: string; issuedAt: number; keyId: string } | null = null;

export async function providerToken(config: ApnsConfig, now = Date.now()): Promise<string> {
  if (cached && cached.keyId === config.keyId && now - cached.issuedAt < 50 * 60 * 1000) {
    return cached.jwt;
  }
  const encoder = new TextEncoder();
  const header = base64url(encoder.encode(JSON.stringify({ alg: "ES256", kid: config.keyId })));
  const issuedAtSeconds = Math.floor(now / 1000);
  const claims = base64url(encoder.encode(JSON.stringify({ iss: config.teamId, iat: issuedAtSeconds })));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(config.privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // Web Crypto returns the raw r||s signature, which is what JWS ES256 wants.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput)),
  );
  const jwt = `${signingInput}.${base64url(signature)}`;
  cached = { jwt, issuedAt: now, keyId: config.keyId };
  return jwt;
}

export interface ApnsAlert {
  title: string;
  body?: string;
  /** Custom keys delivered alongside `aps`, read by the app on tap. */
  data?: Record<string, unknown>;
  threadId?: string;
}

export type ApnsResult =
  | { ok: true }
  | { ok: false; status: number; reason: string; tokenIsDead: boolean };

export async function sendApns(
  config: ApnsConfig,
  token: string,
  environment: "sandbox" | "production",
  alert: ApnsAlert,
): Promise<ApnsResult> {
  const host = environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const jwt = await providerToken(config);
  const payload = {
    aps: {
      alert: { title: alert.title, ...(alert.body ? { body: alert.body } : {}) },
      sound: "default",
      ...(alert.threadId ? { "thread-id": alert.threadId } : {}),
    },
    ...(alert.data ?? {}),
  };

  const response = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return { ok: true };

  let reason = `HTTP ${response.status}`;
  try {
    const json = await response.json();
    if (json?.reason) reason = String(json.reason);
  } catch {
    // Body isn't JSON; keep the status.
  }
  // 410 Unregistered: the app was removed or the token rotated. BadDeviceToken:
  // the token is malformed or belongs to the other environment. Either way,
  // pushing to it again will never work.
  const tokenIsDead = response.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered";
  return { ok: false, status: response.status, reason, tokenIsDead };
}
