import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

        // Update call log. The error was discarded and supabase-js returns it
        // rather than throwing, so a lost write left the call stuck at its old
        // status with no duration - the row the billing and activity views
        // read (US-300).
        const { error: statusUpdateError } = await supabaseClient
          .from("call_logs")
          .update({
            status: statusData.status,
            duration_seconds: parseInt(statusData.duration || "0"),
            ended_at:
              statusData.status === "completed" ? new Date().toISOString() : null,
          })
          .eq("call_sid", callSid);

        if (statusUpdateError) {
          throw new Error(
            `Call ${callSid} status was fetched from Twilio but NOT stored: ${statusUpdateError.message}`,
          );
        }

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
          // Twilio retries this callback when it does not get a 2xx, so
          // failing loudly is what gets the recording attached. Dropping the
          // error returned 200 and orphaned the recording permanently (US-300).
          const { error: recordingError } = await supabaseClient
            .from("call_logs")
            .update({
              recording_sid: recordingSid,
              recording_url: recordingUrl,
              recording_duration_seconds: parseInt(recordingDuration || "0"),
              transcription_status: "pending",
            })
            .eq("call_sid", callSid);

          if (recordingError) {
            throw new Error(
              `Recording ${recordingSid} could not be attached to call ${callSid}: ${recordingError.message}`,
            );
          }
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

        // No speech-to-text service is wired up. This used to write
        // transcription_status "completed" with the body "Transcription
        // feature coming soon" and answer success: true, so the UI showed a
        // finished transcription that had never been produced, and there was
        // no way to tell those rows from real ones later. Mark it failed - an
        // existing value of the transcription_status check constraint - and
        // say so in the response (US-300).
        const { error: transcribeError } = await supabaseClient
          .from("call_logs")
          .update({
            transcription_status: "failed",
            transcription: null,
          })
          .eq("id", callLogId);

        if (transcribeError) {
          throw new Error(
            `Call ${callLogId} could not be marked untranscribed: ${transcribeError.message}`,
          );
        }

        result = {
          success: false,
          message:
            "Transcription is not available: no speech-to-text service is configured.",
        };
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
