// Smart Data Analyzer Edge Function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Comprehensive database schema for AI analysis
const DATABASE_SCHEMA = `
Our database schema includes these tables and their key fields:

PROJECTS (projects):
- name (required), description, client_name, client_email, client_phone
- site_address, start_date, end_date, budget, status (planning/active/on_hold/completed/cancelled)
- project_type, profit_margin, estimated_hours, completion_percentage

CONTACTS/LEADS (leads):
- email (required), first_name, last_name, company_name, phone
- job_title, industry, lead_source, lead_status (new/contacted/qualified/proposal/won/lost)
- priority (low/medium/high), project_name, estimated_budget, notes

ESTIMATES (estimates):
- estimate_number (required), title (required), client_name, client_email, client_phone
- description, site_address, estimate_date, valid_until
- total_amount, tax_percentage, markup_percentage, status (draft/sent/accepted/rejected/expired)

TIME_ENTRIES (time_entries):
- start_time (required), end_time, total_hours, break_duration
- description, location, project_name (for lookup), worker_email (for lookup)
- approval_status (pending/approved/rejected)

EXPENSES (expenses):
- description (required), amount (required), expense_date, vendor_name
- category, project_name (for lookup), payment_method, payment_status
- tax_amount, is_billable

EQUIPMENT (equipment):
- name (required), equipment_type (required), model, serial_number
- description, purchase_date, purchase_cost, current_value
- location, status (available/in_use/maintenance/retired)
- last_maintenance_date, next_maintenance_date

INVOICES (invoices):
- invoice_number (required), issue_date (required), due_date (required)
- client_name, client_email, client_address, project_name (for lookup)
- subtotal (required), tax_rate, tax_amount, total_amount (required)
- status (draft/sent/viewed/paid/overdue/cancelled), po_number

MATERIALS (materials):
- name (required), unit (required, e.g., ea/ft/yd/sqft)
- description, category, material_code, unit_cost
- quantity_available, minimum_stock_level, supplier_name, location

SUBCONTRACTORS (subcontractors):
- business_name (required), contact_name, email, phone, address
- specialty (trade), license_number, tax_id, insurance_expiry
- hourly_rate, rating (1-5)

CHANGE_ORDERS (change_orders):
- change_order_number (required), project_name (required, for lookup)
- title (required), description, amount
- status (draft/pending/approved/rejected), request_date, approval_date
- days_impact, reason
`;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SMART-DATA-ANALYZER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    const { sessionId, csvData, fileName } = await req.json();
    logStep("Analyzing data", {  sessionId, fileName });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Analyzing data for session: ${sessionId}`);

    // Parse CSV data sample for analysis
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const headers = lines[0]?.split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const sampleRows = lines.slice(1, 11).map((line: string) =>
      line.split(',').map((cell: string) => cell.trim().replace(/"/g, ''))
    );

    // Prepare data for AI analysis
    const analysisPrompt = `
Analyze this construction management data file and determine:
1. What type of data this represents
2. The likely source platform
3. Confidence level (0-100)
4. Field mapping suggestions to our database schema

File: ${fileName}
Headers: ${JSON.stringify(headers)}
Sample Data (first 10 rows): ${JSON.stringify(sampleRows)}

${DATABASE_SCHEMA}

IMPORTANT: Consider these common patterns from competitor platforms:
- Procore: Often uses "Job Name", "Project #", "Cost Code"
- Buildertrend: Uses "Estimate #", "Job", "To-Do Category"
- CoConstruct: Uses "Spec Category", "Selection", "Client Name"
- QuickBooks: Uses "Customer", "Invoice #", "Amount Due", "Due Date"
- Generic exports: May use "Name", "Description", "Date", "Amount"

Respond in this exact JSON format:
{
  "dataType": "projects|contacts|estimates|time_entries|expenses|equipment|invoices|materials|subcontractors|change_orders|unknown",
  "confidence": 85,
  "sourcePlatform": "Procore|Buildertrend|CoConstruct|QuickBooks|Excel|Generic|Unknown",
  "fieldMappings": [
    {
      "sourceField": "Original Column Name",
      "targetField": "database_field_name",
      "confidence": 90,
      "reasoning": "Brief explanation"
    }
  ],
  "totalRecords": ${lines.length - 1},
  "previewData": [first 5 rows as objects using suggested field mappings],
  "warnings": ["Any potential issues or ambiguities detected"]
}`;

    // Call OpenAI for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in construction management software and data migration.
You specialize in analyzing CSV exports from construction platforms like Procore, Buildertrend, CoConstruct, and QuickBooks.
Your job is to accurately identify data types and map fields to the target database schema.
Always respond with valid JSON only - no markdown, no explanations outside JSON.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResult = await response.json();

    // Extract and parse the JSON response
    let analysisText = aiResult.choices[0].message.content;

    // Clean up any markdown code blocks
    analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const analysis = JSON.parse(analysisText);

    console.log('AI Analysis result:', {
      dataType: analysis.dataType,
      confidence: analysis.confidence,
      sourcePlatform: analysis.sourcePlatform,
      fieldMappingsCount: analysis.fieldMappings?.length,
    });

    // Update import session with analysis results (with site isolation)
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        detected_data_type: analysis.dataType,
        confidence_score: analysis.confidence,
        source_platform: analysis.sourcePlatform,
        total_records: analysis.totalRecords,
        preview_data: analysis.previewData,
        status: 'analyzed'
      })
        // CRITICAL: Site isolation
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw updateError;
    }

    // Store field mapping suggestions with site isolation
    if (analysis.fieldMappings && analysis.fieldMappings.length > 0) {
      for (const mapping of analysis.fieldMappings) {
        const sampleData = sampleRows
          .map((row: any) => {
            const headerIndex = headers.indexOf(mapping.sourceField);
            return headerIndex >= 0 ? row[headerIndex] : null;
          })
          .filter((val: any) => val !== null && val !== '')
          .slice(0, 5);

        await supabase
          .from('import_field_suggestions')
          .insert({  // CRITICAL: Site isolation
            import_session_id: sessionId,
            source_field: mapping.sourceField,
            suggested_target_field: mapping.targetField,
            confidence_score: mapping.confidence,
            data_sample: sampleData
          });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        dataType: analysis.dataType,
        confidence: analysis.confidence,
        sourcePlatform: analysis.sourcePlatform,
        totalRecords: analysis.totalRecords,
        fieldMappingsCount: analysis.fieldMappings?.length || 0,
        warnings: analysis.warnings || [],
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-data-analyzer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
