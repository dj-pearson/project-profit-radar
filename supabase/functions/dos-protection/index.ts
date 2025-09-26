import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DosSettings {
  enabled: boolean;
  auto_block_threshold: number;
  block_duration_hours: number;
  detection_window_minutes: number;
  whitelist_enabled: boolean;
  geo_blocking_enabled: boolean;
  challenge_response_enabled: boolean;
}

interface AttackPattern {
  ip_address: string;
  request_count: number;
  last_request: string;
  attack_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'get_settings':
        return await getSettings(supabaseClient);
      
      case 'update_settings':
        return await updateSettings(supabaseClient, params.settings);
      
      case 'get_metrics':
        return await getAttackMetrics(supabaseClient);
      
      case 'block_ip':
        return await blockIP(supabaseClient, params.ip_address, params.reason);
      
      case 'unblock_ip':
        return await unblockIP(supabaseClient, params.ip_address);
      
      case 'whitelist_ip':
        return await whitelistIP(supabaseClient, params.ip_address);
      
      case 'analyze_traffic':
        return await analyzeTraffic(supabaseClient, params.time_window);
      
      case 'detect_attacks':
        return await detectAttacks(supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('DOS Protection Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getSettings(supabase: any) {
  // Get DOS protection settings from a configuration table or environment
  const defaultSettings: DosSettings = {
    enabled: true,
    auto_block_threshold: 100,
    block_duration_hours: 24,
    detection_window_minutes: 5,
    whitelist_enabled: false,
    geo_blocking_enabled: false,
    challenge_response_enabled: false,
  };

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'dos_protection')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const settings = data?.setting_value || defaultSettings;

    return new Response(
      JSON.stringify({ settings }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ settings: defaultSettings }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function updateSettings(supabase: any, settings: DosSettings) {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: 'dos_protection',
      setting_value: settings,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getAttackMetrics(supabase: any) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get attack statistics
  const { data: violations, error: violationsError } = await supabase
    .from('rate_limit_violations')
    .select('*')
    .gte('created_at', twentyFourHoursAgo);

  if (violationsError) throw violationsError;

  // Get blocked IPs count
  const { data: blockedIPs, error: blockedError } = await supabase
    .from('ip_access_control')
    .select('*')
    .eq('access_type', 'blacklist')
    .eq('is_active', true);

  if (blockedError) throw blockedError;

  // Analyze attack patterns
  const attackTypes = violations?.reduce((acc: any, violation: any) => {
    const type = determineAttackType(violation);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  const topAttackTypes = Object.entries(attackTypes)
    .map(([type, count]) => ({ type, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Determine threat level
  const totalAttacks = violations?.length || 0;
  let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (totalAttacks > 1000) threatLevel = 'critical';
  else if (totalAttacks > 500) threatLevel = 'high';
  else if (totalAttacks > 100) threatLevel = 'medium';

  const metrics = {
    total_attacks_24h: totalAttacks,
    blocked_ips_count: blockedIPs?.length || 0,
    top_attack_types: topAttackTypes,
    current_threat_level: threatLevel,
  };

  return new Response(
    JSON.stringify({ metrics }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function blockIP(supabase: any, ipAddress: string, reason: string) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('ip_access_control')
    .insert({
      ip_address: ipAddress,
      access_type: 'blacklist',
      reason: reason,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true,
    });

  if (error) throw error;

  // Log the blocking action
  await supabase
    .from('security_events')
    .insert({
      event_type: 'ip_blocked',
      severity: 'high',
      description: `IP ${ipAddress} blocked: ${reason}`,
      metadata: { ip_address: ipAddress, reason },
    });

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function unblockIP(supabase: any, ipAddress: string) {
  const { error } = await supabase
    .from('ip_access_control')
    .update({ is_active: false })
    .eq('ip_address', ipAddress)
    .eq('access_type', 'blacklist');

  if (error) throw error;

  // Log the unblocking action
  await supabase
    .from('security_events')
    .insert({
      event_type: 'ip_unblocked',
      severity: 'info',
      description: `IP ${ipAddress} unblocked`,
      metadata: { ip_address: ipAddress },
    });

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function whitelistIP(supabase: any, ipAddress: string) {
  const { error } = await supabase
    .from('ip_access_control')
    .insert({
      ip_address: ipAddress,
      access_type: 'whitelist',
      reason: 'Manual whitelist',
      created_at: new Date().toISOString(),
      is_active: true,
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function analyzeTraffic(supabase: any, timeWindow = 60) {
  const windowStart = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();

  // Analyze rate limit violations for patterns
  const { data: violations, error } = await supabase
    .from('rate_limit_violations')
    .select('*')
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by IP and analyze patterns
  const ipPatterns: { [key: string]: AttackPattern } = {};

  violations?.forEach((violation: any) => {
    const ip = violation.ip_address;
    if (!ipPatterns[ip]) {
      ipPatterns[ip] = {
        ip_address: ip,
        request_count: 0,
        last_request: violation.created_at,
        attack_type: determineAttackType(violation),
        severity: 'low' as const,
      };
    }
    ipPatterns[ip].request_count += violation.requests_made;
    ipPatterns[ip].last_request = violation.created_at;
  });

  // Determine severity for each IP
  Object.values(ipPatterns).forEach(pattern => {
    if (pattern.request_count > 1000) pattern.severity = 'critical';
    else if (pattern.request_count > 500) pattern.severity = 'high';
    else if (pattern.request_count > 100) pattern.severity = 'medium';
  });

  const suspiciousPatterns = Object.values(ipPatterns)
    .filter(pattern => pattern.severity !== 'low')
    .sort((a, b) => b.request_count - a.request_count);

  return new Response(
    JSON.stringify({ patterns: suspiciousPatterns }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function detectAttacks(supabase: any) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Check for rapid fire attacks (high frequency from single IP)
  const { data: recentViolations, error } = await supabase
    .rpc('detect_rapid_fire_attacks', {
      time_window: fiveMinutesAgo,
      threshold: 50
    });

  if (error) {
    console.error('Error detecting attacks:', error);
    // Fallback to manual detection
    const { data: violations } = await supabase
      .from('rate_limit_violations')
      .select('*')
      .gte('created_at', fiveMinutesAgo);

    // Manual analysis
    const ipCounts: { [key: string]: number } = {};
    violations?.forEach((v: any) => {
      ipCounts[v.ip_address] = (ipCounts[v.ip_address] || 0) + 1;
    });

    const attacks = Object.entries(ipCounts)
      .filter(([_, count]) => count > 10)
      .map(([ip, count]) => ({ ip_address: ip, attack_count: count }));

    return new Response(
      JSON.stringify({ attacks }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({ attacks: recentViolations || [] }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function determineAttackType(violation: any): string {
  if (violation.endpoint?.includes('/login')) return 'Brute Force Login';
  if (violation.endpoint?.includes('/api/')) return 'API Abuse';
  if (violation.endpoint?.includes('/upload')) return 'Upload Flooding';
  if (violation.requests_made > 1000) return 'DDoS Attempt';
  if (violation.requests_made > 100) return 'Rate Limit Abuse';
  return 'Suspicious Activity';
}