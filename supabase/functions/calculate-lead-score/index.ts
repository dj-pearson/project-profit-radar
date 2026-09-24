// Calculate Lead Score Edge Function
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Two callers, two shapes: LeadTrackingDashboard sends { leadId, companyId },
// useLeadScore (src/hooks/useCRM.ts) sends { lead_id } alone.
const LeadScoreSchema = z.object({
  leadId: z.string().uuid().nullish(),
  lead_id: z.string().uuid().nullish(),
  companyId: z.string().uuid().nullish(),
}).passthrough();

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
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log(`[CALCULATE-LEAD-SCORE] User authenticated: ${user.id}`);

    const parsed = await validateBody(req, LeadScoreSchema, { name: 'calculate-lead-score' });
    if (!parsed.ok) return parsed.response;
    const leadId = parsed.data.leadId ?? parsed.data.lead_id;
    const companyId = parsed.data.companyId;

    // companyId used to be required, which 400'd every call from useLeadScore.
    // It only ever narrowed a lookup that RLS already scopes to the caller.
    if (!leadId) {
      return errorResponse('Lead ID is required', 400);
    }

    // Get the lead data
    let leadQuery = supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId);
    if (companyId) leadQuery = leadQuery.eq('company_id', companyId);
    const { data: lead, error: leadError } = await leadQuery.single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return errorResponse('Lead not found or access denied', 404);
    }

    // Get scoring rules for the company (system rules + company-specific rules)
    const { data: scoringRules, error: rulesError } = await supabaseClient
      .from('lead_scoring_rules')
      .select('*')
      // The lead row's company, not the body's: the body value went into this
      // filter string unescaped, so a crafted companyId could append filters.
      .or(`is_system_rule.eq.true,company_id.eq.${lead.company_id}`)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching scoring rules:', rulesError);
      return errorResponse('Failed to fetch scoring rules', 500);
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
        
        case 'greater_than': {
          const numValue = parseFloat(fieldValue);
          const conditionNum = parseFloat(rule.condition_value);
          ruleApplies = !isNaN(numValue) && !isNaN(conditionNum) && numValue > conditionNum;
          break;
        }
        
        case 'less_than': {
          const numValueLt = parseFloat(fieldValue);
          const conditionNumLt = parseFloat(rule.condition_value);
          ruleApplies = !isNaN(numValueLt) && !isNaN(conditionNumLt) && numValueLt < conditionNumLt;
          break;
        }
        
        case 'contains':
          ruleApplies = fieldValue && typeof fieldValue === 'string' && 
                       fieldValue.toLowerCase().includes(rule.condition_value.toLowerCase());
          break;
        
        case 'not_empty':
          ruleApplies = fieldValue && fieldValue !== '' && fieldValue !== null;
          break;
        
        case 'in_range': {
          // Expect condition_value to be like "min,max"
          const [min, max] = rule.condition_value.split(',').map((v: string) => parseFloat(v.trim()));
          const rangeValue = parseFloat(fieldValue);
          ruleApplies = !isNaN(rangeValue) && !isNaN(min) && !isNaN(max) && 
                       rangeValue >= min && rangeValue <= max;
          break;
        }
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
      return errorResponse('Failed to update lead score', 500);
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

    // Update lead quality if it has changed. The error was discarded and
    // supabase-js returns it rather than throwing, so the response below could
    // report a lead promoted to sales_qualified while the row still said
    // marketing_qualified - and routing, alerts and the pipeline view all read
    // the row (US-300).
    if (lead.lead_quality !== leadQuality) {
      const { error: qualityError } = await supabaseClient
        .from('leads')
        .update({ lead_quality: leadQuality })
        .eq('id', leadId);

      if (qualityError) {
        throw new Error(
          `Lead ${leadId} scored ${totalScore} (${leadQuality}) but the new quality was NOT stored: ${qualityError.message}`,
        );
      }
    }

    console.log(`Calculated score for lead ${leadId}: ${totalScore} points`);

    return successResponse({
      leadId,
      score: totalScore,
      previousScore: lead.lead_score || 0,
      quality: leadQuality,
      appliedRules,
      rulesCount: scoringRules?.length || 0
    });

  } catch (error) {
    await captureException(error, { fn: 'calculate-lead-score', req });
    console.error('Error in calculate-lead-score function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(errorMessage, 500);
  }
});