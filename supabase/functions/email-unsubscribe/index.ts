// email-unsubscribe
//
// One-click unsubscribe endpoint. Called from the {{unsubscribe_url}}
// placeholder in email templates. No user session is required — the link
// carries a signed token that identifies the user.
//
// Token format (HMAC-SHA256):
//   base64url(user_id) + "." + base64url(timestamp) + "." + signature
//
// The signature is HMAC-SHA256(`${user_id}.${timestamp}`, secret) where
// `secret` is EMAIL_UNSUBSCRIBE_SECRET from the edge-function env. Tokens
// expire after 30 days so stale URLs cannot be replayed forever.
//
// Flow:
//   GET /functions/v1/email-unsubscribe?token=...&category=marketing
//     - Validates token.
//     - Flips the specified category (or all non-transactional if omitted)
//       off in email_preferences.
//     - Redirects to /email-preferences?unsubscribed=1 so the user sees a
//       confirmation and can fine-tune.
//
// Compliance requirements honored here:
//   - CAN-SPAM §5(a)(5): functional unsubscribe mechanism in every
//     commercial email, honored within 10 business days. We honor
//     immediately.
//   - CASL: consent withdrawal must be as simple as consent.
//   - ePrivacy / GDPR: one-click opt-out for marketing email.
//   - Gmail / Yahoo 2024 bulk-sender rules: one-click List-Unsubscribe
//     (RFC 8058) support — pair this with the List-Unsubscribe-Post
//     header in outbound mail.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const base64UrlDecode = (s: string): Uint8Array => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const bytesToString = (b: Uint8Array): string =>
  new TextDecoder().decode(b);

const hmacSha256 = async (secret: string, data: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

interface ParsedToken {
  userId: string;
  timestamp: number;
}

const verifyToken = async (
  token: string,
  secret: string,
): Promise<ParsedToken | null> => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdB64, tsB64, sigB64] = parts;

  const userId = bytesToString(base64UrlDecode(userIdB64));
  const tsStr = bytesToString(base64UrlDecode(tsB64));
  const timestamp = Number(tsStr);
  if (!Number.isFinite(timestamp)) return null;
  if (Date.now() - timestamp > TOKEN_MAX_AGE_MS) return null;

  const expected = await hmacSha256(secret, `${userId}.${tsStr}`);
  const provided = base64UrlDecode(sigB64);
  if (!timingSafeEqual(expected, provided)) return null;

  return { userId, timestamp };
};

const confirmationPage = (ok: boolean, message: string): Response => {
  const title = ok ? "Unsubscribed" : "Could not unsubscribe";
  const html = `<!doctype html><html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Brikly</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #F3F4F6; color: #111827; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
      .card { background:#fff; padding:32px 40px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,.08); max-width:480px; text-align:center; }
      h1 { margin:0 0 12px; font-size:20px; }
      p { color:#4B5563; line-height:1.6; }
      a.btn { display:inline-block; margin-top:16px; padding:10px 18px; background:#F97316; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; }
    </style>
  </head><body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn" href="https://brikly.net/email-preferences">Manage email preferences</a>
    </div>
  </body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

serve(async (req) => {
  // Support RFC 8058 List-Unsubscribe-Post (HTTPS POST with
  // "List-Unsubscribe=One-Click" body). Both GET and POST are valid.
  if (req.method !== "GET" && req.method !== "POST") {
    return confirmationPage(false, "Unsupported method.");
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const category = url.searchParams.get("category"); // optional

  if (!token) return confirmationPage(false, "Missing or invalid unsubscribe link.");

  const secret = Deno.env.get("EMAIL_UNSUBSCRIBE_SECRET");
  if (!secret) {
    console.error("[email-unsubscribe] EMAIL_UNSUBSCRIBE_SECRET not configured");
    return confirmationPage(false, "Service temporarily unavailable. Email unsubscribe@brikly.net to opt out.");
  }

  const parsed = await verifyToken(token, secret);
  if (!parsed) {
    return confirmationPage(
      false,
      "This unsubscribe link is invalid or expired. Email unsubscribe@brikly.net and we'll honor your request within 10 business days.",
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return confirmationPage(false, "Service temporarily unavailable.");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Opting out of one category vs. all non-transactional categories.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (category && ["marketing", "product_updates", "newsletter"].includes(category)) {
    patch[category] = false;
  } else {
    patch.marketing = false;
    patch.product_updates = false;
    patch.newsletter = false;
  }

  const { error } = await admin.from("email_preferences").upsert({
    user_id: parsed.userId,
    ...patch,
  });

  if (error) {
    console.error("[email-unsubscribe] upsert failed", error);
    return confirmationPage(false, "We could not save your preference. Email unsubscribe@brikly.net.");
  }

  return confirmationPage(
    true,
    category
      ? `You've been unsubscribed from our ${category.replaceAll("_", " ")} emails. You'll still receive account and security messages.`
      : "You've been unsubscribed from all marketing, product update, and newsletter emails. You'll still receive account and security messages.",
  );
});
