import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, data?: any) => {
  console.log(`[Social Content Generator] ${step}:`, data || "");
};

interface SocialPlatformContent {
  platform: string;
  content: string;
  hashtags: string[];
  media_urls: string[];
  optimal_length: number;
  post_type: "short" | "medium" | "long";
  includes_url: boolean;
}

interface ContentTemplate {
  category: string;
  topic: string;
  key_points: string[];
  target_audience: string;
  cta_focus: string;
}

// ============================================================================
// POST FORMAT SYSTEM - Creates diverse, non-repetitive content
// ============================================================================

// Different post FORMATS that change the structure entirely
interface PostFormat {
  id: string;
  name: string;
  structure: string;
  hook_style: string;
  tone: string;
  example_opening: string;
}

const POST_FORMATS: PostFormat[] = [
  {
    id: "story",
    name: "Customer Story",
    structure: "Open with a specific contractor's situation → Their challenge → How they solved it → Results achieved → Invitation to try",
    hook_style: "narrative",
    tone: "warm, relatable, conversational",
    example_opening: "Last month, a framing contractor in Phoenix called me frustrated. His crew was working 60-hour weeks but profits kept shrinking...",
  },
  {
    id: "myth_buster",
    name: "Myth Buster",
    structure: "State a common belief → Reveal why it's wrong → Share the truth with evidence → Offer better approach",
    hook_style: "contrarian",
    tone: "confident, slightly provocative, educational",
    example_opening: "Unpopular opinion: Spreadsheets aren't killing your construction business. Your attachment to them is.",
  },
  {
    id: "quick_tip",
    name: "Quick Tip",
    structure: "Single actionable tip → Why it works → How to implement it today → Optional: how tools help",
    hook_style: "helpful, direct",
    tone: "practical, no-nonsense, peer-to-peer",
    example_opening: "Quick tip that saved one of our users $12K last quarter: Review your material orders against actuals every Friday at 2pm.",
  },
  {
    id: "behind_scenes",
    name: "Behind the Scenes",
    structure: "Share an insider look at successful operations → Reveal what they do differently → Connect to broader principle",
    hook_style: "exclusive, insider knowledge",
    tone: "candid, transparent, peer sharing",
    example_opening: "I spent last week visiting 3 of the most profitable GCs in Texas. Here's the one thing they all had in common...",
  },
  {
    id: "data_insight",
    name: "Data-Driven Insight",
    structure: "Lead with surprising statistic → Explain what it means → Share implications → Offer path forward",
    hook_style: "surprising fact",
    tone: "analytical, authoritative, thought-provoking",
    example_opening: "We analyzed 847 construction projects last quarter. The contractors who reviewed costs weekly were 3.2x more likely to hit margin targets.",
  },
  {
    id: "problem_solution",
    name: "Problem/Solution",
    structure: "Identify specific pain point → Agitate with consequences → Present solution → Show results",
    hook_style: "empathetic question",
    tone: "understanding, helpful, solution-oriented",
    example_opening: "That sinking feeling when you realize a project went from profitable to break-even? It usually happens slowly, then all at once.",
  },
  {
    id: "listicle",
    name: "Quick List",
    structure: "Promise value in headline → Deliver 3-5 actionable points → Each point is self-contained → Wrap with invitation",
    hook_style: "numbered promise",
    tone: "scannable, value-packed, efficient",
    example_opening: "5 signs your job costing process is costing you money (and what to do about each one):",
  },
  {
    id: "day_in_life",
    name: "Day in the Life",
    structure: "Describe a typical day scenario → Show the before struggle → Contrast with after → Highlight transformation",
    hook_style: "relatable scenario",
    tone: "vivid, descriptive, aspirational",
    example_opening: "6:30 AM: Your phone buzzes with a text from your foreman. Before you even grab coffee, you already know today's schedule just changed.",
  },
  {
    id: "contrarian",
    name: "Contrarian Take",
    structure: "Challenge conventional wisdom → Present alternative view with reasoning → Support with evidence or logic",
    hook_style: "provocative statement",
    tone: "bold, thought-provoking, confident",
    example_opening: "Hot take: The construction companies struggling most right now aren't the ones with bad crews. They're the ones with great crews and terrible systems.",
  },
  {
    id: "celebration",
    name: "Win Celebration",
    structure: "Celebrate a specific achievement → Share what made it possible → Connect to universal lesson → Invite others to join",
    hook_style: "positive announcement",
    tone: "enthusiastic, inspiring, community-focused",
    example_opening: "Just got off the phone with a GC who closed his books for Q3. His words: 'First time in 12 years I finished a quarter knowing exactly where I stood.'",
  },
  {
    id: "how_to",
    name: "How-To Guide",
    structure: "Promise to teach something specific → Break into clear steps → Each step actionable → End with encouragement",
    hook_style: "educational promise",
    tone: "instructional, clear, supportive",
    example_opening: "How to know if a project is profitable BEFORE you finish it (not 60 days after when your accountant tells you):",
  },
  {
    id: "comparison",
    name: "Then vs Now",
    structure: "Describe old way of doing something → Contrast with new approach → Highlight specific improvements → Invite to experience the difference",
    hook_style: "before/after contrast",
    tone: "progressive, forward-looking, practical",
    example_opening: "2015: Spending Sunday nights reconciling timesheets. 2024: Spending Sunday nights actually relaxing because your time tracking runs itself.",
  },
];

// Different HOOK STYLES for variety in openings
const HOOK_VARIATIONS = [
  { style: "question", example: "What if you could see exactly where every dollar goes on every project?" },
  { style: "statistic", example: "73% of construction projects go over budget. But here's what the other 27% know..." },
  { style: "story_start", example: "Last Tuesday, a contractor showed me his spreadsheet. 47 tabs. Color-coded. Beautiful. Completely useless." },
  { style: "bold_statement", example: "Your project management spreadsheet is a liability, not an asset." },
  { style: "scenario", example: "Picture this: It's 4 PM Friday. A client asks for a project cost update. You have the answer in 30 seconds." },
  { style: "confession", example: "I used to think construction companies that 'went digital' were just throwing money at shiny tools..." },
  { style: "direct_address", example: "If you're still doing manual job costing, this is for you." },
  { style: "curiosity_gap", example: "The most profitable GC I know uses a 15-minute Friday routine that changed everything." },
  { style: "counterintuitive", example: "The best construction software isn't the one with the most features. It's the one your team actually uses." },
  { style: "time_hook", example: "In the next 3 minutes, I'll show you why top contractors check their numbers daily, not monthly." },
];

// Content templates for different topics (expanded)
const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    category: "feature",
    topic: "Project Cost Tracking",
    key_points: [
      "Real-time budget monitoring prevents cost overruns",
      "Automated expense categorization saves 5+ hours weekly",
      "Predictive analytics identify potential budget issues early",
      "Integration with QuickBooks streamlines financial reporting",
    ],
    target_audience: "contractors and project managers",
    cta_focus: "accurate project budgeting",
  },
  {
    category: "feature",
    topic: "Time Tracking & Payroll",
    key_points: [
      "GPS-enabled time tracking ensures accurate job site hours",
      "Automated payroll calculations reduce errors by 95%",
      "Integration with prevailing wage requirements",
      "Real-time labor cost analysis per project",
    ],
    target_audience: "construction companies",
    cta_focus: "streamlined payroll management",
  },
  {
    category: "benefit",
    topic: "Increased Profitability",
    key_points: [
      "Average 15% increase in project profitability",
      "Reduced administrative overhead by 30%",
      "Better resource allocation through data insights",
      "Faster invoicing and payment collection",
    ],
    target_audience: "business owners",
    cta_focus: "boosting your bottom line",
  },
  {
    category: "feature",
    topic: "Document Management",
    key_points: [
      "Centralized storage for all project documents",
      "OCR technology extracts data from receipts automatically",
      "Version control prevents costly document errors",
      "Mobile access to plans and specs on job sites",
    ],
    target_audience: "project teams",
    cta_focus: "organized project documentation",
  },
  {
    category: "knowledge",
    topic: "Construction Industry Trends",
    key_points: [
      "Digital transformation is reshaping construction",
      "Data-driven decisions improve project outcomes",
      "Mobile technology increases field productivity",
      "Automated workflows reduce human error",
    ],
    target_audience: "industry professionals",
    cta_focus: "staying ahead of industry changes",
  },
  {
    category: "benefit",
    topic: "Risk Management",
    key_points: [
      "Proactive issue identification prevents delays",
      "Compliance tracking reduces legal risks",
      "Safety monitoring improves job site conditions",
      "Insurance cost reduction through better documentation",
    ],
    target_audience: "safety managers and owners",
    cta_focus: "reducing project risks",
  },
  {
    category: "feature",
    topic: "Client Communication",
    key_points: [
      "Automated progress updates keep clients informed",
      "Photo documentation shows work quality",
      "Real-time project dashboards increase transparency",
      "Streamlined change order processes",
    ],
    target_audience: "client-facing teams",
    cta_focus: "improving client relationships",
  },
  {
    category: "knowledge",
    topic: "Small Business Success",
    key_points: [
      "Technology adoption is key to competitive advantage",
      "Efficient processes allow focus on growth",
      "Data insights drive better business decisions",
      "Automation frees up time for strategic work",
    ],
    target_audience: "small business owners",
    cta_focus: "scaling your business efficiently",
  },
  // NEW TEMPLATES for more variety
  {
    category: "knowledge",
    topic: "Cash Flow Management",
    key_points: [
      "Late payments are the #1 killer of profitable contractors",
      "Faster invoicing means faster payment cycles",
      "Real-time AR tracking prevents cash flow surprises",
      "Automated payment reminders without awkward calls",
    ],
    target_audience: "business owners and office managers",
    cta_focus: "healthy cash flow",
  },
  {
    category: "feature",
    topic: "Mobile Field Access",
    key_points: [
      "Access project info anywhere, even without cell service",
      "Crew can log hours and photos from the job site",
      "No more driving back to the office for paperwork",
      "Sync automatically when connection returns",
    ],
    target_audience: "field supervisors and crews",
    cta_focus: "staying connected in the field",
  },
  {
    category: "benefit",
    topic: "Work-Life Balance",
    key_points: [
      "Stop spending weekends on paperwork and reconciliation",
      "Automated reports mean less manual data entry",
      "Know your numbers without living in spreadsheets",
      "Build a business that doesn't require you 24/7",
    ],
    target_audience: "owner-operators and family businesses",
    cta_focus: "getting your time back",
  },
  {
    category: "knowledge",
    topic: "Scaling Your Business",
    key_points: [
      "Systems that work for 3 projects work for 30",
      "Visibility across multiple jobs simultaneously",
      "Onboard new PMs without losing tribal knowledge",
      "Data-driven decisions replace gut feelings at scale",
    ],
    target_audience: "growing contractors",
    cta_focus: "scaling without chaos",
  },
  {
    category: "feature",
    topic: "Change Order Management",
    key_points: [
      "Capture scope changes before work starts",
      "Automatic cost impact calculations",
      "Client approval workflows built-in",
      "Never lose money on undocumented changes again",
    ],
    target_audience: "project managers and estimators",
    cta_focus: "profitable change orders",
  },
  {
    category: "benefit",
    topic: "Competitive Advantage",
    key_points: [
      "Win more bids with accurate historical cost data",
      "Impress clients with professional progress updates",
      "Stand out from spreadsheet-dependent competitors",
      "Build reputation for on-budget, on-time delivery",
    ],
    target_audience: "business development and owners",
    cta_focus: "winning more work",
  },
];

// ============================================================================
// FORMAT ROTATION SYSTEM - Prevents repetitive content
// ============================================================================

interface RecentPostInfo {
  format_id: string;
  topic: string;
  hook_style: string;
  created_at: string;
}

// Get recently used formats to avoid repetition
async function getRecentFormats(
  supabaseClient: any,
  companyId: string,
  limit: number = 10
): Promise<RecentPostInfo[]> {
  try {
    const { data, error } = await supabaseClient
      .from("social_media_posts")
      .select("title, content, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      logStep("Could not fetch recent posts for format analysis", error);
      return [];
    }

    // Analyze recent posts to extract patterns
    return data.map((post: any) => {
      // Try to identify the format from content patterns
      let format_id = "unknown";
      let hook_style = "unknown";
      const content = post.content?.toLowerCase() || "";

      // Detect format from content patterns
      if (content.includes("unpopular opinion") || content.includes("hot take")) {
        format_id = "contrarian";
        hook_style = "provocative";
      } else if (content.includes("quick tip") || content.includes("pro tip")) {
        format_id = "quick_tip";
        hook_style = "helpful";
      } else if (content.match(/^\d+\.\s|^•\s|^→\s/m)) {
        format_id = "listicle";
        hook_style = "numbered";
      } else if (content.includes("last month") || content.includes("last week") || content.includes("just got off the phone")) {
        format_id = "story";
        hook_style = "narrative";
      } else if (content.includes("picture this") || content.includes("imagine")) {
        format_id = "day_in_life";
        hook_style = "scenario";
      } else if (content.includes("how to")) {
        format_id = "how_to";
        hook_style = "educational";
      } else if (content.includes("still ") && content.includes("?")) {
        format_id = "problem_solution";
        hook_style = "question";
      } else if (content.match(/\d+%|\d+x/)) {
        format_id = "data_insight";
        hook_style = "statistic";
      }

      // Extract topic from title
      const topic = post.title?.split(" - ")[0] || "Unknown";

      return {
        format_id,
        topic,
        hook_style,
        created_at: post.created_at,
      };
    });
  } catch (error) {
    logStep("Error analyzing recent formats", error);
    return [];
  }
}

// Select a format that hasn't been used recently
function selectDiverseFormat(recentFormats: RecentPostInfo[]): PostFormat {
  // Count recent format usage
  const formatUsage: Record<string, number> = {};
  for (const recent of recentFormats.slice(0, 5)) {
    formatUsage[recent.format_id] = (formatUsage[recent.format_id] || 0) + 1;
  }

  // Find formats that haven't been used or used least
  const availableFormats = POST_FORMATS.filter((format) => {
    const usage = formatUsage[format.id] || 0;
    // Exclude formats used more than once in last 5 posts
    return usage < 2;
  });

  // If all formats are heavily used, just pick randomly from all
  const formatPool = availableFormats.length > 0 ? availableFormats : POST_FORMATS;

  // Random selection from available pool
  return formatPool[Math.floor(Math.random() * formatPool.length)];
}

// Select a hook style that varies from recent posts
function selectDiverseHookStyle(recentFormats: RecentPostInfo[]): typeof HOOK_VARIATIONS[0] {
  const recentHooks = recentFormats.slice(0, 3).map((r) => r.hook_style);

  // Filter out recently used hook styles
  const availableHooks = HOOK_VARIATIONS.filter(
    (hook) => !recentHooks.includes(hook.style)
  );

  const hookPool = availableHooks.length > 0 ? availableHooks : HOOK_VARIATIONS;
  return hookPool[Math.floor(Math.random() * hookPool.length)];
}

// Dynamic Instagram media selection from Supabase storage
async function getInstagramMediaFromStorage(
  supabaseClient: any
): Promise<string[]> {
  try {
    logStep("Fetching Instagram media from Supabase storage");

    const { data: files, error } = await supabaseClient.storage
      .from("site-assets")
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      logStep("Error listing storage assets", error);
      return [];
    }

    if (!files || files.length === 0) {
      logStep("No files found in site-assets bucket");
      return [];
    }

    const imageFiles = files.filter((file: any) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
    });

    if (imageFiles.length === 0) {
      logStep("No image files found in site-assets bucket");
      return [];
    }

    const publicUrls = imageFiles.map((file: any) => {
      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("site-assets").getPublicUrl(file.name);
      return publicUrl;
    });

    logStep("Found Instagram media assets", {
      total_files: files.length,
      image_files: imageFiles.length,
      sample_urls: publicUrls.slice(0, 3),
    });

    return publicUrls;
  } catch (error) {
    logStep("Error fetching storage assets", error);
    return [];
  }
}

async function selectRandomInstagramMedia(
  supabaseClient: any
): Promise<string[]> {
  const availableMedia = await getInstagramMediaFromStorage(supabaseClient);

  if (availableMedia.length === 0) {
    logStep("No media available, using fallback");
    return [];
  }

  const numberOfMedia =
    Math.random() > 0.7 ? Math.min(2, availableMedia.length) : 1;
  const selectedMedia: string[] = [];

  for (let i = 0; i < numberOfMedia; i++) {
    const randomIndex = Math.floor(Math.random() * availableMedia.length);
    const selectedAsset = availableMedia[randomIndex];

    if (!selectedMedia.includes(selectedAsset)) {
      selectedMedia.push(selectedAsset);
    }
  }

  logStep("Selected random Instagram media", {
    selected: selectedMedia,
    from_total: availableMedia.length,
  });

  return selectedMedia;
}

async function generateAIContent({
  platform,
  template,
  maxLength,
  tone,
  requirements,
  selectedFormat,
  hookVariation,
}: {
  platform: string;
  template: ContentTemplate;
  maxLength: number;
  tone: string;
  requirements: string[];
  selectedFormat: PostFormat;
  hookVariation: typeof HOOK_VARIATIONS[0];
}) {
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

  if (!claudeKey) {
    throw new Error("CLAUDE_API_KEY environment variable is required");
  }

  const prompt = `You are an expert social media copywriter for BuildDesk, a construction management SaaS. Create a ${platform} post that feels COMPLETELY DIFFERENT from typical SaaS marketing.

═══════════════════════════════════════════════════════════════
POST FORMAT: ${selectedFormat.name}
═══════════════════════════════════════════════════════════════

Structure to follow:
${selectedFormat.structure}

Tone: ${selectedFormat.tone}
Hook Style: ${selectedFormat.hook_style}

Example opening for inspiration (DO NOT copy, create something fresh):
"${selectedFormat.example_opening}"

═══════════════════════════════════════════════════════════════
HOOK APPROACH: ${hookVariation.style}
═══════════════════════════════════════════════════════════════

Example of this hook style (for reference only):
"${hookVariation.example}"

═══════════════════════════════════════════════════════════════
TOPIC & CONTENT
═══════════════════════════════════════════════════════════════

Topic: ${template.topic}
Target Audience: ${template.target_audience}
Business Goal: ${template.cta_focus}

Key points to naturally weave in (don't list them all, pick 1-2 that fit the format):
${template.key_points.map((point) => `• ${point}`).join("\n")}

═══════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. NEVER start with "Still losing money..." or any variation of that question
2. NEVER use the "pain point → statistics → solution → CTA" formula
3. Follow the ${selectedFormat.name} structure EXACTLY
4. Make it feel like a peer sharing knowledge, not a salesperson pitching
5. Be specific with examples (use realistic contractor names, cities, numbers)
6. Only mention BuildDesk once, naturally, not as a hard sell
7. The CTA should feel like a helpful suggestion, not pushy

Platform: ${platform}
Character Limit: ${maxLength} characters (excluding hashtags)
Writing Style: ${tone}

Platform-Specific Requirements:
${requirements.map((req) => `• ${req}`).join("\n")}

═══════════════════════════════════════════════════════════════

Write as if you're a respected voice in the construction industry sharing genuine insights. The post should make readers think, smile, or nod in recognition—not feel marketed to.

End with a natural mention of BuildDesk's 14-day free trial at build-desk.com, but make it flow naturally from the content.

Format your response as:
CONTENT: [your ${selectedFormat.name.toLowerCase()} post here]
HASHTAGS: [3-5 strategic hashtags separated by spaces]`;

  try {
    logStep(`Attempting ${platform} AI generation`, {
      has_claude_key: !!claudeKey,
      claude_key_length: claudeKey ? claudeKey.length : 0,
      prompt_length: prompt.length,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${claudeKey}`,
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-0",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    logStep(`Claude API response status: ${response.status}`, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep(`Claude API error details`, {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const claudeResponse = await response.json();
    logStep(`Claude raw response`, {
      has_content: !!claudeResponse.content,
      content_array_length: claudeResponse.content?.length || 0,
      raw_text:
        claudeResponse.content?.[0]?.text?.substring(0, 200) || "No text",
    });

    const fullContent = claudeResponse.content?.[0]?.text || "";

    // More flexible content parsing - handle various formats
    let content = "";
    let hashtags: string[] = [];

    // Try different parsing approaches
    const contentMatch1 = fullContent.match(
      /CONTENT:\s*(.*?)(?=\n\s*HASHTAGS:|$)/s
    );
    const contentMatch2 = fullContent.match(
      /CONTENT:\n(.*?)(?=\n\s*HASHTAGS:|$)/s
    );
    const contentMatch3 = fullContent.match(
      /^(.*?)(?=\n\s*#|\n\s*HASHTAGS:|$)/s
    );

    if (contentMatch1) {
      content = contentMatch1[1].trim();
    } else if (contentMatch2) {
      content = contentMatch2[1].trim();
    } else if (contentMatch3 && !fullContent.startsWith("HASHTAGS:")) {
      content = contentMatch3[1].trim();
    } else {
      // If no structured format, use the whole response
      content = fullContent.trim();
    }

    // Extract hashtags
    const hashtagsMatch1 = fullContent.match(/HASHTAGS:\s*(.*?)$/s);
    const hashtagsMatch2 = fullContent.match(/\n\s*(#\w+(?:\s+#\w+)*)\s*$/);
    const hashtagsMatch3 = fullContent.match(/(#\w+(?:\s+#\w+)*)/g);

    if (hashtagsMatch1) {
      hashtags = hashtagsMatch1[1]
        .trim()
        .split(/\s+/)
        .filter((tag: string) => tag.startsWith("#"));
    } else if (hashtagsMatch2) {
      hashtags = hashtagsMatch2[1]
        .trim()
        .split(/\s+/)
        .filter((tag: string) => tag.startsWith("#"));
    } else if (hashtagsMatch3) {
      hashtags = hashtagsMatch3
        .join(" ")
        .split(/\s+/)
        .filter((tag: string) => tag.startsWith("#"));
    }

    // Remove hashtags from content if they appear at the end
    content = content.replace(/\n\s*(#\w+(?:\s+#\w+)*)\s*$/, "").trim();

    logStep(`Generated ${platform} AI content`, {
      content_length: content.length,
      hashtags_count: hashtags.length,
      content_preview: content.substring(0, 100),
      hashtags_preview: hashtags.slice(0, 3),
    });

    return { content, hashtags };
  } catch (error) {
    const errorObj = error as Error;
    logStep(`${platform} AI generation failed`, {
      error_message: errorObj.message,
      error_type: errorObj.constructor.name,
      has_claude_key: !!claudeKey,
    });
    throw error;
  }
}

function generateFallbackContent(
  platform: string,
  template: ContentTemplate
): { content: string; hashtags: string[] } {
  const platformSpecificContent = {
    twitter: {
      content: `💡 ${template.key_points[0]} 

Ready to see the difference? Start your 14-day free trial: build-desk.com`,
      hashtags: ["#BuildDesk", "#Construction", "#ProjectManagement"],
    },
    linkedin: {
      content: `🚀 Industry Insight: ${template.topic}

${
  template.key_points[0]
} This isn't just about efficiency—it's about gaining a competitive edge in today's construction market.

Here's what this means for ${template.target_audience}:
• ${template.key_points[1] || "Streamlined operations that save time and money"}
• ${template.key_points[2] || "Better project visibility and control"}
• ${template.key_points[3] || "Data-driven insights for smarter decisions"}

The construction industry is evolving, and the companies that embrace smart technology are the ones that thrive. Don't get left behind.

Ready to see how BuildDesk can revolutionize your ${
        template.cta_focus
      }? Start your 14-day free trial today.`,
      hashtags: [
        "#BuildDesk",
        "#ConstructionTech",
        "#ProjectManagement",
        "#BusinessGrowth",
        "#Innovation",
      ],
    },
    facebook: {
      content: `🏗️ Attention ${template.target_audience}!

Did you know that ${template.key_points[0]}? 

This is just one of the ways smart construction companies are staying ahead of the curve. With BuildDesk, you get:
✅ ${template.key_points[1] || "Streamlined project management"}
✅ ${template.key_points[2] || "Real-time cost tracking"}
✅ ${template.key_points[3] || "Better team communication"}

Don't let outdated processes hold your business back. Join the growing community of successful contractors who've transformed their operations with BuildDesk.

🎯 Start your 14-day free trial at build-desk.com and see the difference for yourself!`,
      hashtags: [
        "#BuildDesk",
        "#Construction",
        "#SmallBusiness",
        "#ProjectManagement",
      ],
    },
    instagram: {
      content: `✨ Transform your construction business ✨

${template.key_points[0]} 🚀

This is what ${template.target_audience} love about BuildDesk:
📊 ${template.key_points[1] || "Real-time project insights"}
⏰ ${template.key_points[2] || "Time-saving automation"}
💰 ${template.key_points[3] || "Better profit margins"}

Ready to level up your business? 💪`,
      hashtags: [
        "#BuildDesk",
        "#Construction",
        "#SmallBusiness",
        "#ProjectManagement",
        "#BusinessGrowth",
        "#ConstructionTech",
      ],
    },
  };

  const platformContent =
    platformSpecificContent[platform as keyof typeof platformSpecificContent] ||
    platformSpecificContent.linkedin;

  return {
    content: platformContent.content,
    hashtags: platformContent.hashtags,
  };
}

async function generatePlatformContent(
  template: ContentTemplate,
  supabaseClient: any,
  companyId?: string
): Promise<SocialPlatformContent[]> {
  const platformContents: SocialPlatformContent[] = [];
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

  // Get recent post history to avoid repetition
  const recentFormats = companyId
    ? await getRecentFormats(supabaseClient, companyId)
    : [];

  // Select diverse format and hook that differ from recent posts
  const selectedFormat = selectDiverseFormat(recentFormats);
  const selectedHook = selectDiverseHookStyle(recentFormats);

  logStep("Selected diverse format for content generation", {
    format: selectedFormat.name,
    format_id: selectedFormat.id,
    hook_style: selectedHook.style,
    recent_formats_analyzed: recentFormats.length,
    avoided_formats: recentFormats.slice(0, 3).map(r => r.format_id),
  });

  // Generate Twitter content (short)
  try {
    const twitterContent = claudeKey
      ? await generateAIContent({
          platform: "twitter",
          template,
          maxLength: 200,
          tone: "concise and punchy",
          requirements: [
            "Maximum 200 characters total including URL and hashtags",
            "Very short, punchy opening (under 100 characters)",
            "One key benefit or statistic",
            "Brief call to action",
            "Must fit Twitter's 280 character limit with URL",
            "Keep it simple and direct",
          ],
          selectedFormat,
          hookVariation: selectedHook,
        })
      : generateFallbackContent("twitter", template);

    platformContents.push({
      platform: "twitter",
      content: twitterContent.content.includes("build-desk.com")
        ? twitterContent.content
        : `${twitterContent.content}\n\n🔗 build-desk.com`,
      hashtags: twitterContent.hashtags,
      media_urls: [],
      optimal_length: 280,
      post_type: "short",
      includes_url: true,
    });
  } catch (error) {
    logStep("Twitter AI generation failed, using fallback", error);
    const fallback = generateFallbackContent("twitter", template);
    platformContents.push({
      platform: "twitter",
      content: `${fallback.content}\n\n🔗 build-desk.com`,
      hashtags: fallback.hashtags,
      media_urls: [],
      optimal_length: 280,
      post_type: "short",
      includes_url: true,
    });
  }

  // Generate LinkedIn content (long)
  try {
    const linkedinContent = claudeKey
      ? await generateAIContent({
          platform: "linkedin",
          template,
          maxLength: 2800,
          tone: "professional and insightful",
          requirements: [
            "Professional tone suitable for business audience",
            "Include specific benefits and value propositions",
            "Share industry insights or best practices",
            "End with clear 14-day trial call-to-action",
            "Use professional hashtags",
            "Encourage engagement with questions",
          ],
          selectedFormat,
          hookVariation: selectedHook,
        })
      : generateFallbackContent("linkedin", template);

    platformContents.push({
      platform: "linkedin",
      content: linkedinContent.content.includes("build-desk.com")
        ? linkedinContent.content
        : `${linkedinContent.content}\n\n📈 Ready to transform your ${template.cta_focus}? Start your 14-day free trial: build-desk.com`,
      hashtags: linkedinContent.hashtags,
      media_urls: [],
      optimal_length: 3000,
      post_type: "long",
      includes_url: true,
    });
  } catch (error) {
    logStep("LinkedIn AI generation failed, using fallback", error);
    const fallback = generateFallbackContent("linkedin", template);
    platformContents.push({
      platform: "linkedin",
      content: `${fallback.content}\n\n📈 Ready to transform your ${template.cta_focus}? Start your 14-day free trial: build-desk.com`,
      hashtags: fallback.hashtags,
      media_urls: [],
      optimal_length: 3000,
      post_type: "long",
      includes_url: true,
    });
  }

  // Generate Facebook content (medium)
  try {
    const facebookContent = claudeKey
      ? await generateAIContent({
          platform: "facebook",
          template,
          maxLength: 1900,
          tone: "friendly and community-focused",
          requirements: [
            "Community-focused tone",
            "Include relatable examples or scenarios",
            "Encourage discussion and engagement",
            "Clear 14-day trial call-to-action",
            "Use engaging hashtags",
            "Share value and benefits clearly",
          ],
          selectedFormat,
          hookVariation: selectedHook,
        })
      : generateFallbackContent("facebook", template);

    platformContents.push({
      platform: "facebook",
      content: `${facebookContent.content}\n\n💼 Transform your business today! Get your 14-day free trial: build-desk.com`,
      hashtags: facebookContent.hashtags,
      media_urls: [],
      optimal_length: 2000,
      post_type: "medium",
      includes_url: true,
    });
  } catch (error) {
    logStep("Facebook AI generation failed, using fallback", error);
    const fallback = generateFallbackContent("facebook", template);
    platformContents.push({
      platform: "facebook",
      content: `${fallback.content}\n\n💼 Transform your business today! Get your 14-day free trial: build-desk.com`,
      hashtags: fallback.hashtags,
      media_urls: [],
      optimal_length: 2000,
      post_type: "medium",
      includes_url: true,
    });
  }

  // Generate Instagram content (medium with dynamic media)
  try {
    const randomMedia = await selectRandomInstagramMedia(supabaseClient);

    const instagramContent = claudeKey
      ? await generateAIContent({
          platform: "instagram",
          template,
          maxLength: 2000,
          tone: "visual and inspirational",
          requirements: [
            "Visual storytelling approach",
            "Inspirational and motivational tone",
            "Include emojis for visual appeal",
            "Strong 14-day trial call-to-action",
            "More hashtags for discoverability",
            "Mention 'link in bio' for URL",
          ],
          selectedFormat,
          hookVariation: selectedHook,
        })
      : generateFallbackContent("instagram", template);

    platformContents.push({
      platform: "instagram",
      content: `${instagramContent.content}\n\n🔗 Link in bio for your 14-day free trial!`,
      hashtags: [
        ...instagramContent.hashtags,
        "#BuildDeskTrial",
        "#ConstructionTech",
        "#SmallBusiness",
      ],
      media_urls: randomMedia,
      optimal_length: 2200,
      post_type: "medium",
      includes_url: true,
    });
  } catch (error) {
    logStep("Instagram AI generation failed, using fallback", error);
    const fallback = generateFallbackContent("instagram", template);
    platformContents.push({
      platform: "instagram",
      content: `${fallback.content}\n\n🔗 Link in bio for your 14-day free trial!`,
      hashtags: [
        ...fallback.hashtags,
        "#BuildDeskTrial",
        "#ConstructionTech",
        "#SmallBusiness",
      ],
      media_urls: [],
      optimal_length: 2200,
      post_type: "medium",
      includes_url: true,
    });
  }

  return platformContents;
}

async function sendToExternalWebhook(webhookUrl: string, data: any) {
  try {
    logStep("Sending data to external webhook", { url: webhookUrl });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BuildDesk-Social-Content-Generator/1.0",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const responseText = await response.text();
    logStep("Webhook sent successfully", {
      status: response.status,
      response: responseText,
    });

    return { success: true, status: response.status };
  } catch (error) {
    logStep("Webhook send failed", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    logStep("Social content generator received request");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Enhanced JSON parsing with better error handling
    let body;
    try {
      const requestText = await req.text();
      logStep("Request body text", { length: requestText.length, preview: requestText.substring(0, 200) });
      
      if (!requestText.trim()) {
        throw new Error("Empty request body");
      }
      
      body = JSON.parse(requestText);
      logStep("JSON parsed successfully", { keys: Object.keys(body) });
    } catch (parseError) {
      const errorObj = parseError as Error;
      logStep("JSON parsing failed", { 
        error: errorObj.message,
        requestMethod: req.method,
        contentType: req.headers.get("content-type")
      });
      
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body",
        details: errorObj.message,
        success: false,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      company_id,
      template_category = "random",
      webhook_url,
      trigger_type = "scheduled",
      queueId,
      queue_id, // Support both naming conventions
    } = body;

    const actualQueueId = queueId || queue_id;

    if (!company_id) {
      throw new Error("Company ID is required");
    }

    // Select random template or specific category
    let selectedTemplate: ContentTemplate;
    if (template_category === "random") {
      selectedTemplate =
        CONTENT_TEMPLATES[Math.floor(Math.random() * CONTENT_TEMPLATES.length)];
    } else {
      const categoryTemplates = CONTENT_TEMPLATES.filter(
        (t) => t.category === template_category
      );
      if (categoryTemplates.length === 0) {
        selectedTemplate = CONTENT_TEMPLATES[0];
      } else {
        selectedTemplate =
          categoryTemplates[
            Math.floor(Math.random() * categoryTemplates.length)
          ];
      }
    }

    logStep("Selected content template", selectedTemplate);

    // Generate platform-specific content with format diversity
    const platformContents = await generatePlatformContent(
      selectedTemplate,
      supabaseClient,
      company_id // Pass company_id for format diversity tracking
    );

    // Create social media posts in database
    const socialPostsCreated = [];
    for (const platformContent of platformContents) {
      const { data: socialPost, error: postError } = await supabaseClient
        .from("social_media_posts")
        .insert({
          company_id,
          title: `${selectedTemplate.topic} - ${platformContent.platform}`,
          content: platformContent.content,
          media_urls: JSON.stringify(platformContent.media_urls || []),
          platforms: JSON.stringify([{ platform: platformContent.platform }]),
          status: "draft",
          // Don't set created_by for automated posts to avoid foreign key constraint
        })
        .select()
        .single();

      if (postError) {
        logStep(`Error creating ${platformContent.platform} post`, postError);
        continue;
      }

      socialPostsCreated.push(socialPost);
    }

    logStep("Created social media posts", {
      count: socialPostsCreated.length,
      platforms: platformContents.map((p) => p.platform),
    });

    // Send to webhook if URL provided
    let webhookResult = null;
    const targetWebhook =
      webhook_url ||
      (
        await supabaseClient
          .from("automated_social_posts_config")
          .select("webhook_url")
          .eq("company_id", company_id)
          .single()
      ).data?.webhook_url;

    if (targetWebhook) {
      const webhookData = {
        timestamp: new Date().toISOString(),
        event: "social_content_automation",
        data: {
          template: selectedTemplate,
          social_posts: platformContents,
          platforms: {
            twitter: platformContents.find((p) => p.platform === "twitter"),
            non_twitter: platformContents.filter(
              (p) => p.platform !== "twitter"
            ),
            instagram: platformContents.find((p) => p.platform === "instagram"),
          },
          routing_data: {
            short_content: platformContents.filter(
              (p) => p.post_type === "short"
            ),
            medium_content: platformContents.filter(
              (p) => p.post_type === "medium"
            ),
            long_content: platformContents.filter(
              (p) => p.post_type === "long"
            ),
          },
          company_id,
          trigger_type,
        },
      };

      webhookResult = await sendToExternalWebhook(targetWebhook, webhookData);
    }

    // Log the automation attempt and update queue if this was from a queue item
    
    if (actualQueueId) {
      // Update the queue item with results
      await supabaseClient
        .from("automated_social_posts_queue")
        .update({
          status: webhookResult ? "completed" : "failed",
          processed_at: new Date().toISOString(),
          posts_created: socialPostsCreated.length,
          platforms_processed: platformContents.map((p) => p.platform),
          webhook_sent: !!webhookResult,
          error_message: webhookResult ? null : "Webhook send failed"
        })
        .eq("id", actualQueueId);
    }

    // Also log to automation logs for analytics
    await supabaseClient.from("social_media_automation_logs").insert({
      company_id,
      trigger_type,
      status: "completed",
      platforms_processed: platformContents.map((p) => p.platform),
      posts_created: socialPostsCreated.length,
      webhook_sent: !!webhookResult,
    });

    logStep("Social content generation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        template: selectedTemplate,
        platforms_processed: platformContents.map((p) => p.platform),
        social_posts_created: socialPostsCreated.length,
        webhook_sent: !!webhookResult,
        posts: socialPostsCreated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in social content generation", errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
