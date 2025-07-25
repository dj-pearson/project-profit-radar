import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface SocialPlatformContent {
  platform: string;
  content: string;
  hashtags?: string[];
  media_urls?: string[];
  optimal_length: number;
}

interface BlogPost {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  featured_image_url?: string;
  status: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, data?: any) => {
  console.log(`[Blog Social Webhook] ${step}:`, data || "");
};

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
    logStep("Blog social webhook received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const {
      blog_post_id,
      company_id,
      trigger_type = "manual",
      webhook_url,
    } = body;

    if (!blog_post_id || !company_id) {
      throw new Error("blog_post_id and company_id are required");
    }

    // Get blog post
    const { data: blogPost, error: blogError } = await supabaseClient
      .from("blog_posts")
      .select("*")
      .eq("id", blog_post_id)
      .single();

    if (blogError || !blogPost) {
      throw new Error("Blog post not found");
    }

    logStep("Processing blog post", { title: blogPost.title });

    // Get company's social media settings
    const { data: socialSettings, error: settingsError } = await supabaseClient
      .from("social_media_automation_settings")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      throw new Error(
        `Error fetching social settings: ${settingsError.message}`
      );
    }

    // Generate platform-specific content
    const platformContents = await generatePlatformContent(
      blogPost,
      socialSettings
    );

    // Create social media posts in database
    const socialPosts = [];
    for (const platformContent of platformContents) {
      const { data: socialPost, error: postError } = await supabaseClient
        .from("social_media_posts")
        .insert({
          company_id,
          title: `${blogPost.title} - ${platformContent.platform}`,
          content: platformContent.content,
          content_type: "text",
          media_urls: JSON.stringify(platformContent.media_urls || []),
          platforms: JSON.stringify([{ platform: platformContent.platform }]),
          status: "draft",
          blog_post_id: blog_post_id,
          created_by: company_id,
        })
        .select()
        .single();

      if (postError) {
        logStep("Error creating social post", {
          platform: platformContent.platform,
          error: postError.message,
        });
        continue;
      }

      socialPosts.push({
        ...socialPost,
        platform_content: platformContent,
      });
    }

    // Send to external webhook (Make.com or Buffer) if configured
    if (webhook_url || socialSettings?.webhook_url) {
      const targetWebhook = webhook_url || socialSettings.webhook_url;
      await sendToExternalWebhook(targetWebhook, {
        blog_post: blogPost,
        social_posts: platformContents,
        company_id,
        trigger_type,
      });
    }

    logStep("Social media automation completed", {
      postsCreated: socialPosts.length,
      platforms: platformContents.map((p) => p.platform),
    });

    return new Response(
      JSON.stringify({
        success: true,
        blog_post_id,
        social_posts_created: socialPosts.length,
        platforms_processed: platformContents.map((p) => p.platform),
        posts: socialPosts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

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

async function generatePlatformContent(
  blogPost: BlogPost,
  settings: any
): Promise<SocialPlatformContent[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    // Fallback to basic content generation
    return generateBasicPlatformContent(blogPost);
  }

  const platforms = [
    { name: "linkedin", maxLength: 3000, tone: "professional" },
    { name: "twitter", maxLength: 280, tone: "concise" },
    { name: "facebook", maxLength: 2000, tone: "engaging" },
    { name: "instagram", maxLength: 2200, tone: "visual" },
  ];

  const platformContents: SocialPlatformContent[] = [];

  for (const platform of platforms) {
    try {
      const prompt = `Transform this blog post into ${
        platform.tone
      } social media content for ${platform.name}:

Title: ${blogPost.title}
Excerpt: ${blogPost.excerpt}
Content: ${blogPost.body.substring(0, 1000)}...

Requirements:
- Maximum ${platform.maxLength} characters
- ${platform.tone} tone
- Include relevant hashtags
- Make it engaging for ${platform.name} audience
- Extract key insights from the blog post

Return only the social media post content, followed by hashtags on a new line.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (response.ok) {
        const aiResponse = await response.json();
        const content = aiResponse.choices[0]?.message?.content || "";

        // Extract hashtags from the content
        const lines = content.split("\n");
        const mainContent = lines[0];
        const hashtags = lines.slice(1).join(" ").match(/#\w+/g) || [];

        platformContents.push({
          platform: platform.name,
          content: mainContent,
          hashtags,
          media_urls: blogPost.featured_image_url
            ? [blogPost.featured_image_url]
            : [],
          optimal_length: platform.maxLength,
        });
      } else {
        // Fallback for this platform
        const fallback = generateBasicPlatformContent(blogPost, platform.name);
        platformContents.push(fallback[0]);
      }
    } catch (error) {
      logStep(`Error generating AI content for ${platform.name}`, error);
      // Fallback for this platform
      const fallback = generateBasicPlatformContent(blogPost, platform.name);
      platformContents.push(fallback[0]);
    }
  }

  return platformContents;
}

function generateBasicPlatformContent(
  blogPost: BlogPost,
  specificPlatform?: string
): SocialPlatformContent[] {
  const platforms = specificPlatform
    ? [specificPlatform]
    : ["linkedin", "twitter", "facebook", "instagram"];

  return platforms.map((platform) => {
    let content = "";
    let hashtags = ["#construction", "#builddesk"];

    switch (platform) {
      case "linkedin":
        content = `🏗️ New insight: ${blogPost.title}\n\n${blogPost.excerpt}\n\nRead the full article to discover more construction industry best practices.`;
        hashtags = [
          "#construction",
          "#projectmanagement",
          "#builddesk",
          "#industry",
        ];
        break;
      case "twitter":
        content = `🚧 ${blogPost.title.substring(0, 200)}...\n\nFull insights:`;
        hashtags = ["#construction", "#builddesk"];
        break;
      case "facebook":
        content = `🏗️ ${blogPost.title}\n\n${blogPost.excerpt}\n\nWhat are your thoughts on this? Share your experience in the comments!`;
        hashtags = ["#construction", "#builddesk", "#projectmanagement"];
        break;
      case "instagram":
        content = `🏗️ ${blogPost.title}\n\n${blogPost.excerpt.substring(
          0,
          150
        )}...\n\nSwipe to read more insights! 👆`;
        hashtags = [
          "#construction",
          "#builddesk",
          "#projectmanagement",
          "#industry",
          "#business",
        ];
        break;
    }

    return {
      platform,
      content,
      hashtags,
      media_urls: blogPost.featured_image_url
        ? [blogPost.featured_image_url]
        : [],
      optimal_length: platform === "twitter" ? 280 : 2000,
    };
  });
}

async function sendToExternalWebhook(webhookUrl: string, data: any) {
  try {
    logStep("Sending to external webhook", { url: webhookUrl });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BuildDesk-Blog-Social-Automation/1.0",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "blog_post_social_automation",
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`
      );
    }

    logStep("External webhook successful");
  } catch (error) {
    logStep("External webhook failed", error);
    // Don't throw - we still want the internal process to succeed
  }
}
