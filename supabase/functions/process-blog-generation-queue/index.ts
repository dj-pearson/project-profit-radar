// Process Blog Generation Queue Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { requireSystemOrAdmin } from "../_shared/system-auth.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await requireSystemOrAdmin(req);
  if (denied) return denied;

  try {
    console.log("[BLOG-QUEUE] Starting queue processor");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let totalProcessed = 0;

    // Get pending queue items
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('blog_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (queueError) {
      console.error(`[BLOG-QUEUE] Error fetching queue:`, queueError);
      throw queueError;
    }

    console.log(`[BLOG-QUEUE] Found ${queueItems?.length || 0} pending items`);

    if (!queueItems?.length) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: "No pending items",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    for (const item of queueItems) {
      try {
        console.log(`[BLOG-QUEUE] Processing item ${item.id}`);

        // Claim the item. This was a plain update with its error discarded, and
        // supabase-js returns the error rather than throwing, so a failed claim
        // left the row at its old status and the next run generated the same
        // article again - paying for the model call twice. Matching on the
        // previous status makes the claim atomic against an overlapping run,
        // the same fix as enhanced-blog-ai (US-300).
        const { data: claimed, error: claimError } = await supabaseClient
          .from('blog_generation_queue')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .neq('status', 'processing')
          .select('id');

        if (claimError) {
          throw new Error(`Could not claim queue item: ${claimError.message}`);
        }

        if (!claimed || claimed.length === 0) {
          console.log(`[BLOG-QUEUE] Item ${item.id} already claimed, skipping`);
          continue;
        }

        const { data: result, error: genError } = await supabaseClient.functions.invoke('enhanced-blog-ai-fixed', {
          body: {
            action: 'generate-auto-content',
            topic: item.suggested_topic || 'Construction Management Best Practices',
            customSettings: {
              company_id: item.company_id,
              queue_id: item.id,
            }
          }
        });

        if (genError) {
          throw new Error(genError.message);
        }

        totalProcessed++;
        console.log(`[BLOG-QUEUE] Successfully processed item ${item.id}`);

      } catch (error: any) {
        console.error(`[BLOG-QUEUE] Error processing ${item.id}:`, error.message);

        // Mark as failed. If this is lost the item stays at 'processing' and
        // no retry ever picks it up (US-300).
        const { error: markFailedError } = await supabaseClient
          .from('blog_generation_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (markFailedError) {
          console.error(
            `[BLOG-QUEUE] Item ${item.id} is STUCK at 'processing' - could not mark it failed:`,
            markFailedError.message,
          );
        }
      }
    }

    console.log(`[BLOG-QUEUE] Completed processing ${totalProcessed} items`);

    return new Response(JSON.stringify({
      success: true,
      processed: totalProcessed,
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