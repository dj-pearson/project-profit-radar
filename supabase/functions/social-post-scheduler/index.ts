import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active configurations where it's time to post
    const { data: dueConfigs, error: configError } = await supabaseClient
      .from("automated_social_posts_config")
      .select("*")
      .eq("enabled", true)
      .lt("next_post_at", new Date().toISOString());

    if (configError) {
      throw new Error(
        `Error fetching due configurations: ${configError.message}`
      );
    }

    if (!dueConfigs || dueConfigs.length === 0) {
      logStep("No posts due at this time");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No posts due",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep(`Found ${dueConfigs.length} configurations due for posting`);

    const results = [];

    for (const config of dueConfigs) {
      try {
        logStep(`Processing config for company ${config.company_id}`);

        // Select content from library
        const { data: contentOptions, error: contentError } =
          await supabaseClient
            .from("automated_social_content_library")
            .select("*")
            .eq("active", true)
            .in("content_type", config.content_types)
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

        // Update config with next post time
        const nextPostTime = new Date();
        nextPostTime.setHours(
          nextPostTime.getHours() + config.post_interval_hours
        );

        await supabaseClient
          .from("automated_social_posts_config")
          .update({
            next_post_at: nextPostTime.toISOString(),
          })
          .eq("id", config.id);

        results.push({
          company_id: config.company_id,
          content_topic: selectedContent.topic,
          queue_id: queueEntry.id,
          next_post_at: nextPostTime.toISOString(),
          success: true,
        });

        logStep(
          `Successfully processed config for company ${config.company_id}`
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
