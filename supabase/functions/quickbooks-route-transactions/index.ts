// QuickBooks Route Transactions Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoutingRule {
  id: string;
  name: string;
  field_type: string;
  match_type: string;
  match_value: string;
  project_id: string;
  cost_code_id?: string;
  priority: number;
  confidence_threshold: number;
  case_sensitive: boolean;
  exclude_patterns?: string[];
}

interface UnroutedTransaction {
  id: string;
  qb_transaction_id: string;
  qb_transaction_type: string;
  description?: string;
  memo?: string;
  reference_number?: string;
  amount: number;
  customer_name?: string;
  vendor_name?: string;
  qb_class?: string;
  qb_location?: string;
  line_items?: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authContext;
    console.log("[QUICKBOOKS-ROUTE] User authenticated", { userId: user.id });

    const { action, company_id, transaction_id, manual_assignment } = await req.json();

    switch (action) {
      case 'process_single':
        return await processSingleTransaction(supabase, company_id, transaction_id);

      case 'process_batch':
        return await processBatchTransactions(supabase, company_id);

      case 'manual_assign':
        return await manualAssignment(supabase, transaction_id, manual_assignment);

      case 'import_qb_transactions':
        return await importQuickBooksTransactions(supabase, company_id);

      default:
        throw new Error("Invalid action specified");
    }

  } catch (error) {
    console.error("Error in QuickBooks routing:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function processSingleTransaction(supabase: any, companyId: string, transactionId: string) {
  // Get transaction details
  const { data: transaction, error: transactionError } = await supabase
    .from('quickbooks_unrouted_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('company_id', companyId)
    .single();

  if (transactionError || !transaction) {
    throw new Error('Transaction not found');
  }

  // Get active routing rules
  const { data: rules, error: rulesError } = await supabase
    .from('quickbooks_routing_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (rulesError) {
    throw new Error('Failed to load routing rules');
  }

  // Apply routing logic
  const bestMatch = await findBestMatch(transaction, rules || []);

  if (bestMatch) {
    const { error: updateError } = await supabase
      .from('quickbooks_unrouted_transactions')
      .update({
        suggested_project_id: bestMatch.project_id,
        suggested_cost_code_id: bestMatch.cost_code_id,
        suggestion_confidence: bestMatch.confidence,
        matched_rule_id: bestMatch.rule_id,
        routing_status: bestMatch.confidence >= 90 ? 'auto_matched' : 'review_needed',
        needs_review: bestMatch.confidence < 90,
        suggestion_reason: bestMatch.reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error('Failed to update transaction');
    }

    // Log the routing event
    await logRoutingEvent(supabase, {
      company_id: companyId,
      transaction_id: transactionId,
      qb_transaction_id: transaction.qb_transaction_id,
      event_type: 'auto_matched',
      to_project_id: bestMatch.project_id,
      to_cost_code_id: bestMatch.cost_code_id,
      applied_rule_id: bestMatch.rule_id,
      confidence_score: bestMatch.confidence
    });

    return new Response(
      JSON.stringify({
        success: true,
        matched: true,
        suggestion: bestMatch,
        message: `Transaction routed with ${bestMatch.confidence}% confidence`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      matched: false,
      message: "No routing rules matched this transaction"
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

async function processBatchTransactions(supabase: any, companyId: string) {
  let processedCount = 0;
  let autoAssignedCount = 0;
  let reviewRequiredCount = 0;
  let errorCount = 0;

  // Get all unrouted transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from('quickbooks_unrouted_transactions')
    .select('*')
    .eq('company_id', companyId)
    .eq('routing_status', 'unrouted');

  if (transactionsError) {
    throw new Error('Failed to load unrouted transactions');
  }

  // Get active routing rules
  const { data: rules, error: rulesError } = await supabase
    .from('quickbooks_routing_rules')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (rulesError) {
    throw new Error('Failed to load routing rules');
  }

  // Process each transaction
  for (const transaction of transactions || []) {
    try {
      processedCount++;

      const bestMatch = await findBestMatch(transaction, rules || []);

      if (bestMatch) {
        // Update transaction
        await supabase
          .from('quickbooks_unrouted_transactions')
          .update({
            suggested_project_id: bestMatch.project_id,
            suggested_cost_code_id: bestMatch.cost_code_id,
            suggestion_confidence: bestMatch.confidence,
            matched_rule_id: bestMatch.rule_id,
            routing_status: bestMatch.confidence >= 90 ? 'auto_matched' : 'review_needed',
            needs_review: bestMatch.confidence < 90,
            suggestion_reason: bestMatch.reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        // Update rule statistics
        await supabase
          .from('quickbooks_routing_rules')
          .update({
            matches_count: supabase.raw('matches_count + 1'),
            last_matched_at: new Date().toISOString()
          })
          .eq('id', bestMatch.rule_id);

        // Log the event
        await logRoutingEvent(supabase, {
          company_id: companyId,
          transaction_id: transaction.id,
          qb_transaction_id: transaction.qb_transaction_id,
          event_type: 'auto_matched',
          to_project_id: bestMatch.project_id,
          to_cost_code_id: bestMatch.cost_code_id,
          applied_rule_id: bestMatch.rule_id,
          confidence_score: bestMatch.confidence
        });

        if (bestMatch.confidence >= 90) {
          autoAssignedCount++;
        } else {
          reviewRequiredCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing transaction ${transaction.id}:`, error);
      errorCount++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      results: {
        processed_count: processedCount,
        auto_assigned_count: autoAssignedCount,
        review_required_count: reviewRequiredCount,
        error_count: errorCount
      },
      message: `Processed ${processedCount} transactions. ${autoAssignedCount} auto-assigned, ${reviewRequiredCount} need review.`
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

async function manualAssignment(supabase: any, transactionId: string, assignment: any) {
  const { project_id, cost_code_id, notes, assigned_by } = assignment;

  // Update transaction with manual assignment
  const { error: updateError } = await supabase
    .from('quickbooks_unrouted_transactions')
    .update({
      assigned_project_id: project_id,
      assigned_cost_code_id: cost_code_id,
      assigned_by: assigned_by,
      assigned_at: new Date().toISOString(),
      assignment_notes: notes,
      routing_status: 'manually_assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId);

  if (updateError) {
    throw new Error('Failed to update transaction assignment');
  }

  // Get transaction details for logging
  const { data: transaction } = await supabase
    .from('quickbooks_unrouted_transactions')
    .select('company_id, qb_transaction_id')
    .eq('id', transactionId)
    .single();

  // Log the manual assignment
  if (transaction) {
    await logRoutingEvent(supabase, {
      company_id: transaction.company_id,
      transaction_id: transactionId,
      qb_transaction_id: transaction.qb_transaction_id,
      event_type: 'manually_assigned',
      to_project_id: project_id,
      to_cost_code_id: cost_code_id,
      performed_by: assigned_by,
      notes: notes
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Transaction manually assigned to project"
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

async function importQuickBooksTransactions(supabase: any, companyId: string) {
  // This function would integrate with existing QB sync to import new transactions
  // For now, we'll return a placeholder response

  return new Response(
    JSON.stringify({
      success: true,
      message: "QuickBooks transaction import initiated",
      imported_count: 0 // Would be actual count from QB sync
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}

async function findBestMatch(transaction: UnroutedTransaction, rules: RoutingRule[]): Promise<any> {
  let bestMatch: any = null;
  let highestConfidence = 0;

  for (const rule of rules) {
    const confidence = calculateMatchConfidence(transaction, rule);
    
    if (confidence > highestConfidence && confidence >= (rule.confidence_threshold || 50)) {
      highestConfidence = confidence;
      bestMatch = {
        rule_id: rule.id,
        project_id: rule.project_id,
        cost_code_id: rule.cost_code_id,
        confidence: confidence,
        reason: `Matched rule "${rule.name}" with ${confidence}% confidence`
      };
    }
  }

  return bestMatch;
}

function calculateMatchConfidence(transaction: UnroutedTransaction, rule: RoutingRule): number {
  let confidence = 0;
  let isMatch = false;

  const fieldValue = getFieldValue(transaction, rule.field_type);
  if (!fieldValue) return 0;

  // Apply matching logic
  switch (rule.match_type) {
    case 'exact':
      isMatch = rule.case_sensitive 
        ? fieldValue === rule.match_value
        : fieldValue.toLowerCase() === rule.match_value.toLowerCase();
      confidence = isMatch ? 100 : 0;
      break;
      
    case 'contains':
      const searchValue = rule.case_sensitive ? rule.match_value : rule.match_value.toLowerCase();
      const targetValue = rule.case_sensitive ? fieldValue : fieldValue.toLowerCase();
      isMatch = targetValue.includes(searchValue);
      confidence = isMatch ? 85 : 0;
      break;
      
    case 'starts_with':
      isMatch = rule.case_sensitive
        ? fieldValue.startsWith(rule.match_value)
        : fieldValue.toLowerCase().startsWith(rule.match_value.toLowerCase());
      confidence = isMatch ? 90 : 0;
      break;
      
    case 'regex':
      try {
        const regex = new RegExp(rule.match_value, rule.case_sensitive ? 'g' : 'gi');
        isMatch = regex.test(fieldValue);
        confidence = isMatch ? 95 : 0;
      } catch (e) {
        confidence = 0;
      }
      break;
      
    case 'range':
      if (rule.field_type === 'amount_range') {
        const [min, max] = rule.match_value.split('-').map(Number);
        isMatch = transaction.amount >= min && transaction.amount <= max;
        confidence = isMatch ? 80 : 0;
      }
      break;
  }

  // Check exclude patterns
  if (isMatch && rule.exclude_patterns?.length) {
    for (const excludePattern of rule.exclude_patterns) {
      if (fieldValue.toLowerCase().includes(excludePattern.toLowerCase()) ||
          transaction.description?.toLowerCase().includes(excludePattern.toLowerCase())) {
        confidence = 0;
        break;
      }
    }
  }

  return confidence;
}

function getFieldValue(transaction: UnroutedTransaction, fieldType: string): string {
  switch (fieldType) {
    case 'memo':
      return transaction.memo || '';
    case 'reference':
      return transaction.reference_number || '';
    case 'customer_name':
      return transaction.customer_name || '';
    case 'vendor_name':
      return transaction.vendor_name || '';
    case 'description':
      return transaction.description || '';
    case 'class':
      return transaction.qb_class || '';
    case 'location':
      return transaction.qb_location || '';
    default:
      return '';
  }
}

async function logRoutingEvent(supabase: any, event: any) {
  try {
    await supabase
      .from('quickbooks_routing_history')
      .insert({
        ...event,
        event_timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log routing event:', error);
    // Don't throw - logging failure shouldn't break the main process
  }
}