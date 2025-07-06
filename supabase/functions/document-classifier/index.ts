import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Project {
  id: string;
  name: string;
  client: string;
}

interface ClassificationRequest {
  text: string;
  projects: Project[];
}

interface AIClassification {
  document_type: string;
  vendor_name?: string;
  amount?: number;
  project_references?: string[];
  suggested_project_id?: string;
  suggested_cost_center?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, projects }: ClassificationRequest = await req.json();
    
    console.log('Processing document classification request');
    console.log('Text length:', text.length);
    console.log('Available projects:', projects.length);

    // Check if OpenAI API key is available
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.log('OpenAI API key not found, using rule-based classification');
      const ruleBasedResult = performRuleBasedClassification(text, projects);
      return new Response(JSON.stringify({ classification: ruleBasedResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI classification
    const aiResult = await performAIClassification(text, projects, openAIApiKey);
    
    return new Response(JSON.stringify({ classification: aiResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Classification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Classification failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performAIClassification(text: string, projects: Project[], apiKey: string): Promise<AIClassification> {
  const projectList = projects.map(p => `- ${p.name} (Client: ${p.client})`).join('\n');
  
  const prompt = `Analyze this document text and provide classification:

DOCUMENT TEXT:
${text}

AVAILABLE PROJECTS:
${projectList}

Please analyze and respond with ONLY a JSON object in this exact format:
{
  "document_type": "invoice|receipt|timesheet|contract|permit|other",
  "vendor_name": "extracted vendor/company name or null",
  "amount": number or null,
  "project_references": ["any project names/addresses found in text"],
  "suggested_project_id": "best matching project ID or null",
  "suggested_cost_center": "materials|labor|equipment|overhead|admin",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation of classification decisions"
}

Classification rules:
- "invoice" for material/supply bills, vendor invoices
- "receipt" for equipment purchases, tool receipts  
- "timesheet" for labor tracking, employee hours
- "contract" for agreements, work orders
- "permit" for licenses, certifications
- Match project references against project names and client names
- Suggest cost center based on document content
- High confidence = clear document type + project match
- Medium confidence = clear document type OR project match  
- Low confidence = unclear document type AND no project match`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a document classification expert. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const classification = JSON.parse(content);
    
    // Find project ID if project name was matched
    if (classification.suggested_project_id && projects.length > 0) {
      const matchedProject = projects.find(p => 
        p.name.toLowerCase().includes(classification.suggested_project_id.toLowerCase()) ||
        p.client.toLowerCase().includes(classification.suggested_project_id.toLowerCase())
      );
      if (matchedProject) {
        classification.suggested_project_id = matchedProject.id;
      }
    }

    return classification;

  } catch (error) {
    console.error('AI classification error:', error);
    // Fall back to rule-based classification
    return performRuleBasedClassification(text, projects);
  }
}

function performRuleBasedClassification(text: string, projects: Project[]): AIClassification {
  const lowerText = text.toLowerCase();
  
  // Document type detection
  let document_type = 'other';
  let suggested_cost_center = 'admin';
  
  if (lowerText.includes('invoice') || lowerText.includes('bill') || lowerText.includes('receipt')) {
    if (lowerText.includes('material') || lowerText.includes('supply') || lowerText.includes('lumber') || 
        lowerText.includes('concrete') || lowerText.includes('steel')) {
      document_type = 'invoice';
      suggested_cost_center = 'materials';
    } else if (lowerText.includes('equipment') || lowerText.includes('tool') || lowerText.includes('machinery')) {
      document_type = 'receipt';
      suggested_cost_center = 'equipment';
    } else {
      document_type = 'invoice';
    }
  } else if (lowerText.includes('timesheet') || lowerText.includes('hours') || lowerText.includes('payroll')) {
    document_type = 'timesheet';
    suggested_cost_center = 'labor';
  } else if (lowerText.includes('contract') || lowerText.includes('agreement') || lowerText.includes('proposal')) {
    document_type = 'contract';
  } else if (lowerText.includes('permit') || lowerText.includes('license') || lowerText.includes('certification')) {
    document_type = 'permit';
  }

  // Extract potential amount
  const amountMatch = text.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  // Look for vendor name (simple heuristic)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const vendor_name = lines.length > 0 ? lines[0].trim().substring(0, 50) : null;

  // Project matching
  let suggested_project_id = null;
  const project_references: string[] = [];
  
  for (const project of projects) {
    if (lowerText.includes(project.name.toLowerCase()) || 
        lowerText.includes(project.client.toLowerCase())) {
      suggested_project_id = project.id;
      project_references.push(project.name);
      break;
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (document_type !== 'other' && suggested_project_id) {
    confidence = 'high';
  } else if (document_type !== 'other' || suggested_project_id) {
    confidence = 'medium';
  }

  return {
    document_type,
    vendor_name,
    amount,
    project_references,
    suggested_project_id,
    suggested_cost_center,
    confidence,
    reasoning: `Rule-based classification: detected ${document_type} document${suggested_project_id ? ' with project match' : ' without project match'}`
  };
}