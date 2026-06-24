import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user from the auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { action, ...params } = await req.json();

    // Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioAuth = btoa(`${accountSid}:${authToken}`);
    const twilioBaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

    let result;

    switch (action) {
      case "initiate_call": {
        // Initiate an outbound call
        const { to, leadId, contactId, opportunityId, dealId, companyId } =
          params;

        const callParams = new URLSearchParams({
          To: to,
          From: twilioPhone,
          Record: "true",
          RecordingStatusCallback: `${Deno.env.get(
            "SUPABASE_URL"
          )}/functions/v1/twilio-calling?action=recording_callback`,
        });

        const callResponse = await fetch(`${twilioBaseUrl}/Calls.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: callParams,
        });

        if (!callResponse.ok) {
          const error = await callResponse.text();
          throw new Error(`Twilio API error: ${error}`);
        }

        const callData = await callResponse.json();

        // Log the call in the database
        const { data: callLog, error: insertError } = await supabaseClient
          .from("call_logs")
          .insert({
            company_id: companyId,
            caller_id: user.id,
            caller_phone: twilioPhone,
            callee_phone: to,
            lead_id: leadId,
            contact_id: contactId,
            opportunity_id: opportunityId,
            deal_id: dealId,
            call_sid: callData.sid,
            direction: "outbound",
            status: callData.status,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        result = { success: true, call: callData, callLog };
        break;
      }

      case "get_call_status": {
        // Get status of an existing call
        const { callSid } = params;

        const statusResponse = await fetch(
          `${twilioBaseUrl}/Calls/${callSid}.json`,
          {
            headers: {
              Authorization: `Basic ${twilioAuth}`,
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to fetch call status");
        }

        const statusData = await statusResponse.json();

        // Update call log
        await supabaseClient
          .from("call_logs")
          .update({
            status: statusData.status,
            duration_seconds: parseInt(statusData.duration || "0"),
            ended_at:
              statusData.status === "completed" ? new Date().toISOString() : null,
          })
          .eq("call_sid", callSid);

        result = { success: true, status: statusData };
        break;
      }

      case "recording_callback": {
        // Handle recording callback from Twilio
        const formData = await req.formData();
        const callSid = formData.get("CallSid")?.toString();
        const recordingSid = formData.get("RecordingSid")?.toString();
        const recordingUrl = formData.get("RecordingUrl")?.toString();
        const recordingDuration = formData.get("RecordingDuration")?.toString();

        if (callSid && recordingSid && recordingUrl) {
          await supabaseClient
            .from("call_logs")
            .update({
              recording_sid: recordingSid,
              recording_url: recordingUrl,
              recording_duration_seconds: parseInt(recordingDuration || "0"),
              transcription_status: "pending",
            })
            .eq("call_sid", callSid);
        }

        result = { success: true };
        break;
      }

      case "get_recording": {
        // Get recording URL with auth
        const { recordingSid } = params;

        const recordingUrl = `${twilioBaseUrl}/Recordings/${recordingSid}.json`;
        const recordingResponse = await fetch(recordingUrl, {
          headers: {
            Authorization: `Basic ${twilioAuth}`,
          },
        });

        if (!recordingResponse.ok) {
          throw new Error("Failed to fetch recording");
        }

        const recording = await recordingResponse.json();
        result = {
          success: true,
          url: `https://api.twilio.com${recording.uri.replace(".json", ".mp3")}`,
        };
        break;
      }

      case "transcribe": {
        // Transcribe a recording (placeholder for future AI integration)
        const { callLogId } = params;

        // Update status to processing
        await supabaseClient
          .from("call_logs")
          .update({ transcription_status: "processing" })
          .eq("id", callLogId);

        // TODO: Integrate with speech-to-text service (Deepgram, AssemblyAI, etc.)
        // For now, mark as completed with placeholder
        await supabaseClient
          .from("call_logs")
          .update({
            transcription_status: "completed",
            transcription: "Transcription feature coming soon",
          })
          .eq("id", callLogId);

        result = { success: true, message: "Transcription initiated" };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Twilio calling error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
