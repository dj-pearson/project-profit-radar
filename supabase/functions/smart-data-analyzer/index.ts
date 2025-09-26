import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { sessionId, csvData, fileName } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Analyzing data for session: ${sessionId}`);

    // Parse CSV data sample for analysis
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const headers = lines[0]?.split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const sampleRows = lines.slice(1, 6).map((line: string) => 
      line.split(',').map((cell: string) => cell.trim().replace(/"/g, ''))
    );

    // Prepare data for AI analysis
    const analysisPrompt = `
Analyze this data file and determine:
1. What type of construction data this represents (projects, equipment, materials, permits, warranties, contacts, etc.)
2. The likely source platform (Procore, Buildertrend, CoConstruct, QuickBooks, Excel, etc.)
3. Confidence level (0-100)
4. Field mapping suggestions to our database schema

File: ${fileName}
Headers: ${JSON.stringify(headers)}
Sample Data (first 5 rows): ${JSON.stringify(sampleRows)}

Our database schema includes these main tables and fields:
- projects: name, description, client_name, client_email, client_phone, address, start_date, end_date, budget, status
- equipment: name, model, manufacturer, serial_number, purchase_date, purchase_price, current_value, status
- materials: name, description, unit, supplier, cost_per_unit, category
- permits: permit_name, permit_type, permit_number, issuing_authority, application_date, approval_date, expiry_date
- warranties: warranty_name, provider, start_date, end_date, coverage_details, claim_instructions
- contacts: first_name, last_name, company_name, email, phone, address, contact_type
- bonds: bond_name, bond_type, bond_number, surety_company, bond_amount, effective_date, expiry_date
- contractors: business_name, contact_person, email, phone, address, tax_id

Respond in this exact JSON format:
{
  "dataType": "projects|equipment|materials|permits|warranties|contacts|bonds|contractors|unknown",
  "confidence": 85,
  "sourcePlatform": "detected platform or unknown",
  "fieldMappings": [
    {
      "sourceField": "Project Name",
      "targetField": "name",
      "confidence": 90,
      "reasoning": "Clear project name field"
    }
  ],
  "totalRecords": ${lines.length - 1},
  "previewData": [first 3 rows as objects using suggested field mappings]
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
            content: 'You are an expert in construction management software and data migration. Analyze the provided data and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
      }),
    });

    const aiResult = await response.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    console.log('AI Analysis result:', analysis);

    // Update import session with analysis results
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
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    // Store field mapping suggestions
    for (const mapping of analysis.fieldMappings) {
      const sampleData = sampleRows
        .map(row => {
          const headerIndex = headers.indexOf(mapping.sourceField);
          return headerIndex >= 0 ? row[headerIndex] : null;
        })
        .filter(val => val !== null)
        .slice(0, 5);

      await supabase
        .from('import_field_suggestions')
        .insert({
          import_session_id: sessionId,
          source_field: mapping.sourceField,
          suggested_target_field: mapping.targetField,
          confidence_score: mapping.confidence,
          data_sample: sampleData
        });
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart-data-analyzer:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Analysis failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});