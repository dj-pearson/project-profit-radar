import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoringRule {
  id: string;
  rule_name: string;
  rule_category: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  score_points: number;
  is_active: boolean;
}

interface Lead {
  id: string;
  company_id: string;
  estimated_budget?: number;
  decision_maker?: boolean;
  financing_secured?: boolean;
  project_timeline?: string;
  phone?: string;
  company_name?: string;
  lead_source?: string;
  contact_method?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { leadId, companyId } = await req.json();

    if (!leadId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID and Company ID are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the lead data
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get scoring rules for the company (system rules + company-specific rules)
    const { data: scoringRules, error: rulesError } = await supabaseClient
      .from('lead_scoring_rules')
      .select('*')
      .or(`is_system_rule.eq.true,company_id.eq.${companyId}`)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching scoring rules:', rulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scoring rules' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate the lead score
    let totalScore = 0;
    const appliedRules: any[] = [];

    for (const rule of scoringRules || []) {
      const fieldValue = lead[rule.condition_field];
      let ruleApplies = false;

      // Evaluate the rule condition
      switch (rule.condition_operator) {
        case 'equals':
          if (rule.condition_value === 'true' || rule.condition_value === 'false') {
            ruleApplies = fieldValue === (rule.condition_value === 'true');
          } else {
            ruleApplies = fieldValue === rule.condition_value;
          }
          break;
        
        case 'greater_than':
          const numValue = parseFloat(fieldValue);
          const conditionNum = parseFloat(rule.condition_value);
          ruleApplies = !isNaN(numValue) && !isNaN(conditionNum) && numValue > conditionNum;
          break;
        
        case 'less_than':
          const numValueLt = parseFloat(fieldValue);
          const conditionNumLt = parseFloat(rule.condition_value);
          ruleApplies = !isNaN(numValueLt) && !isNaN(conditionNumLt) && numValueLt < conditionNumLt;
          break;
        
        case 'contains':
          ruleApplies = fieldValue && typeof fieldValue === 'string' && 
                       fieldValue.toLowerCase().includes(rule.condition_value.toLowerCase());
          break;
        
        case 'not_empty':
          ruleApplies = fieldValue && fieldValue !== '' && fieldValue !== null;
          break;
        
        case 'in_range':
          // Expect condition_value to be like "min,max"
          const [min, max] = rule.condition_value.split(',').map((v: string) => parseFloat(v.trim()));
          const rangeValue = parseFloat(fieldValue);
          ruleApplies = !isNaN(rangeValue) && !isNaN(min) && !isNaN(max) && 
                       rangeValue >= min && rangeValue <= max;
          break;
      }

      if (ruleApplies) {
        totalScore += rule.score_points;
        appliedRules.push({
          rule_name: rule.rule_name,
          category: rule.rule_category,
          points: rule.score_points,
          condition: `${rule.condition_field} ${rule.condition_operator} ${rule.condition_value}`
        });
      }
    }

    // Ensure score doesn't go below 0
    totalScore = Math.max(0, totalScore);

    // Update the lead with the new score
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({ 
        lead_score: totalScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead score:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead score' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine lead quality based on score
    let leadQuality = 'unqualified';
    if (totalScore >= 80) {
      leadQuality = 'opportunity';
    } else if (totalScore >= 60) {
      leadQuality = 'sales_qualified';
    } else if (totalScore >= 40) {
      leadQuality = 'marketing_qualified';
    }

    // Update lead quality if it has changed
    if (lead.lead_quality !== leadQuality) {
      await supabaseClient
        .from('leads')
        .update({ lead_quality: leadQuality })
        .eq('id', leadId);
    }

    console.log(`Calculated score for lead ${leadId}: ${totalScore} points`);

    return new Response(
      JSON.stringify({
        leadId,
        score: totalScore,
        previousScore: lead.lead_score || 0,
        quality: leadQuality,
        appliedRules,
        rulesCount: scoringRules?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in calculate-lead-score function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});