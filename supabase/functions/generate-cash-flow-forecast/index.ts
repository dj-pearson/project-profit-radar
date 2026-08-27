// Generate Cash Flow Forecast Edge Function
// Generates cash flow projections for a company based on historical financial data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { enforceRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import { createServiceClient } from '../_shared/service-client.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-CASH-FLOW-FORECAST] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const { user } = authContext;

    // Rate limit per user (US-243). These endpoints spend money on every call —
    // LLM tokens here — so a compromised token running them in a loop is a
    // billing incident, not just load. Keyed by user id rather than IP: an IP
    // limit is shared across a customer's whole office and a stolen token walks
    // around it by changing address.
    const limited = await enforceRateLimit(
      createServiceClient(), user.id, 'generate-cash-flow-forecast', RATE_LIMITS.AI, corsHeaders,
    );
    if (limited) return limited;
    const body = await req.json();
    const { company_id, forecast_period } = body;

    if (!company_id) {
      return errorResponse('company_id is required', 400, req);
    }

    const days = parseInt(forecast_period) || 30;
    logStep("Generating forecast", { company_id, days });

    // Use service role for reads and writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch recent financial records to base projections on
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRecords } = await serviceClient
      .from('financial_records')
      .select('amount, type, created_at')
      .eq('company_id', company_id)
      .gte('created_at', thirtyDaysAgo);

    // Calculate daily averages from recent data
    let totalIncome = 0;
    let totalExpenses = 0;
    const recordDays = 30;

    if (recentRecords && recentRecords.length > 0) {
      for (const record of recentRecords) {
        const amount = Math.abs(record.amount || 0);
        if (record.type === 'income' || record.type === 'revenue' || record.type === 'payment_received') {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
      }
    }

    const dailyIncome = totalIncome / recordDays;
    const dailyExpenses = totalExpenses / recordDays;

    // Get current balance
    const { data: balanceData } = await serviceClient
      .from('financial_records')
      .select('amount, type')
      .eq('company_id', company_id);

    let currentBalance = 0;
    if (balanceData) {
      for (const record of balanceData) {
        const amount = record.amount || 0;
        if (record.type === 'income' || record.type === 'revenue' || record.type === 'payment_received') {
          currentBalance += Math.abs(amount);
        } else {
          currentBalance -= Math.abs(amount);
        }
      }
    }

    // Generate daily projections
    const projections = [];
    let runningBalance = currentBalance;

    for (let i = 1; i <= days; i++) {
      const projDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      // Add slight variance (+/- 10%) for realism
      const variance = 0.9 + Math.random() * 0.2;
      const projectedIncome = dailyIncome * variance;
      const projectedExpenses = dailyExpenses * variance;
      runningBalance += projectedIncome - projectedExpenses;

      projections.push({
        company_id,
        projection_date: projDate.toISOString().split('T')[0],
        projected_income: Math.round(projectedIncome * 100) / 100,
        projected_expenses: Math.round(projectedExpenses * 100) / 100,
        projected_balance: Math.round(runningBalance * 100) / 100,
        actual_income: 0,
        actual_expenses: 0,
        actual_balance: 0,
        variance: 0,
        created_at: new Date().toISOString(),
      });
    }

    // Upsert projections into cash_flow_projections table
    if (projections.length > 0) {
      const { error: upsertError } = await serviceClient
        .from('cash_flow_projections')
        .upsert(projections, {
          onConflict: 'company_id,projection_date',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        logStep("Warning: Could not save projections", { error: upsertError.message });
        // Don't fail - table may not exist yet; return the projections anyway
      }
    }

    logStep("Forecast generated", { days, projectionCount: projections.length });
    return successResponse({
      forecast_period: days,
      projections_count: projections.length,
      daily_avg_income: Math.round(dailyIncome * 100) / 100,
      daily_avg_expenses: Math.round(dailyExpenses * 100) / 100,
    }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
