import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
// Using built-in crypto API instead

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ApiKeyValidation {
  isValid: boolean;
  site_id?: string;
  company_id?: string;
  permissions?: string[];
  rate_limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle different API management endpoints
    if (pathname === '/api-management/validate-key') {
      return await validateApiKey(req, supabase);
    } else if (pathname === '/api-management/create-key') {
      return await createApiKey(req, supabase);
    } else if (pathname === '/api-management/webhook/trigger') {
      return await triggerWebhook(req, supabase);
    } else if (pathname === '/api-management/webhook/test') {
      return await testWebhook(req, supabase);
    } else if (pathname === '/api-management/api/projects') {
      return await handleProjectsApi(req, supabase);
    } else if (pathname === '/api-management/api/estimates') {
      return await handleEstimatesApi(req, supabase);
    } else if (pathname === '/api-management/api/invoices') {
      return await handleInvoicesApi(req, supabase);
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

async function validateApiKey(req: Request, supabase: any): Promise<Response> {
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
    .select('site_id, company_id, permissions, rate_limit_per_hour, is_active, expires_at')
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
      site_id: keyData.site_id,
      company_id: keyData.company_id,
      permissions: keyData.permissions,
      rate_limit: keyData.rate_limit_per_hour
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createApiKey(req: Request, supabase: any): Promise<Response> {
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

      ),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

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
      permissions: permissions || [],
      expires_at: expires_at || null,
      rate_limit_per_hour: rate_limit_per_hour || 1000,
      created_by: userData.user.id
    })
    .select()
    .single();

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

async function triggerWebhook(req: Request, supabase: any): Promise<Response> {
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
        'User-Agent': 'BuildDesk-Webhooks/1.0'
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

async function testWebhook(req: Request, supabase: any): Promise<Response> {
  const { webhook_id } = await req.json();
  
  return await triggerWebhook(
    new Request(req.url, {
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

async function handleProjectsApi(req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(req, supabase, 'projects:read');
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
        .eq('site_id', validation.site_id)
        .eq('company_id', validation.company_id);

      if (error) throw error;

      await logApiUsage(supabase, validation.keyHash!, '/api/projects', 'GET', null, null, 200);

      return new Response(
        JSON.stringify({ projects }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST') {
      const hasWritePermission = await validateApiRequest(req, supabase, 'projects:write');
      if (!hasWritePermission.isValid) {
        return hasWritePermission.response!;
      }

      const projectData = await req.json();

            const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          site_id: validation.site_id,
          company_id: validation.company_id
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

async function handleEstimatesApi(req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(req, supabase, 'estimates:read');
  if (!validation.isValid) {
    return validation.response!;
  }

  try {
        const { data: estimates, error } = await supabase
      .from('estimates')
      .select('id, estimate_number, client_name, total_amount, status, created_at')
      .eq('site_id', validation.site_id)
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

async function handleInvoicesApi(req: Request, supabase: any): Promise<Response> {
  const validation = await validateApiRequest(req, supabase, 'invoices:read');
  if (!validation.isValid) {
    return validation.response!;
  }

  try {
        const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_name, total_amount, status, due_date, created_at')
      .eq('site_id', validation.site_id)
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

async function validateApiRequest(req: Request, supabase: any, permission: string): Promise<{
  isValid: boolean;
  site_id?: string;
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
    .select('site_id, company_id, permissions, is_active, expires_at')
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
    site_id: keyData.site_id,
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