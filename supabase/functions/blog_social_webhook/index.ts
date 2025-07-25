import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface SocialPlatformContent {
  platform: string;
  content: string;
  hashtags?: string[];
  media_urls?: string[];
  optimal_length: number;
  post_type: "short" | "medium" | "long";
  includes_url: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  featured_image_url?: string;
  status: string;
  slug: string;
}

interface StorageAsset {
  name: string;
  url: string;
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

// Dynamic Instagram media selection from Supabase storage
async function getInstagramMediaFromStorage(
  supabaseClient: any
): Promise<string[]> {
  try {
    logStep("Fetching Instagram media from Supabase storage");

    // List all files in the site-assets bucket
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

    // Filter for image files (jpg, jpeg, png, gif, webp)
    const imageFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
    });

    if (imageFiles.length === 0) {
      logStep("No image files found in site-assets bucket");
      return [];
    }

    // Transform to public URLs
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

// Select random Instagram media from the dynamic list
async function selectRandomInstagramMedia(
  supabaseClient: any
): Promise<string[]> {
  const availableMedia = await getInstagramMediaFromStorage(supabaseClient);

  if (availableMedia.length === 0) {
    logStep("No media available, using fallback");
    return [];
  }

  // Select 1-2 random media items
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

    // Generate the blog post URL
    const blogUrl = `https://build-desk.com/blog/${blogPost.slug}`;

    // Generate platform-specific content with enhanced structure
    const platformContents = await generateEnhancedPlatformContent(
      blogPost,
      blogUrl,
      socialSettings,
      supabaseClient
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
          created_by: blogPost.created_by, // Use the blog post's creator instead of company_id
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

    // Enhanced webhook payload with structured platform data
    const enhancedWebhookData = {
      blog_post: {
        ...blogPost,
        url: blogUrl,
      },
      social_posts: platformContents,
      platforms: {
        twitter: platformContents.find((p) => p.platform === "twitter"),
        non_twitter: platformContents.filter((p) => p.platform !== "twitter"),
        instagram: platformContents.find((p) => p.platform === "instagram"),
      },
      routing_data: {
        short_content: platformContents.filter((p) => p.post_type === "short"),
        medium_content: platformContents.filter(
          (p) => p.post_type === "medium"
        ),
        long_content: platformContents.filter((p) => p.post_type === "long"),
      },
      company_id,
      trigger_type,
    };

    // Send to external webhook (Make.com or Buffer) if configured
    if (webhook_url || socialSettings?.webhook_url) {
      const targetWebhook = webhook_url || socialSettings.webhook_url;
      await sendToExternalWebhook(targetWebhook, enhancedWebhookData);
    }

    logStep("Social media automation completed", {
      postsCreated: socialPosts.length,
      platforms: platformContents.map((p) => p.platform),
      routing_structure: "enhanced_with_dynamic_instagram_media",
    });

    return new Response(
      JSON.stringify({
        success: true,
        blog_post_id,
        social_posts_created: socialPosts.length,
        platforms_processed: platformContents.map((p) => p.platform),
        posts: socialPosts,
        webhook_data: enhancedWebhookData,
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

async function generateEnhancedPlatformContent(
  blogPost: BlogPost,
  blogUrl: string,
  settings: any,
  supabaseClient: any
): Promise<SocialPlatformContent[]> {
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

  if (!claudeKey) {
    return generateBasicEnhancedPlatformContent(
      blogPost,
      blogUrl,
      supabaseClient
    );
  }

  const platformContents: SocialPlatformContent[] = [];

  // Twitter - Short content with URL
  try {
    const twitterContent = await generateAIContent({
      platform: "twitter",
      blogPost,
      blogUrl,
      maxLength: 250, // Leave room for URL
      tone: "concise and engaging",
      requirements: [
        "Maximum 250 characters to leave room for URL",
        "Include key insight from blog post",
        "End with a call to action",
        "Use relevant hashtags",
        "Professional yet engaging tone",
      ],
    });

    platformContents.push({
      platform: "twitter",
      content: `${twitterContent.content}\n\n${blogUrl}`,
      hashtags: twitterContent.hashtags,
      media_urls: blogPost.featured_image_url
        ? [blogPost.featured_image_url]
        : [],
      optimal_length: 280,
      post_type: "short",
      includes_url: true,
    });
  } catch (error) {
    logStep("Twitter AI generation failed, using fallback", error);
    platformContents.push(generateTwitterFallback(blogPost, blogUrl));
  }

  // LinkedIn - Longer professional content with URL
  try {
    const linkedinContent = await generateAIContent({
      platform: "linkedin",
      blogPost,
      blogUrl,
      maxLength: 2800, // Leave room for URL
      tone: "professional and insightful",
      requirements: [
        "Professional tone suitable for industry leaders",
        "Include 2-3 key insights from the blog",
        "Ask a thought-provoking question",
        "Use relevant industry hashtags",
        "Encourage discussion and engagement",
      ],
    });

    platformContents.push({
      platform: "linkedin",
      content: `${linkedinContent.content}\n\nRead the full article: ${blogUrl}`,
      hashtags: linkedinContent.hashtags,
      media_urls: blogPost.featured_image_url
        ? [blogPost.featured_image_url]
        : [],
      optimal_length: 3000,
      post_type: "long",
      includes_url: true,
    });
  } catch (error) {
    logStep("LinkedIn AI generation failed, using fallback", error);
    platformContents.push(generateLinkedInFallback(blogPost, blogUrl));
  }

  // Facebook - Medium length engaging content with URL
  try {
    const facebookContent = await generateAIContent({
      platform: "facebook",
      blogPost,
      blogUrl,
      maxLength: 1900, // Leave room for URL
      tone: "engaging and community-focused",
      requirements: [
        "Community-focused and discussion-starting",
        "Share key insights in an accessible way",
        "Ask questions to encourage comments",
        "Use emojis appropriately",
        "Create a sense of shared experience",
      ],
    });

    platformContents.push({
      platform: "facebook",
      content: `${facebookContent.content}\n\nLearn more: ${blogUrl}`,
      hashtags: facebookContent.hashtags,
      media_urls: blogPost.featured_image_url
        ? [blogPost.featured_image_url]
        : [],
      optimal_length: 2000,
      post_type: "medium",
      includes_url: true,
    });
  } catch (error) {
    logStep("Facebook AI generation failed, using fallback", error);
    platformContents.push(generateFacebookFallback(blogPost, blogUrl));
  }

  // Instagram - Visual content with dynamic media from Supabase + URL
  try {
    const instagramContent = await generateAIContent({
      platform: "instagram",
      blogPost,
      blogUrl,
      maxLength: 2000, // Leave room for URL and hashtags
      tone: "visual and inspiring",
      requirements: [
        "Visual and inspiring language",
        "Describe the value/transformation",
        "Use story-telling approach",
        "Include call-to-action in bio link style",
        "Lots of relevant hashtags",
      ],
    });

    // Get random media from Supabase storage
    const randomMedia = await selectRandomInstagramMedia(supabaseClient);

    platformContents.push({
      platform: "instagram",
      content: `${instagramContent.content}\n\n🔗 Link in bio: ${blogUrl}`,
      hashtags: instagramContent.hashtags,
      media_urls:
        randomMedia.length > 0
          ? randomMedia
          : blogPost.featured_image_url
          ? [blogPost.featured_image_url]
          : [],
      optimal_length: 2200,
      post_type: "medium",
      includes_url: true,
    });
  } catch (error) {
    logStep("Instagram AI generation failed, using fallback", error);
    platformContents.push(
      await generateInstagramFallback(blogPost, blogUrl, supabaseClient)
    );
  }

  return platformContents;
}

async function generateAIContent({
  platform,
  blogPost,
  blogUrl,
  maxLength,
  tone,
  requirements,
}: {
  platform: string;
  blogPost: BlogPost;
  blogUrl: string;
  maxLength: number;
  tone: string;
  requirements: string[];
}) {
  const claudeKey = Deno.env.get("CLAUDE_API_KEY");

  const prompt = `Create ${tone} social media content for ${platform} based on this blog post:

Title: ${blogPost.title}
Excerpt: ${blogPost.excerpt}
Content: ${blogPost.body.substring(0, 1500)}...

Requirements:
${requirements.map((req) => `- ${req}`).join("\n")}
- Maximum ${maxLength} characters (excluding URL which will be added separately)
- URL will be added separately, don't include it in your response
- Create engaging content that provides value
- End with relevant hashtags on new lines

Return format:
Main content
#hashtag1 #hashtag2 #hashtag3`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${claudeKey}`,
      "Content-Type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Claude API Error", { status: response.status, error: errorText });
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const claudeResponse = await response.json();
  const fullContent = claudeResponse.content?.[0]?.text || "";

  logStep("Claude API Response", {
    platform,
    contentLength: fullContent.length,
    truncated: fullContent.substring(0, 100) + "...",
  });

  // Split content and hashtags
  const lines = fullContent.split("\n");
  const contentLines = [];
  const hashtags = [];

  for (const line of lines) {
    if (line.trim().startsWith("#")) {
      const lineHashtags = line.match(/#\w+/g) || [];
      hashtags.push(...lineHashtags);
    } else if (line.trim()) {
      contentLines.push(line.trim());
    }
  }

  return {
    content: contentLines.join("\n"),
    hashtags: hashtags,
  };
}

function generateBasicEnhancedPlatformContent(
  blogPost: BlogPost,
  blogUrl: string,
  supabaseClient: any
): Promise<SocialPlatformContent[]> {
  return Promise.all([
    Promise.resolve(generateTwitterFallback(blogPost, blogUrl)),
    Promise.resolve(generateLinkedInFallback(blogPost, blogUrl)),
    Promise.resolve(generateFacebookFallback(blogPost, blogUrl)),
    generateInstagramFallback(blogPost, blogUrl, supabaseClient),
  ]);
}

function generateTwitterFallback(
  blogPost: BlogPost,
  blogUrl: string
): SocialPlatformContent {
  const excerpt =
    blogPost.excerpt.length > 180
      ? blogPost.excerpt.substring(0, 180) + "..."
      : blogPost.excerpt;

  return {
    platform: "twitter",
    content: `🚧 ${blogPost.title}\n\n${excerpt}\n\n${blogUrl}`,
    hashtags: ["#construction", "#builddesk", "#projectmanagement"],
    media_urls: blogPost.featured_image_url
      ? [blogPost.featured_image_url]
      : [],
    optimal_length: 280,
    post_type: "short",
    includes_url: true,
  };
}

function generateLinkedInFallback(
  blogPost: BlogPost,
  blogUrl: string
): SocialPlatformContent {
  return {
    platform: "linkedin",
    content: `🏗️ ${blogPost.title}\n\n${blogPost.excerpt}\n\nIn the construction industry, staying ahead means embracing the right tools and strategies. This article explores practical insights that can transform how you manage projects and drive business growth.\n\nWhat challenges are you facing in your construction business? I'd love to hear your thoughts in the comments.\n\nRead the full article: ${blogUrl}`,
    hashtags: [
      "#construction",
      "#projectmanagement",
      "#builddesk",
      "#constructionindustry",
      "#businessgrowth",
    ],
    media_urls: blogPost.featured_image_url
      ? [blogPost.featured_image_url]
      : [],
    optimal_length: 3000,
    post_type: "long",
    includes_url: true,
  };
}

function generateFacebookFallback(
  blogPost: BlogPost,
  blogUrl: string
): SocialPlatformContent {
  return {
    platform: "facebook",
    content: `🏗️ ${blogPost.title}\n\n${blogPost.excerpt}\n\nEvery construction professional knows the challenges of managing projects, teams, and budgets effectively. This article shares insights that could make a real difference in your daily operations.\n\nWhat's been your biggest project management challenge lately? Share your experiences below! 👇\n\nLearn more: ${blogUrl}`,
    hashtags: [
      "#construction",
      "#builddesk",
      "#projectmanagement",
      "#contractors",
    ],
    media_urls: blogPost.featured_image_url
      ? [blogPost.featured_image_url]
      : [],
    optimal_length: 2000,
    post_type: "medium",
    includes_url: true,
  };
}

async function generateInstagramFallback(
  blogPost: BlogPost,
  blogUrl: string,
  supabaseClient: any
): Promise<SocialPlatformContent> {
  const randomMedia = await selectRandomInstagramMedia(supabaseClient);

  return {
    platform: "instagram",
    content: `🏗️ ${blogPost.title}\n\n${blogPost.excerpt.substring(
      0,
      150
    )}...\n\nSwipe to see how successful contractors are transforming their businesses with the right tools and strategies! 💪\n\n🔗 Link in bio: ${blogUrl}`,
    hashtags: [
      "#construction",
      "#builddesk",
      "#projectmanagement",
      "#contractors",
      "#constructionlife",
      "#buildingbusiness",
      "#constructiontech",
      "#projectsuccess",
      "#constructionindustry",
      "#buildingprofessionals",
    ],
    media_urls:
      randomMedia.length > 0
        ? randomMedia
        : blogPost.featured_image_url
        ? [blogPost.featured_image_url]
        : [],
    optimal_length: 2200,
    post_type: "medium",
    includes_url: true,
  };
}

async function sendToExternalWebhook(webhookUrl: string, data: any) {
  try {
    logStep("Sending enhanced webhook data", {
      url: webhookUrl,
      platforms: data.social_posts?.length,
      has_routing_data: !!data.routing_data,
      has_dynamic_instagram_media:
        !!data.platforms?.instagram?.media_urls?.length,
    });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BuildDesk-Blog-Social-Automation/2.1",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "blog_post_social_automation_enhanced",
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`
      );
    }

    logStep("Enhanced webhook delivery successful");
  } catch (error) {
    logStep("Enhanced webhook delivery failed", error);
  }
}
