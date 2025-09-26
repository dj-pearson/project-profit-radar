
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, data?: any) => {
  console.log(`[Social Post Scheduler] ${step}:`, data || "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Social post scheduler started");

    // Parse request body for manual trigger parameters
    let requestBody: any = {};
    try {
      const contentType = req.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        requestBody = await req.json();
      }
    } catch (e) {
      logStep("Failed to parse request body", e);
    }

    const {
      manual_trigger,
      company_id: targetCompanyId,
      content_type: targetContentType,
    } = requestBody;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let dueConfigs;
    let configError;

    if (manual_trigger && targetCompanyId) {
      logStep("Manual trigger detected for company", targetCompanyId);

      const result = await supabaseClient
        .from("automated_social_posts_config")
        .select("*")
        .eq("company_id", targetCompanyId)
        .eq("enabled", true);

      dueConfigs = result.data;
      configError = result.error;
    } else {
      // Regular scheduled check - get all active configurations where it's time to post
      const result = await supabaseClient
        .from("automated_social_posts_config")
        .select("*")
        .eq("enabled", true)
        .eq("auto_schedule", true)
        .lt("next_post_at", new Date().toISOString());

      dueConfigs = result.data;
      configError = result.error;
    }

    if (configError) {
      throw new Error(
        `Error fetching due configurations: ${configError.message}`
      );
    }

    if (!dueConfigs || dueConfigs.length === 0) {
      const message = manual_trigger
        ? "No enabled configuration found for manual trigger"
        : "No posts due at this time";
      logStep(message);
      return new Response(
        JSON.stringify({
          success: true,
          message,
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep(
      `Found ${dueConfigs.length} configurations ${
        manual_trigger ? "for manual trigger" : "due for posting"
      }`
    );

    const results: any[] = [];

    for (const config of dueConfigs) {
      try {
        logStep(`Processing config for company ${config.company_id}`);

        // Filter content types if specified in manual trigger
        const contentTypes = targetContentType
          ? [targetContentType].filter((type) =>
              config.content_types.includes(type)
            )
          : config.content_types;

        if (contentTypes.length === 0) {
          logStep(`No matching content types for company ${config.company_id}`);
          continue;
        }

        // Select content from library
        const { data: contentOptions, error: contentError } =
          await supabaseClient
            .from("automated_social_content_library")
            .select("*")
            .eq("active", true)
            .in("content_type", contentTypes)
            .order("priority", { ascending: false })
            .order("usage_count", { ascending: true })
            .limit(10);

        if (contentError || !contentOptions || contentOptions.length === 0) {
          logStep(
            `No content available for company ${config.company_id}`,
            contentError
          );
          continue;
        }

        // Weighted random selection based on priority and usage
        const weightedContent = contentOptions.map((content) => ({
          ...content,
          weight: content.priority * (1 / (content.usage_count + 1)),
        }));

        const totalWeight = weightedContent.reduce(
          (sum, content) => sum + content.weight,
          0
        );
        let random = Math.random() * totalWeight;
        let selectedContent = weightedContent[0];

        for (const content of weightedContent) {
          random -= content.weight;
          if (random <= 0) {
            selectedContent = content;
            break;
          }
        }

        logStep(`Selected content: ${selectedContent.topic}`);

        // Add to queue
        const { data: queueEntry, error: queueError } = await supabaseClient
          .from("automated_social_posts_queue")
          .insert({
            company_id: config.company_id,
            content_type: selectedContent.content_type,
            topic: selectedContent.topic,
            scheduled_for: new Date().toISOString(),
            status: "pending",
          })
          .select()
          .single();

        if (queueError) {
          logStep(
            `Error adding to queue for company ${config.company_id}`,
            queueError
          );
          continue;
        }

        // Call the social content generator
        const { data: generatorResult, error: generatorError } =
          await supabaseClient.functions.invoke("social-content-generator", {
            body: {
              queue_id: queueEntry.id,
              company_id: config.company_id,
              content_library_id: selectedContent.id,
              webhook_url: config.webhook_url,
              platforms: config.platforms,
            },
          });

        if (generatorError) {
          logStep(
            `Error calling generator for company ${config.company_id}`,
            generatorError
          );

          // Update queue entry with error
          await supabaseClient
            .from("automated_social_posts_queue")
            .update({
              status: "failed",
              error_message: generatorError.message,
              processed_at: new Date().toISOString(),
            })
            .eq("id", queueEntry.id);

          continue;
        }

        // Update content library usage
        await supabaseClient
          .from("automated_social_content_library")
          .update({
            usage_count: selectedContent.usage_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", selectedContent.id);

        // Update config with next post time (only for scheduled posts, not manual triggers)
        let nextPostTime = null;
        if (!manual_trigger) {
          const intervalHours = config.post_interval_hours || 48; // Default to 48 hours
          nextPostTime = new Date();
          nextPostTime.setHours(nextPostTime.getHours() + intervalHours);

          await supabaseClient
            .from("automated_social_posts_config")
            .update({
              next_post_at: nextPostTime.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", config.id);
        }

        results.push({
          company_id: config.company_id,
          content_topic: selectedContent.topic,
          queue_id: queueEntry.id,
          next_post_at: nextPostTime ? nextPostTime.toISOString() : null,
          interval_hours: config.post_interval_hours || 48,
          success: true,
        });

        logStep(
          `Successfully processed config for company ${config.company_id} with ${config.post_interval_hours || 48}h interval`
        );
      } catch (error) {
        logStep(
          `Error processing config for company ${config.company_id}`,
          error
        );
        results.push({
          company_id: config.company_id,
          success: false,
          error: error.message,
        });
      }
    }

    logStep(`Scheduler completed, processed ${results.length} configurations`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);

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
