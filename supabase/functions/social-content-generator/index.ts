import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

// Content templates for different topics
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
];

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

    const imageFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
    });

    if (imageFiles.length === 0) {
      logStep("No image files found in site-assets bucket");
      return [];
    }

    const publicUrls = imageFiles.map((file) => {
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
  const selectedMedia = [];

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
}: {
  platform: string;
  template: ContentTemplate;
  maxLength: number;
  tone: string;
  requirements: string[];
}) {
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

  const prompt = `You are a senior social media director for a successful B2B SaaS company. Create a compelling ${platform} post about "${
    template.topic
  }" that will engage ${template.target_audience} and drive trial signups.

Your post should:
- Hook readers with a compelling opening that addresses a real pain point
- Use industry-specific language that resonates with construction professionals
- Include concrete benefits and value propositions
- Sound authoritative yet approachable
- Drive action with a strong, specific call-to-action

Key Value Points to Weave In:
${template.key_points.map((point) => `• ${point}`).join("\n")}

Platform Requirements:
${requirements.map((req) => `• ${req}`).join("\n")}

Writing Style: ${tone}, but authoritative and results-focused
Character Limit: ${maxLength} characters (excluding hashtags)
Business Outcome Focus: ${template.cta_focus}

Your CTA should specifically mention BuildDesk's 14-day free trial and build-desk.com.

Examples of strong openings:
- "Still losing money on projects that go over budget?"
- "What if I told you there's a way to increase project profitability by 25%?"
- "The #1 mistake contractors make when managing project costs..."

Write like a seasoned marketing professional who understands both construction and technology.

Format your response as:
CONTENT: [your professional post content here]
HASHTAGS: [strategic hashtags separated by spaces]`;

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
        .filter((tag) => tag.startsWith("#"));
    } else if (hashtagsMatch2) {
      hashtags = hashtagsMatch2[1]
        .trim()
        .split(/\s+/)
        .filter((tag) => tag.startsWith("#"));
    } else if (hashtagsMatch3) {
      hashtags = hashtagsMatch3
        .join(" ")
        .split(/\s+/)
        .filter((tag) => tag.startsWith("#"));
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
    logStep(`${platform} AI generation failed`, {
      error_message: error.message,
      error_type: error.constructor.name,
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
  supabaseClient: any
): Promise<SocialPlatformContent[]> {
  const platformContents: SocialPlatformContent[] = [];
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

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
      logStep("JSON parsing failed", { 
        error: parseError.message,
        requestMethod: req.method,
        contentType: req.headers.get("content-type")
      });
      
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body",
        details: parseError.message,
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

    // Generate platform-specific content
    const platformContents = await generatePlatformContent(
      selectedTemplate,
      supabaseClient
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
