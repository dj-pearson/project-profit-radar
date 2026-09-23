#!/usr/bin/env node
/**
 * US-302: no NEW security-named module under src/ that nothing imports.
 *
 * The hazard is not duplication, it is adoption. A module whose name promises
 * protection gets reached for on the strength of that name, and code nobody
 * calls is code nobody audits. Three things found this session were exactly
 * this shape:
 *
 *   src/components/auth/ProtectedRoute.tsx  fail-open role checks
 *                                           (`role && !allowed.includes(role)`
 *                                           skips the comparison for a null
 *                                           role), imported by nothing but its
 *                                           own test, sitting under the more
 *                                           canonical-looking path.
 *   src/utils/security.ts                   a second checkRateLimit counting in
 *                                           localStorage, defeated by clearing
 *                                           it, plus a third sanitizeHtml and
 *                                           duplicate CSRF helpers.
 *   addSecurityHeaders()                    injected a second CSP that omitted
 *                                           Stripe, GTM, Sentry and SSO
 *                                           (US-301).
 *
 * "Referenced" here means some other file under src/ names the module: a static
 * import, a dynamic import(), a React.lazy specifier, or a re-export. That is
 * deliberately generous - the point is to catch a module with NO inbound edge
 * at all, not to police how it is reached.
 *
 * BASELINE grandfathered the modules that predated this guard. It is now empty
 * (all triaged, see below), so any unreferenced security-named module fails.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');

/** A module is security-named if its path or filename says so. */
const SECURITY_NAME =
  /(?:^|\/|[a-z])(?:secur|auth|permission|rbac|role|guard|protect|csrf|xss|sanitiz|crypto|encrypt|mfa|otp|session|token|audit)/i;

/** Files that are entry points or are consumed outside the src/ import graph. */
const NEVER_FLAG = [
  /\.(test|spec)\.[jt]sx?$/,
  /\/__tests__\//,
  /\/__mocks__\//,
  /\.d\.ts$/,
  /^src\/main\.tsx$/,
  /^src\/App\.tsx$/,
];

/**
 * Known-unreferenced security-named modules that predate this guard. The
 * worklist is empty: every entry has had its delete / wire-up / fail-closed
 * decision (US-302 AC3), recorded below. Keep it empty. A new entry needs a
 * comment saying why the module has no callers yet.
 *
 * Triaged 2026-08-27:
 *
 *   DELETED  services/SecurityService.ts   entirely mock - updateSecuritySettings
 *                                          and resolveSecurityAlert showed a
 *                                          success toast and wrote nothing,
 *                                          performSecurityScan returned a
 *                                          hardcoded score of 85 and two
 *                                          invented issues. Worse, it name-
 *                                          collided with the LIVE
 *                                          lib/security/securityService.ts.
 *   DELETED  hooks/useAuth.ts               a second useAuth, resolving role via
 *                                          get_user_primary_role while the app's
 *                                          comes from AuthContext. Both server-
 *                                          side, so no security difference -
 *                                          just a duplicate.
 *   DELETED  contexts/MockAuthContext.tsx   a test double in production source,
 *                                          hardcoding role: 'admin' and a real
 *                                          production company UUID.
 *
 * Triaged 2026-09-23. The 08-27 pass kept seven of these as "real but
 * unreferenced". Rechecked against what is live, each one has a live
 * equivalent, so all thirteen were deleted rather than wired in:
 *
 *   routes/routeSecurity.tsx            already deleted in US-350.
 *   hooks/useSecurity.ts                enable2FA upserted two_factor_enabled
 *                                       without verifying the TOTP code
 *                                       ("would need a backend validation").
 *                                       Live MFA is components/security/
 *                                       MFASetup.tsx + mfa/TOTPSetupScreen.
 *   hooks/useMFASetup.ts                hardcoded userHasMFA = false ("mock for
 *                                       now"), so it would prompt everyone.
 *                                       Its only consumer, MFASetupDialog, went
 *                                       in US-296.
 *   components/mfa/index.ts             barrel; Auth.tsx and SSOManagement.tsx
 *                                       import both members directly.
 *   hooks/useActiveSessions.ts          same user_sessions query as the live
 *                                       useDeviceTrust, which drives
 *                                       ActiveSessionsManagement.
 *   lib/sessionFingerprint.ts           a second device fingerprint; the live
 *                                       one is useDeviceTrust's
 *                                       generateDeviceFingerprint. Client-side,
 *                                       so it never bound a stolen token anyway.
 *   lib/secureLogger.ts                 info/debug/log were empty bodies, so
 *                                       adopting it silently dropped logs. Live
 *                                       path: lib/logger.ts, Sentry beforeSend
 *                                       scrubbing, lib/security/errorSanitizer.
 *   utils/dosProtection.ts              client-side DoS "protection" (the
 *   components/admin/DosProtection.tsx  attacker does not run our JS) and an
 *                                       unrouted admin panel. Live admin UI is
 *                                       pages/RateLimitingDashboard.tsx over the
 *                                       same ip_access_control table.
 *   components/security/SecurityAuditPanel.tsx
 *                                       same calculate_security_metrics RPC and
 *                                       security_alerts table as the live
 *                                       SecurityMonitoringDashboard.
 *   components/audit/ActivityLogger.tsx audit_logs viewer; live ones are
 *                                       pages/admin/AuditLoggingCompliance.tsx
 *                                       and pages/ComplianceAudit.tsx.
 *   components/debug/AuthDebug.tsx      dev-only auth state dump; nothing to
 *                                       wire it into.
 *   components/mobile/AndroidPermissionManager.tsx
 *   mobile/utils/permissions.ts         Capacitor and Expo permission managers.
 *                                       Neither wrapper is the shipping app
 *                                       (Brikly-iOS is), and the live Capacitor
 *                                       permission requests sit in
 *                                       useCameraCapture / useGeolocation /
 *                                       useNotifications.
 */
const BASELINE = new Set([]);

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(f)) files.push(f);
  }
};
walk(SRC);

const rel = (f) => relative(root, f).split('\\').join('/');

// Build the set of module basenames referenced from anywhere else in src/.
// Matching on the specifier's tail rather than resolving it keeps this honest
// about aliases, relative paths and extensionless imports at once.
const referenced = new Set();
const SPEC = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  SPEC.lastIndex = 0;
  let m;
  while ((m = SPEC.exec(text)) !== null) {
    const tail = m[1].replace(/\.(ts|tsx|js|jsx)$/, '').split('/').pop();
    if (tail) referenced.add(tail);
  }
}

const orphans = [];
for (const f of files) {
  const r = rel(f);
  if (NEVER_FLAG.some((re) => re.test(r))) continue;
  if (!SECURITY_NAME.test(r)) continue;
  const base = r.split('/').pop().replace(/\.(ts|tsx)$/, '');
  // index files are reached by their directory name.
  const key = base === 'index' ? r.split('/').slice(-2)[0] : base;
  if (referenced.has(key)) continue;
  orphans.push(r);
}

const fresh = orphans.filter((o) => !BASELINE.has(o));
const fixed = [...BASELINE].filter((b) => !orphans.includes(b));

console.log('Unreferenced security-named module guard (US-302)');
console.log(`  security-named modules with no inbound import: ${orphans.length}`);
console.log(`  grandfathered (baseline):                      ${BASELINE.size}`);

for (const o of orphans.filter((x) => BASELINE.has(x))) console.log(`    ${o}`);

if (fixed.length) {
  console.log(
    `\n  ${fixed.length} baseline entr${fixed.length === 1 ? 'y is' : 'ies are'} no longer unreferenced` +
      ` - remove from BASELINE in ${relative(root, fileURLToPath(import.meta.url))}: ${fixed.join(', ')}`,
  );
}

if (fresh.length) {
  console.error('\n\u2716 New security-named module(s) that nothing imports:');
  for (const o of fresh) console.error(`    ${o}`);
  console.error(
    '\nA module whose name promises protection gets adopted on the strength of that',
  );
  console.error(
    'name, and code nobody calls is code nobody audits - which is how a fail-open',
  );
  console.error(
    'route guard and an always-allow rate limiter both survived here. Wire it up,',
  );
  console.error('delete it, or say in a comment why it has no callers yet.');
  process.exit(1);
}

console.log('\n\u2714 No new unreferenced security-named modules.');
