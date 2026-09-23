import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { describeAuditUrl } from '../_shared/audit-url-rules.ts';
import { errorResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import {
  generateVerificationToken,
  normalizeDomain,
  resolveTxt,
  txtMatchesToken,
  verificationRecordName,
} from '../_shared/domain-verification.ts';

// verify-domain proves a tenant controls its custom domain.
//
// It used to be public (on the anon key) with a service-role client, took
// tenant_id from the body, and marked the domain verified if an HTTP HEAD to
// it answered. Anyone could set any tenant's custom_domain to any site that
// was up. Now:
//
//   * the caller is a signed-in admin/root_admin, identified by auth.getUser;
//   * the tenant is the caller's own company's tenant (a root_admin may name
//     another one from /admin/tenants);
//   * the domain checked is the one already saved on the tenant - this
//     function never writes custom_domain;
//   * ownership is a TXT record at _brikly-verify.<domain> holding a token the
//     company was issued here (_shared/domain-verification.ts).
//
// action 'challenge' returns the record to publish (creating the token once).
// action 'verify' (the default, which is what older web builds send) checks
// DNS. Older builds send { tenant_id, domain } and read { verified, message }
// at the top level, so both are still accepted and still returned.

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// Every field is optional: older clients send tenant_id + domain, newer ones
// send action. tenant_id and domain are checked against the caller's profile
// and the saved tenant row, never trusted.
const VerifyDomainSchema = z.object({
  action: z.enum(['challenge', 'verify']).optional(),
  tenant_id: z.string().uuid().optional(),
  domain: z
    .string()
    .max(300)
    .regex(/^(?:https?:\/\/)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\/?$/, 'must be a bare hostname')
    .refine(
      (d) => describeAuditUrl(`https://${d.replace(/^https?:\/\//, '').replace(/\/$/, '')}`) === null,
      'host is loopback, private or link-local',
    )
    .optional(),
}).passthrough();

type VerifyDomainRequest = z.infer<typeof VerifyDomainSchema>;

const ADMIN_ROLES = new Set(['admin', 'root_admin']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, req);

  const reply = (payload: {
    verified: boolean;
    message: string;
    domain: string;
    record_name: string;
    record_value: string | null;
  }) =>
    new Response(
      JSON.stringify({
        success: true,
        // Top-level verified/message are what web builds before this change read.
        verified: payload.verified,
        message: payload.message,
        data: { ...payload, record_type: 'TXT' },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return errorResponse('Unauthorized', 401, req);
    const supabase = createServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return errorResponse('Unauthorized', 401, req);

    // Each verify is two outbound DoH requests; a signed-in admin has no reason
    // to press the button more than a few times a minute.
    const rl = await checkRateLimit(supabase, {
      identifier: user.id,
      endpoint: 'verify-domain',
      maxRequests: 20,
      windowMinutes: 10,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const parsed = await validateBody(req, VerifyDomainSchema, { name: 'verify-domain', allowEmpty: true });
    if (!parsed.ok) return parsed.response;
    const body = (parsed.data ?? {}) as VerifyDomainRequest;
    const action = body.action ?? 'verify';

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('[VERIFY-DOMAIN] profile lookup failed:', profileError.message);
      return safeErrorResponse(req);
    }
    const companyId = (profile?.company_id as string | null) ?? null;
    const role = String(profile?.role ?? '');
    if (!ADMIN_ROLES.has(role)) {
      return errorResponse('Only administrators can verify a custom domain', 403, req);
    }
    if (!companyId) return errorResponse('Your account is not attached to a company', 403, req);

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('tenant_id')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) {
      console.error('[VERIFY-DOMAIN] company lookup failed:', companyError.message);
      return safeErrorResponse(req);
    }
    const ownTenantId = (company?.tenant_id as string | null) ?? null;

    // The tenant acted on comes from the profile. A body tenant_id is accepted
    // when it agrees, and from a root_admin (who runs /admin/tenants) when it
    // does not; anyone else gets 403.
    let tenantId = ownTenantId;
    if (body.tenant_id && body.tenant_id !== ownTenantId) {
      if (role !== 'root_admin') {
        return errorResponse('tenant_id does not match your company', 403, req);
      }
      tenantId = body.tenant_id;
    }
    if (!tenantId) return errorResponse('Your company has no tenant to attach a domain to', 404, req);
    const crossTenant = tenantId !== ownTenantId;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, custom_domain, domain_verified')
      .eq('id', tenantId)
      .maybeSingle();
    if (tenantError) {
      console.error('[VERIFY-DOMAIN] tenant lookup failed:', tenantError.message);
      return safeErrorResponse(req);
    }
    if (!tenant) return errorResponse('Tenant not found', 404, req);

    // The domain is the one saved on the tenant. The body copy, if sent, must
    // agree: verifying one name and marking another verified is the old bug.
    const domain = normalizeDomain(tenant.custom_domain);
    if (!domain) return errorResponse('Save a custom domain before verifying it', 400, req);
    if (body.domain !== undefined && normalizeDomain(body.domain) !== domain) {
      return errorResponse('domain does not match the domain saved for this tenant', 409, req);
    }
    const recordName = verificationRecordName(domain);

    // Tokens that prove this tenant's claim: the caller's own company's, or,
    // for a root_admin acting on another tenant, those of that tenant's
    // companies (issued to their admins from Settings > Custom Domain).
    let tokenCompanyIds: string[] = [companyId];
    if (crossTenant) {
      const { data: tenantCompanies, error: tcError } = await supabase
        .from('companies')
        .select('id')
        .eq('tenant_id', tenantId);
      if (tcError) {
        console.error('[VERIFY-DOMAIN] tenant company lookup failed:', tcError.message);
        return safeErrorResponse(req);
      }
      tokenCompanyIds = (tenantCompanies ?? []).map((c: { id: string }) => c.id);
    }

    // Issue the caller's own company a token if it has none. Only this
    // function writes the table (RLS gives clients read-only access), so a
    // company can never pick a token copied from someone else's public DNS.
    if (!crossTenant) {
      const { error: issueError } = await supabase
        .from('domain_verification_tokens')
        .upsert(
          { company_id: companyId, token: generateVerificationToken(), created_by: user.id },
          { onConflict: 'company_id', ignoreDuplicates: true },
        );
      if (issueError) {
        console.error('[VERIFY-DOMAIN] token issue failed:', issueError.message);
        return safeErrorResponse(req);
      }
    }

    const { data: tokenRows, error: tokenError } = tokenCompanyIds.length === 0
      ? { data: [], error: null }
      : await supabase
        .from('domain_verification_tokens')
        .select('company_id, token')
        .in('company_id', tokenCompanyIds);
    if (tokenError) {
      console.error('[VERIFY-DOMAIN] token lookup failed:', tokenError.message);
      return safeErrorResponse(req);
    }
    const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);
    const ownToken = (tokenRows ?? []).find((r: { company_id: string }) => r.company_id === companyId)?.token ?? null;
    const recordValue = crossTenant ? null : ownToken;
    const instructions = recordValue
      ? `Add a TXT record named ${recordName} with the value ${recordValue}, wait for DNS to update, then verify again.`
      : `The tenant's administrator has to add the TXT record shown in Settings > Custom Domain at ${recordName}.`;

    if (action === 'challenge') {
      if (crossTenant) {
        return errorResponse('Only the tenant\'s own administrators can fetch its verification record', 403, req);
      }
      return reply({
        verified: tenant.domain_verified === true,
        message: tenant.domain_verified === true ? 'Domain is verified' : instructions,
        domain,
        record_name: recordName,
        record_value: recordValue,
      });
    }

    if (tokens.length === 0) {
      return reply({ verified: false, message: instructions, domain, record_name: recordName, record_value: recordValue });
    }

    const lookup = await resolveTxt(recordName, fetch);
    if (!lookup.ok) {
      console.error(`[VERIFY-DOMAIN] TXT lookup for ${recordName} failed:`, lookup.error);
      return reply({
        verified: false,
        message: 'The DNS lookup did not complete. Please try again in a minute.',
        domain,
        record_name: recordName,
        record_value: recordValue,
      });
    }
    if (!txtMatchesToken(lookup.records, tokens)) {
      return reply({
        verified: false,
        message: lookup.records.length === 0
          ? `No TXT record found at ${recordName}. ${instructions}`
          : `The TXT record at ${recordName} does not match. ${instructions}`,
        domain,
        record_name: recordName,
        record_value: recordValue,
      });
    }

    // One verified owner per domain. A stale claim held by another tenant is a
    // support case, not something to overwrite silently.
    const { data: others, error: othersError } = await supabase
      .from('tenants')
      .select('id')
      .ilike('custom_domain', domain)
      .eq('domain_verified', true)
      .neq('id', tenant.id)
      .limit(1);
    if (othersError) {
      console.error('[VERIFY-DOMAIN] duplicate-claim lookup failed:', othersError.message);
      return safeErrorResponse(req);
    }
    if ((others ?? []).length > 0) {
      return errorResponse('This domain is already verified for another account. Contact support@brikly.net.', 409, req);
    }

    // Guarded on the saved value, so a domain changed between the read above
    // and this write is not marked verified on the strength of the old one.
    const { data: updated, error: updateError } = await supabase
      .from('tenants')
      .update({ domain_verified: true })
      .eq('id', tenant.id)
      .eq('custom_domain', tenant.custom_domain)
      .select('id');
    if (updateError) {
      console.error('[VERIFY-DOMAIN] tenant update failed:', updateError.message);
      return safeErrorResponse(req);
    }
    if (!updated || updated.length === 0) {
      return errorResponse('The saved domain changed while verifying. Reload and try again.', 409, req);
    }

    // Domain verification is what lets a tenant claim an email domain for SSO,
    // so this row is the evidence of who verified what and when (US-300).
    await writeAuditLog(supabase, {
      actorUserId: user.id,
      companyId,
      action: 'domain.verified',
      entityType: 'tenant',
      entityId: tenant.id,
      after: { domain, domain_verified: true, method: 'dns_txt', record_name: recordName, cross_tenant: crossTenant },
      description: `Custom domain ${domain} verified by DNS TXT for tenant ${tenant.id}`,
      riskLevel: 'high',
    });

    return reply({
      verified: true,
      message: 'Domain ownership verified',
      domain,
      record_name: recordName,
      record_value: recordValue,
    });
  } catch (error) {
    console.error('[VERIFY-DOMAIN] unhandled error:', error);
    return safeErrorResponse(req);
  }
});
