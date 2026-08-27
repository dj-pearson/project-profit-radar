import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { WRITABLE_PROJECT_COLUMNS, pickAllowed } from '../_shared/writable-columns.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
// Using built-in crypto API instead

// The complete set of grants an API key can carry. validateApiRequest() checks
// membership of this list, so anything outside it is dead weight on the key.
const API_PERMISSIONS = new Set([
  'projects:read', 'projects:write',
  'estimates:read',
  'invoices:read',
]);

// Per-key hourly ceiling, enforced by api-auth. Callers may request less.
const DEFAULT_API_RATE_LIMIT_PER_HOUR = 1000;
const MAX_API_RATE_LIMIT_PER_HOUR = 10000;

interface ApiKeyValidation {
  isValid: boolean;
  company_id?: string;
  permissions?: string[];
  rate_limit?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate limit: 100 req/min per IP for general API
    const clientIP = getClientIP(req);
    const rlResult = await checkRateLimit(supabase, {
      identifier: clientIP, endpoint: 'api-management', ...RATE_LIMITS.GENERAL
    });
    if (!rlResult.allowed) return rateLimitResponse(rlResult, corsHeaders);

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle different API management endpoints
    if (pathname === '/api-management/validate-key') {
      return await validateApiKey(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/create-key') {
      return await createApiKey(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/webhook/trigger') {
      return await triggerWebhook(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/webhook/test') {
      return await testWebhook(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/api/projects') {
      return await handleProjectsApi(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/api/estimates') {
      return await handleEstimatesApi(corsHeaders, req, supabase);
    } else if (pathname === '/api-management/api/invoices') {
      return await handleInvoicesApi(corsHeaders, req, supabase);
    } else {
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('API Management error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function validateApiKey(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const keyHash = await hashApiKey(apiKey);

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('company_id, permissions, rate_limit_per_hour, is_active, expires_at')
    .eq('api_key_hash', keyHash)
    .single();

  if (error || !keyData || !keyData.is_active) {
    return new Response(
      JSON.stringify({ error: 'Invalid API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'API key expired' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      company_id: keyData.company_id,
      permissions: keyData.permissions,
      rate_limit: keyData.rate_limit_per_hour
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createApiKey(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const { key_name, permissions, expires_at, rate_limit_per_hour } = await req.json();
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Authorization required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify the JWT token and get user info
  const { data: userData, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({ error: 'Invalid authorization' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate request body: key_name is required and stored on the api_keys row.
  if (!key_name || typeof key_name !== 'string' || key_name.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'key_name is required and must be a non-empty string' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // permissions reaches validateApiRequest() as the API key's grant. An unknown
  // string there matches nothing, so a typo silently mints a key that can do
  // less than its owner thinks — reject it instead of storing it.
  const grants = Array.isArray(permissions) ? permissions : [];
  const unknown = grants.filter((g: unknown) => !API_PERMISSIONS.has(g as string));
  if (unknown.length) {
    return new Response(
      JSON.stringify({
        error: `Unknown permission(s): ${unknown.join(', ')}. Valid: ${[...API_PERMISSIONS].join(', ')}`
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // api-auth enforces rate_limit_per_hour as the per-key ceiling, and this
  // value was stored verbatim — so an admin could mint a key with no practical
  // limit and use the platform as hard as they liked. Clamp it.
  const requestedRate = Number(rate_limit_per_hour);
  const rateLimit = Number.isFinite(requestedRate) && requestedRate > 0
    ? Math.min(Math.floor(requestedRate), MAX_API_RATE_LIMIT_PER_HOUR)
    : DEFAULT_API_RATE_LIMIT_PER_HOUR;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile || !['admin', 'root_admin'].includes(profile.role)) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate new API key
  const { data: newKey, error: keyGenError } = await supabase
    .rpc('generate_api_key');

  if (keyGenError || !newKey) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate API key' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const keyHash = await hashApiKey(newKey);
  const keyPrefix = newKey.substring(0, 12) + '...';

  const { data: keyRecord, error: storeError } = await supabase
    .from('api_keys')
    .insert({
      company_id: profile.company_id,
      key_name,
      api_key_hash: keyHash,
      api_key_prefix: keyPrefix,
      permissions: grants,
      expires_at: expires_at || null,
      rate_limit_per_hour: rateLimit,
      created_by: userData.user.id
    })
    .select()
    .single();

  // Audit trail (US-244): a new API key is a new credential against the
  // company's data, so record who minted it and what it can do. The key itself
  // is never logged — only its prefix, which is what the UI shows.
  if (!storeError) {
    await writeAuditLog(supabase, {
      actorUserId: userData.user.id,
      companyId: profile.company_id,
      action: 'api_key.created',
      entityType: 'api_key',
      entityId: keyRecord?.id,
      after: { key_name, key_prefix: keyPrefix, permissions: grants, rate_limit_per_hour: rateLimit },
      description: `Created API key "${key_name}" with grants: ${grants.join(', ') || 'none'}`,
      riskLevel: 'high',
    });
  }

  if (storeError) {
    return new Response(
      JSON.stringify({ error: 'Failed to store API key' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log the API key creation
  await logApiUsage(supabase, keyHash, '/api-management/create-key', 'POST', null, null, 200);

  return new Response(
    JSON.stringify({
      id: keyRecord.id,
      key_name: keyRecord.key_name,
      api_key: newKey, // Only returned once during creation
      api_key_prefix: keyPrefix,
      permissions: keyRecord.permissions,
      expires_at: keyRecord.expires_at,
      rate_limit_per_hour: keyRecord.rate_limit_per_hour,
      created_at: keyRecord.created_at
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function triggerWebhook(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const { webhook_id, event_type, payload } = await req.json();
  
  const { data: webhook, error: webhookError } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', webhook_id)
    .eq('is_active', true)
    .single();

  if (webhookError || !webhook) {
    return new Response(
      JSON.stringify({ error: 'Webhook not found or inactive' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if event type is configured for this webhook
  if (!webhook.events.includes(event_type)) {
    return new Response(
      JSON.stringify({ error: 'Event type not configured for this webhook' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Prepare webhook payload
    const webhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: payload
    };

    // Create signature for webhook security
    const signature = await createWebhookSignature(JSON.stringify(webhookPayload), webhook.secret_token);

    // Send webhook
    const startTime = Date.now();
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Brikly-Webhooks/1.0'
      },
      body: JSON.stringify(webhookPayload),
      signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
    });

    const processingTime = Date.now() - startTime;
    const responseText = await response.text();

    // Log webhook delivery
    const deliveryStatus = response.ok ? 'success' : 'failed';
    
    await supabase
      .from('webhook_delivery_logs')
      .insert({
        webhook_endpoint_id: webhook.id,
        event_type,
        payload: webhookPayload,
        delivery_status: deliveryStatus,
        response_status: response.status,
        response_body: responseText,
        delivered_at: deliveryStatus === 'success' ? new Date().toISOString() : null,
        error_message: deliveryStatus === 'failed' ? `HTTP ${response.status}: ${responseText}` : null
      });

    // Update webhook success/failure tracking
    if (response.ok) {
      await supabase
        .from('webhook_endpoints')
        .update({
          last_success_at: new Date().toISOString(),
          failure_count: 0
        })
        .eq('id', webhook.id);
    } else {
      await supabase
        .from('webhook_endpoints')
        .update({
          last_failure_at: new Date().toISOString(),
          failure_count: webhook.failure_count + 1
        })
        .eq('id', webhook.id);
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        processing_time_ms: processingTime,
        delivery_id: webhook.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook delivery error:', error);
    
    // Log failed delivery
    await supabase
      .from('webhook_delivery_logs')
      .insert({
        webhook_endpoint_id: webhook.id,
        event_type,
        payload: { event: event_type, data: payload },
        delivery_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

    return new Response(
      JSON.stringify({ error: 'Webhook delivery failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function testWebhook(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const { webhook_id } = await req.json();
  
  return await triggerWebhook(
    corsHeaders, new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        webhook_id,
        event_type: 'webhook.test',
        payload: {
          message: 'This is a test webhook delivery',
          timestamp: new Date().toISOString()
        }
      })
    }),
    supabase
  );
}

async function handleProjectsApi(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(corsHeaders, req, supabase, 'projects:read');
  if (!validation.isValid) {
    return validation.response!;
  }

  const url = new URL(req.url);
  const method = req.method;

  try {
    if (method === 'GET') {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, status, budget, start_date, end_date, completion_percentage, created_at')
        .eq('company_id', validation.company_id);

      if (error) throw error;

      await logApiUsage(supabase, validation.keyHash!, '/api/projects', 'GET', null, null, 200);

      return new Response(
        JSON.stringify({ projects }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST') {
      const hasWritePermission = await validateApiRequest(corsHeaders, req, supabase, 'projects:write');
      if (!hasWritePermission.isValid) {
        return hasWritePermission.response!;
      }

      const projectData = await req.json();

      // This handler runs on the SERVICE ROLE key, so RLS is not a backstop:
      // whatever the body carries reaches Postgres. Spreading it let an API-key
      // holder set id, created_by, created_at and — worse — site_id and
      // tenant_id, which are tenancy columns. Allowlist the caller-settable
      // columns and derive the tenancy ones from the key's own company.
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('site_id')
        .eq('id', validation.company_id)
        .single();

      if (companyError || !company) {
        return new Response(
          JSON.stringify({ error: 'Could not resolve company for this API key' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          ...pickAllowed(projectData, WRITABLE_PROJECT_COLUMNS),
          company_id: validation.company_id,
          site_id: company.site_id
        })
        .select()
        .single();

      if (error) throw error;

      await logApiUsage(supabase, validation.keyHash!, '/api/projects', 'POST', null, null, 201);

      return new Response(
        JSON.stringify({ project: newProject }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Projects API error:', error);
    await logApiUsage(supabase, validation.keyHash!, '/api/projects', method, null, null, 500);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleEstimatesApi(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(corsHeaders, req, supabase, 'estimates:read');
  if (!validation.isValid) {
    return validation.response!;
  }

  try {
    const { data: estimates, error } = await supabase
      .from('estimates')
      .select('id, estimate_number, client_name, total_amount, status, created_at')
      .eq('company_id', validation.company_id);

    if (error) throw error;

    await logApiUsage(supabase, validation.keyHash!, '/api/estimates', 'GET', null, null, 200);

    return new Response(
      JSON.stringify({ estimates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Estimates API error:', error);
    await logApiUsage(supabase, validation.keyHash!, '/api/estimates', 'GET', null, null, 500);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleInvoicesApi(corsHeaders: Record<string, string>, req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(corsHeaders, req, supabase, 'invoices:read');
  if (!validation.isValid) {
    return validation.response!;
  }

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_name, total_amount, status, due_date, created_at')
      .eq('company_id', validation.company_id);

    if (error) throw error;

    await logApiUsage(supabase, validation.keyHash!, '/api/invoices', 'GET', null, null, 200);

    return new Response(
      JSON.stringify({ invoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Invoices API error:', error);
    await logApiUsage(supabase, validation.keyHash!, '/api/invoices', 'GET', null, null, 500);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function validateApiRequest(corsHeaders: Record<string, string>, req: Request, supabase: any, permission: string): Promise<{
  isValid: boolean;
  company_id?: string;
  keyHash?: string;
  response?: Response;
}> {
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return {
      isValid: false,
      response: new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  const keyHash = await hashApiKey(apiKey);

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('company_id, permissions, is_active, expires_at')
    .eq('api_key_hash', keyHash)
    .single();

  if (error || !keyData || !keyData.is_active) {
    return {
      isValid: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return {
      isValid: false,
      response: new Response(
        JSON.stringify({ error: 'API key expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  // Check permissions
  if (!keyData.permissions.includes(permission)) {
    return {
      isValid: false,
      response: new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  return {
    isValid: true,
    company_id: keyData.company_id,
    keyHash
  };
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logApiUsage(
  supabase: any,
  keyHash: string,
  endpoint: string,
  method: string,
  ipAddress: string | null,
  userAgent: string | null,
  responseStatus: number
): Promise<void> {
  try {
    await supabase.rpc('log_api_usage', {
      p_api_key_hash: keyHash,
      p_endpoint: endpoint,
      p_method: method,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_response_status: responseStatus
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}