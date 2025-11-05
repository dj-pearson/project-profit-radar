import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { report_type, format = 'json', start_date, end_date, url } = await req.json();

    let reportData: any = {};
    const dateFilter = start_date && end_date ? { gte: start_date, lte: end_date } : null;

    switch (report_type) {
      case 'audit_summary': {
        let query = supabaseClient
          .from('seo_audit_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (url) query = query.eq('url', url);
        if (dateFilter) query = query.gte('created_at', start_date).lte('created_at', end_date);

        const { data: audits } = await query;

        reportData = {
          report_title: 'SEO Audit Summary Report',
          generated_at: new Date().toISOString(),
          total_audits: audits?.length || 0,
          audits: audits || [],
          summary: {
            avg_overall_score: audits?.reduce((sum, a) => sum + (a.overall_score || 0), 0) / (audits?.length || 1),
            avg_seo_score: audits?.reduce((sum, a) => sum + (a.seo_score || 0), 0) / (audits?.length || 1),
            total_critical_issues: audits?.reduce((sum, a) => sum + (a.critical_issues || 0), 0),
            total_warnings: audits?.reduce((sum, a) => sum + (a.warnings || 0), 0),
          },
        };
        break;
      }

      case 'keyword_performance': {
        const { data: keywords } = await supabaseClient
          .from('seo_keywords')
          .select('*, seo_keyword_history(*)')
          .order('created_at', { ascending: false })
          .limit(100);

        reportData = {
          report_title: 'Keyword Performance Report',
          generated_at: new Date().toISOString(),
          total_keywords: keywords?.length || 0,
          keywords: keywords || [],
          summary: {
            avg_position: keywords?.reduce((sum, k) => sum + (k.current_position || 0), 0) / (keywords?.length || 1),
            top_10_count: keywords?.filter(k => k.current_position && k.current_position <= 10).length,
            improving_count: keywords?.filter(k => k.position_change && k.position_change > 0).length,
          },
        };
        break;
      }

      case 'crawl_summary': {
        const { data: pages } = await supabaseClient
          .from('seo_crawl_results')
          .select('*')
          .order('crawled_at', { ascending: false })
          .limit(500);

        reportData = {
          report_title: 'Site Crawl Summary Report',
          generated_at: new Date().toISOString(),
          total_pages: pages?.length || 0,
          pages: pages || [],
          summary: {
            pages_with_errors: pages?.filter(p => p.status_code && p.status_code >= 400).length,
            avg_word_count: pages?.reduce((sum, p) => sum + (p.word_count || 0), 0) / (pages?.length || 1),
            pages_missing_title: pages?.filter(p => !p.title || p.title.length === 0).length,
            pages_missing_description: pages?.filter(p => !p.meta_description || p.meta_description.length === 0).length,
          },
        };
        break;
      }

      case 'performance_trends': {
        const { data: vitals } = await supabaseClient
          .from('seo_core_web_vitals')
          .select('*')
          .order('checked_at', { ascending: false })
          .limit(100);

        reportData = {
          report_title: 'Core Web Vitals Performance Trends',
          generated_at: new Date().toISOString(),
          total_checks: vitals?.length || 0,
          vitals: vitals || [],
          summary: {
            avg_lcp: vitals?.reduce((sum, v) => sum + (v.lcp || 0), 0) / (vitals?.length || 1),
            avg_fid: vitals?.reduce((sum, v) => sum + (v.fid || 0), 0) / (vitals?.length || 1),
            avg_cls: vitals?.reduce((sum, v) => sum + (v.cls || 0), 0) / (vitals?.length || 1),
            passing_count: vitals?.filter(v => v.lcp < 2500 && v.fid < 100 && v.cls < 0.1).length,
          },
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid report_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Format output
    if (format === 'csv') {
      let csv = '';
      const data = reportData.audits || reportData.keywords || reportData.pages || reportData.vitals || [];

      if (data.length > 0) {
        // Headers
        csv += Object.keys(data[0]).join(',') + '\n';

        // Rows
        for (const row of data) {
          csv += Object.values(row).map(v =>
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
          ).join(',') + '\n';
        }
      }

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${report_type}_${new Date().toISOString()}.csv"`,
        },
        status: 200
      });
    }

    // Default JSON format
    return new Response(JSON.stringify(reportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
