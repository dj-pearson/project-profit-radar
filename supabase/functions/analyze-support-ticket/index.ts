// AI-powered ticket analyzer
// Categorizes tickets, suggests responses, and identifies relevant KB articles

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Categories for ticket classification
const TICKET_CATEGORIES = [
  "integration_issue",
  "billing_question",
  "feature_request",
  "bug_report",
  "how_to_question",
  "account_management",
  "performance_issue",
  "data_export_import",
  "mobile_issue",
  "general_inquiry",
];

// Priority levels based on content analysis
const PRIORITY_KEYWORDS = {
  urgent: ["urgent", "asap", "immediately", "critical", "down", "not working", "broken", "emergency"],
  high: ["important", "soon", "blocking", "cannot", "can't", "unable", "error", "failed"],
  medium: ["help", "question", "how to", "wondering", "issue"],
  low: ["suggestion", "feature request", "nice to have", "would like"],
};

// Sentiment indicators
const SENTIMENT_KEYWORDS = {
  frustrated: ["frustrated", "disappointed", "annoyed", "terrible", "awful", "useless", "horrible"],
  neutral: ["question", "wondering", "curious", "help", "how"],
  happy: ["great", "love", "excellent", "awesome", "fantastic", "wonderful"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { ticketId } = await req.json();

    if (!ticketId) {
      throw new Error("ticketId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing ticket ${ticketId}...`);

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Analyze ticket content
    const analysis = await analyzeTicket(ticket);

    // Get user context
    const context = await getUserContext(supabase, ticket);

    // Generate response suggestions
    const suggestions = await generateSuggestions(supabase, ticket, analysis, context);

    // Find relevant KB articles
    const kbArticles = await findRelevantKBArticles(supabase, ticket, analysis);

    // Save analysis results
    await saveAnalysisResults(supabase, ticketId, analysis, suggestions, kbArticles);

    // Update ticket context
    await saveTicketContext(supabase, ticketId, context);

    console.log(`Ticket ${ticketId} analyzed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        context,
        suggestions,
        kbArticles,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error analyzing ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function analyzeTicket(ticket: any) {
  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();

  // Categorize ticket
  const category = categorizeTicket(text);

  // Determine priority
  const priority = determinePriority(text, ticket.priority);

  // Analyze sentiment
  const sentiment = analyzeSentiment(text);

  // Detect complexity
  const complexity = detectComplexity(text, ticket);

  // Extract key information
  const extractedInfo = extractKeyInfo(text);

  return {
    category,
    priority,
    sentiment,
    complexity,
    extractedInfo,
    confidence: calculateConfidence(category, priority, sentiment),
  };
}

function categorizeTicket(text: string): string {
  const scores: Record<string, number> = {};

  // Integration issues
  if (text.match(/quickbooks|stripe|calendar|sync|integration|connect|oauth/i)) {
    scores.integration_issue = (scores.integration_issue || 0) + 3;
  }

  // Billing questions
  if (text.match(/billing|invoice|payment|subscription|charge|refund|cancel/i)) {
    scores.billing_question = (scores.billing_question || 0) + 3;
  }

  // Bug reports
  if (text.match(/bug|error|broken|not working|crash|freeze|glitch/i)) {
    scores.bug_report = (scores.bug_report || 0) + 3;
  }

  // Feature requests
  if (text.match(/feature|request|add|would be nice|suggestion|enhancement/i)) {
    scores.feature_request = (scores.feature_request || 0) + 3;
  }

  // How-to questions
  if (text.match(/how to|how do i|how can i|where is|tutorial|guide/i)) {
    scores.how_to_question = (scores.how_to_question || 0) + 3;
  }

  // Performance issues
  if (text.match(/slow|loading|performance|lag|timeout|takes too long/i)) {
    scores.performance_issue = (scores.performance_issue || 0) + 3;
  }

  // Mobile issues
  if (text.match(/mobile|iphone|android|app|phone|tablet/i)) {
    scores.mobile_issue = (scores.mobile_issue || 0) + 2;
  }

  // Export/Import
  if (text.match(/export|import|csv|data transfer|migrate/i)) {
    scores.data_export_import = (scores.data_export_import || 0) + 3;
  }

  // Get highest scoring category
  let topCategory = "general_inquiry";
  let topScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topCategory = category;
    }
  }

  return topCategory;
}

function determinePriority(text: string, currentPriority?: string): string {
  // Check for urgent keywords
  for (const keyword of PRIORITY_KEYWORDS.urgent) {
    if (text.includes(keyword)) {
      return "urgent";
    }
  }

  // Check for high priority keywords
  for (const keyword of PRIORITY_KEYWORDS.high) {
    if (text.includes(keyword)) {
      return "high";
    }
  }

  // Check for low priority keywords
  for (const keyword of PRIORITY_KEYWORDS.low) {
    if (text.includes(keyword)) {
      return "low";
    }
  }

  // Default to medium or keep current
  return currentPriority || "medium";
}

function analyzeSentiment(text: string): string {
  let sentimentScore = 0;

  // Check frustrated keywords
  for (const keyword of SENTIMENT_KEYWORDS.frustrated) {
    if (text.includes(keyword)) {
      sentimentScore -= 2;
    }
  }

  // Check happy keywords
  for (const keyword of SENTIMENT_KEYWORDS.happy) {
    if (text.includes(keyword)) {
      sentimentScore += 2;
    }
  }

  // Check for excessive punctuation (!!! or ???)
  if (text.match(/[!?]{3,}/)) {
    sentimentScore -= 1;
  }

  // Check for all caps (frustration indicator)
  const capsWords = text.match(/\b[A-Z]{3,}\b/g);
  if (capsWords && capsWords.length > 2) {
    sentimentScore -= 1;
  }

  if (sentimentScore < -2) return "frustrated";
  if (sentimentScore > 2) return "happy";
  return "neutral";
}

function detectComplexity(text: string, ticket: any): string {
  let complexityScore = 0;

  // Length of description
  if (ticket.description.length > 500) complexityScore += 2;
  if (ticket.description.length > 1000) complexityScore += 2;

  // Multiple questions
  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks > 3) complexityScore += 2;

  // Technical terms
  const technicalTerms = text.match(
    /api|database|query|authentication|authorization|encryption|backend|frontend|server|client/gi
  );
  if (technicalTerms && technicalTerms.length > 3) complexityScore += 2;

  // Multiple issues mentioned
  if (text.match(/also|and|plus|additionally|furthermore/gi)) {
    complexityScore += 1;
  }

  if (complexityScore > 5) return "complex";
  if (complexityScore > 2) return "medium";
  return "simple";
}

function extractKeyInfo(text: string): any {
  const info: any = {};

  // Extract email addresses
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emails) info.emails = emails;

  // Extract URLs
  const urls = text.match(/https?:\/\/[^\s]+/g);
  if (urls) info.urls = urls;

  // Extract error codes
  const errorCodes = text.match(/error\s*:?\s*\d+|code\s*:?\s*\d+/gi);
  if (errorCodes) info.errorCodes = errorCodes;

  // Extract dollar amounts
  const amounts = text.match(/\$[\d,]+\.?\d*/g);
  if (amounts) info.amounts = amounts;

  return info;
}

function calculateConfidence(category: string, priority: string, sentiment: string): number {
  // Simple confidence calculation
  // In production, this would be ML-based
  let confidence = 0.7; // Base confidence

  if (category !== "general_inquiry") confidence += 0.1;
  if (priority !== "medium") confidence += 0.1;
  if (sentiment !== "neutral") confidence += 0.1;

  return Math.min(confidence, 1.0);
}

async function getUserContext(supabase: any, ticket: any) {
  // Get user profile
  const { data: user } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("email", ticket.customer_email)
    .single();

  if (!user) {
    return {
      userFound: false,
      accountAge: 0,
      lastLogin: null,
      accountHealthScore: null,
      recentActions: [],
      integrationStatus: {},
      supportHistory: {},
    };
  }

  // Get company info
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.company_id)
    .single();

  // Get health score
  const { data: health } = await supabase
    .from("account_health_scores")
    .select("*")
    .eq("company_id", user.company_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get recent activity (last 10 actions)
  const { data: recentActions } = await supabase
    .from("user_activity_timeline")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(10);

  // Get integration status
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", user.company_id)
    .single();

  // Get support history
  const { data: pastTickets } = await supabase
    .from("support_tickets")
    .select("id, status, created_at")
    .eq("customer_email", ticket.customer_email)
    .order("created_at", { ascending: false })
    .limit(5);

  const accountAge = company
    ? Math.floor((new Date().getTime() - new Date(company.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    userFound: true,
    userId: user.id,
    companyId: user.company_id,
    companyName: company?.name,
    accountAge,
    subscriptionStatus: company?.subscription_status,
    subscriptionTier: company?.subscription_tier,
    lastLogin: user.last_login,
    accountHealthScore: health?.score,
    riskLevel: health?.risk_level,
    recentActions: recentActions || [],
    integrationStatus: settings
      ? {
          quickbooks: settings.enable_financial_management,
          stripe: true, // Always enabled
          mobile: settings.enable_mobile_access,
        }
      : {},
    supportHistory: {
      totalTickets: pastTickets?.length || 0,
      openTickets: pastTickets?.filter((t) => t.status === "open").length || 0,
      lastTicketDate: pastTickets?.[0]?.created_at,
    },
  };
}

async function generateSuggestions(
  supabase: any,
  ticket: any,
  analysis: any,
  context: any
): Promise<any[]> {
  const suggestions = [];

  // Category-based routing suggestion
  suggestions.push({
    suggestion_type: "routing",
    confidence_score: analysis.confidence,
    suggested_category: analysis.category,
    suggested_priority: analysis.priority,
  });

  // Auto-response for common issues
  if (analysis.category === "how_to_question" && analysis.complexity === "simple") {
    suggestions.push({
      suggestion_type: "auto_response",
      confidence_score: 0.85,
      suggested_content: generateAutoResponse(ticket, analysis, context),
    });
  }

  return suggestions;
}

function generateAutoResponse(ticket: any, analysis: any, context: any): string {
  const greeting = context.userFound
    ? `Hi ${context.companyName || "there"},`
    : "Hi there,";

  let response = `${greeting}\n\nThank you for contacting BuildDesk support.\n\n`;

  // Category-specific responses
  switch (analysis.category) {
    case "integration_issue":
      response +=
        "I can help you with your integration issue. To troubleshoot, please:\n\n1. Go to Settings → Integrations\n2. Check the connection status\n3. Try reconnecting if needed\n\nIf the issue persists, please reply with the specific error message you're seeing.\n";
      break;

    case "billing_question":
      response +=
        "For billing questions, you can:\n\n1. View your invoices in Settings → Billing\n2. Update payment methods\n3. Change your subscription\n\nIf you need specific assistance, please let me know what you'd like to do.\n";
      break;

    case "how_to_question":
      response +=
        "I'd be happy to help! Please check our knowledge base for step-by-step guides:\n\n[Knowledge Base Link]\n\nIf you need more specific help, please reply with details about what you're trying to accomplish.\n";
      break;

    default:
      response +=
        "I've received your message and will look into this for you. I'll get back to you shortly with a solution.\n";
  }

  response += "\nBest regards,\nBuildDesk Support Team";

  return response;
}

async function findRelevantKBArticles(supabase: any, ticket: any, analysis: any) {
  // Search knowledge base articles
  const searchTerms = `${ticket.subject} ${ticket.description}`.toLowerCase();

  const { data: articles } = await supabase
    .from("knowledge_base_articles")
    .select("id, title, category, helpful_count, not_helpful_count")
    .or(`title.ilike.%${analysis.category}%,content.ilike.%${analysis.category}%`)
    .order("helpful_count", { ascending: false })
    .limit(3);

  return (articles || []).map((article) => ({
    articleId: article.id,
    title: article.title,
    matchScore: 0.7, // Would be calculated based on content similarity
    helpfulRate:
      article.helpful_count / Math.max(article.helpful_count + article.not_helpful_count, 1),
  }));
}

async function saveAnalysisResults(
  supabase: any,
  ticketId: string,
  analysis: any,
  suggestions: any[],
  kbArticles: any[]
) {
  // Save each suggestion
  for (const suggestion of suggestions) {
    await supabase.from("support_suggestions").insert({
      ticket_id: ticketId,
      suggestion_type: suggestion.suggestion_type,
      confidence_score: suggestion.confidence_score,
      suggested_category: suggestion.suggested_category,
      suggested_priority: suggestion.suggested_priority,
      suggested_content: suggestion.suggested_content,
      kb_article_id: suggestion.kb_article_id,
    });
  }

  // Update ticket with suggested category and priority
  await supabase
    .from("support_tickets")
    .update({
      category: analysis.category,
      priority: analysis.priority,
    })
    .eq("id", ticketId);
}

async function saveTicketContext(supabase: any, ticketId: string, context: any) {
  await supabase.from("support_ticket_context").upsert({
    ticket_id: ticketId,
    user_id: context.userId,
    company_id: context.companyId,
    account_health_score: context.accountHealthScore,
    last_login: context.lastLogin,
    recent_actions: context.recentActions,
    integration_status: context.integrationStatus,
    support_history_summary: context.supportHistory,
  });
}
