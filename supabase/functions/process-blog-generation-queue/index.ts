import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[BLOG-QUEUE] Starting queue processor");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending queue items
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('blog_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(3);

    if (queueError) {
      console.error("[BLOG-QUEUE] Error fetching queue:", queueError);
      throw queueError;
    }

    console.log(`[BLOG-QUEUE] Found ${queueItems?.length || 0} pending items`);

    if (!queueItems?.length) {
      return new Response(JSON.stringify({ 
        message: "No pending items", 
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processed = 0;

    for (const item of queueItems) {
      try {
        console.log(`[BLOG-QUEUE] Processing item ${item.id}`);

        // Mark as processing
        await supabaseClient
          .from('blog_generation_queue')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Generate blog content
        const { data: result, error: genError } = await supabaseClient.functions.invoke('enhanced-blog-ai-fixed', {
          body: {
            action: 'generate-auto-content',
            topic: item.suggested_topic || 'Construction Management Best Practices',
            customSettings: {
              company_id: item.company_id,
              queue_id: item.id
            }
          }
        });

        if (genError) {
          throw new Error(genError.message);
        }

        processed++;
        console.log(`[BLOG-QUEUE] Successfully processed item ${item.id}`);

      } catch (error: any) {
        console.error(`[BLOG-QUEUE] Error processing ${item.id}:`, error.message);

        // Mark as failed
        await supabaseClient
          .from('blog_generation_queue')
          .update({ 
            status: 'failed',
            error_message: error.message,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    console.log(`[BLOG-QUEUE] Completed processing ${processed} items`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("[BLOG-QUEUE] Fatal error:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});