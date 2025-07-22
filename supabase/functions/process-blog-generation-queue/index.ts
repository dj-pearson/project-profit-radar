import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[BLOG-QUEUE-PROCESSOR] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Blog generation queue processor started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending queue items that are due for processing
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('blog_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process up to 10 items at a time

    if (queueError) {
      logStep("Error fetching queue items", { error: queueError });
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      logStep("No pending queue items to process");
      return new Response(JSON.stringify({ 
        message: "No pending items", 
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep("Processing queue items", { count: queueItems.length });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each queue item
    for (const item of queueItems) {
      try {
        logStep("Processing queue item", { 
          id: item.id, 
          company_id: item.company_id,
          topic: item.suggested_topic 
        });

        // Mark as processing
        await supabaseClient
          .from('blog_generation_queue')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Call the enhanced blog AI function to generate content
        const { data: generationResult, error: generationError } = await supabaseClient.functions.invoke('enhanced-blog-ai', {
          body: {
            action: 'process-queue-item',
            queueId: item.id
          }
        });

        if (generationError) {
          throw new Error(`Generation failed: ${generationError.message}`);
        }

        results.succeeded++;
        logStep("Successfully processed queue item", { id: item.id });

        // Queue the next generation for this company
        await queueNextGeneration(supabaseClient, item.company_id);

      } catch (error: any) {
        logStep("Error processing queue item", { 
          id: item.id, 
          error: error.message 
        });

        // Update queue item with error
        const retryCount = item.retry_count + 1;
        const shouldRetry = retryCount < item.max_retries;

        await supabaseClient
          .from('blog_generation_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            processing_completed_at: new Date().toISOString(),
            error_message: error.message,
            retry_count: retryCount,
            // If retrying, schedule for 1 hour later
            scheduled_for: shouldRetry ? 
              new Date(Date.now() + 60 * 60 * 1000).toISOString() : 
              item.scheduled_for
          })
          .eq('id', item.id);

        results.failed++;
        results.errors.push(`Item ${item.id}: ${error.message}`);
      }

      results.processed++;
    }

    // Check for companies that need their next generation scheduled
    await checkAndScheduleNextGenerations(supabaseClient);

    logStep("Queue processing completed", results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in queue processor", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function queueNextGeneration(supabaseClient: any, companyId: string) {
  try {
    logStep("Queueing next generation", { companyId });

    // Get auto-generation settings for this company
    const { data: settings, error: settingsError } = await supabaseClient
      .from('blog_auto_generation_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      logStep("No enabled auto-generation settings found", { companyId });
      return;
    }

    // Calculate next generation time using the database function
    const { data: nextTime, error: timeError } = await supabaseClient
      .rpc('calculate_next_generation_time', {
        frequency: settings.generation_frequency,
        generation_time: settings.generation_time,
        timezone: settings.generation_timezone
      });

    if (timeError) {
      logStep("Error calculating next generation time", { error: timeError });
      return;
    }

    // Update settings with next generation time
    await supabaseClient
      .from('blog_auto_generation_settings')
      .update({
        last_generation_at: new Date().toISOString(),
        next_generation_at: nextTime,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId);

    // Add to generation queue
    await supabaseClient
      .from('blog_generation_queue')
      .insert([{
        company_id: companyId,
        scheduled_for: nextTime,
        ai_provider: settings.preferred_ai_provider,
        ai_model: settings.preferred_model,
        generation_type: 'scheduled',
        content_parameters: {
          target_word_count: settings.target_word_count,
          content_style: settings.content_style,
          industry_focus: settings.industry_focus,
          target_keywords: settings.target_keywords,
          seo_focus: settings.seo_focus,
          optimize_for_geographic: settings.optimize_for_geographic,
          target_locations: settings.target_locations,
          geo_optimization: settings.geo_optimization,
          perplexity_optimization: settings.perplexity_optimization,
          ai_search_optimization: settings.ai_search_optimization,
          topic_diversity_enabled: settings.topic_diversity_enabled,
          minimum_topic_gap_days: settings.minimum_topic_gap_days,
          content_analysis_depth: settings.content_analysis_depth,
          auto_publish: settings.auto_publish,
          publish_as_draft: settings.publish_as_draft,
          require_review: settings.require_review,
          notify_on_generation: settings.notify_on_generation,
          notification_emails: settings.notification_emails,
          custom_instructions: settings.custom_instructions,
          brand_voice_guidelines: settings.brand_voice_guidelines,
          model_temperature: settings.model_temperature,
          fallback_model: settings.fallback_model
        }
      }]);

    logStep("Next generation queued successfully", { 
      companyId, 
      nextTime: nextTime 
    });

  } catch (error: any) {
    logStep("Error queueing next generation", { 
      companyId, 
      error: error.message 
    });
  }
}

async function checkAndScheduleNextGenerations(supabaseClient: any) {
  try {
    logStep("Checking for companies that need next generation scheduled");

    // Find companies with enabled auto-generation but no pending/scheduled items
    const { data: companies, error: companiesError } = await supabaseClient
      .from('blog_auto_generation_settings')
      .select('company_id, generation_frequency, generation_time, generation_timezone, preferred_ai_provider, preferred_model, last_generation_at, next_generation_at')
      .eq('is_enabled', true);

    if (companiesError) {
      logStep("Error fetching companies", { error: companiesError });
      return;
    }

    for (const company of companies || []) {
      // Check if this company has any pending queue items
      const { data: pendingItems, error: pendingError } = await supabaseClient
        .from('blog_generation_queue')
        .select('id')
        .eq('company_id', company.company_id)
        .in('status', ['pending', 'processing'])
        .limit(1);

      if (pendingError) {
        logStep("Error checking pending items", { 
          companyId: company.company_id, 
          error: pendingError 
        });
        continue;
      }

      // If no pending items and no next generation scheduled, or next generation is overdue
      const now = new Date();
      const nextGen = company.next_generation_at ? new Date(company.next_generation_at) : null;
      const needsScheduling = !pendingItems?.length && (!nextGen || nextGen <= now);

      if (needsScheduling) {
        logStep("Company needs next generation scheduled", { 
          companyId: company.company_id 
        });
        await queueNextGeneration(supabaseClient, company.company_id);
      }
    }

  } catch (error: any) {
    logStep("Error in checkAndScheduleNextGenerations", { error: error.message });
  }
} 