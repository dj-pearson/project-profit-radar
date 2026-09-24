import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { enforceRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
import { verifyTwilioSignature, TWILIO_SIGNATURE_HEADER } from '../_shared/twilio-signature.ts';
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// JSON actions, sent by src/components/crm/ClickToCall.tsx and CallHistory.tsx.
// recording_callback is not here: Twilio posts it as form data with the action
// in the query string, and it is read with req.formData() below. The input
// validation guard lists that path by name (FORM_DATA_READERS).
//
// Auth (US-395): this function runs with verify_jwt = false, because Twilio's
// recording callback carries no Supabase JWT and the platform check rejected
// every one of them - no recording was ever attached to a call. The callback
// is authenticated by X-Twilio-Signature instead (_shared/twilio-signature.ts)
// and writes with the service role. Every JSON action still requires a
// signed-in user through initializeAuthContext.
const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const RECORDING_SID = /^RE[0-9a-fA-F]{32}$/;
const optionalId = z.string().max(100).nullish();
const TwilioActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("initiate_call"),
    to: z.string().min(1).max(32),
    leadId: optionalId,
    contactId: optionalId,
    opportunityId: optionalId,
    dealId: optionalId,
    companyId: optionalId,
  }).passthrough(),
  z.object({
    action: z.literal("get_call_status"),
    callSid: z.string().regex(CALL_SID),
  }).passthrough(),
  z.object({
    action: z.literal("get_recording"),
    recordingSid: z.string().regex(RECORDING_SID),
  }).passthrough(),
  z.object({
    action: z.literal("transcribe"),
    callLogId: z.string().uuid(),
  }).passthrough(),
]);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Twilio's recording status callback is form data with the action in the
    // query string (see RecordingStatusCallback below). Every other action is
    // a JSON body from a signed-in user.
    const queryAction = new URL(req.url).searchParams.get("action");
    if (queryAction === "recording_callback") {
      return await handleRecordingCallback(req, corsHeaders);
    }

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401, req);
    }
    const { user, supabase: supabaseClient } = authContext;

    let action: string | undefined;
    // deno-lint-ignore no-explicit-any
    let params: Record<string, any> = {};
    {
      const parsed = await validateBody(req, TwilioActionSchema, { name: "twilio-calling" });
      if (!parsed.ok) return parsed.response;
      ({ action, ...params } = parsed.data as { action?: string; [k: string]: unknown });
    }

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
          RecordingStatusCallback: recordingCallbackUrl(),
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
        if (typeof callSid !== "string" || !CALL_SID.test(callSid)) {
          throw new Error("Invalid callSid");
        }

        // The Twilio credentials are the platform's, so Twilio will answer
        // for ANY tenant's call. Only look up a call the caller can already
        // see in call_logs; this client carries their JWT, so RLS scopes it to
        // their company (US-241).
        const { data: ownCall, error: ownCallError } = await supabaseClient
          .from("call_logs")
          .select("id")
          .eq("call_sid", callSid)
          .maybeSingle();
        if (ownCallError) throw new Error("Failed to look up call");
        if (!ownCall) {
          return new Response(JSON.stringify({ success: false, error: "Call not found", timestamp: new Date().toISOString() }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const statusResponse = await fetch(
          `${twilioBaseUrl}/Calls/${encodeURIComponent(callSid)}.json`,
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

      case "get_recording": {
        // Get recording URL with auth
        const { recordingSid } = params;
        if (typeof recordingSid !== "string" || !RECORDING_SID.test(recordingSid)) {
          throw new Error("Invalid recordingSid");
        }

        // Same platform-credential problem as get_call_status: a recording
        // sid from another company would otherwise hand back its media URL.
        const { data: ownRecording, error: ownRecordingError } = await supabaseClient
          .from("call_logs")
          .select("id")
          .eq("recording_sid", recordingSid)
          .maybeSingle();
        if (ownRecordingError) throw new Error("Failed to look up recording");
        if (!ownRecording) {
          return new Response(JSON.stringify({ success: false, error: "Recording not found", timestamp: new Date().toISOString() }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const recordingUrl = `${twilioBaseUrl}/Recordings/${encodeURIComponent(recordingSid)}.json`;
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
        // Speech-to-text through OpenAI Whisper, the provider voice-to-text
        // already uses (listed on the subprocessors page). This used to be a
        // placeholder that marked the row failed without trying (US-300);
        // before that it wrote "Transcription feature coming soon" as the
        // transcript (US-395).
        const { callLogId } = params;

        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openAiKey) {
          // Honest and side-effect free: the row is not touched, because
          // nothing was attempted.
          result = {
            success: false,
            error: "Transcription is not available: no speech-to-text service is configured.",
            message: "Transcription is not available: no speech-to-text service is configured.",
          };
          break;
        }

        // Whisper is billed per request.
        const limited = await enforceRateLimit(
          createServiceClient(),
          user.id,
          "twilio-transcribe",
          RATE_LIMITS.AI,
          corsHeaders,
        );
        if (limited) return limited;

        // RLS scopes this read to the caller's company, so a call log id from
        // another tenant is simply not found.
        const { data: callLog, error: callLogError } = await supabaseClient
          .from("call_logs")
          .select("id, recording_sid")
          .eq("id", callLogId)
          .maybeSingle();
        if (callLogError) throw new Error("Failed to look up call");
        if (!callLog) {
          return new Response(JSON.stringify({ success: false, error: "Call not found", timestamp: new Date().toISOString() }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!callLog.recording_sid || !RECORDING_SID.test(callLog.recording_sid)) {
          result = {
            success: false,
            error: "This call has no recording to transcribe.",
            message: "This call has no recording to transcribe.",
          };
          break;
        }

        const markStatus = async (fields: Record<string, unknown>) => {
          const { error } = await supabaseClient.from("call_logs").update(fields).eq("id", callLog.id);
          if (error) throw new Error(`Call ${callLog.id} transcription status was not saved: ${error.message}`);
        };

        await markStatus({ transcription_status: "processing" });
        try {
          const text = await transcribeRecording(
            `${twilioBaseUrl}/Recordings/${encodeURIComponent(callLog.recording_sid)}.mp3`,
            twilioAuth,
            openAiKey,
          );
          await markStatus({ transcription_status: "completed", transcription: text });
          result = { success: true, transcription: text };
        } catch (err) {
          await markStatus({ transcription_status: "failed", transcription: null });
          throw err;
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ ...result, success: result.success, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await captureException(error, { fn: 'twilio-calling', req });
    console.error("Twilio calling error:", error);
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


/** The callback URL registered with Twilio on each call. The signature covers it exactly. */
function recordingCallbackUrl(): string {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-calling?action=recording_callback`;
}

/**
 * Twilio's RecordingStatusCallback. No Supabase JWT exists here; the request is
 * trusted only when X-Twilio-Signature is valid for our auth token, the URL we
 * registered and the exact form body. Then it writes with the service role,
 * keyed on the CallSid Twilio sent.
 */
async function handleRecordingCallback(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const json = (success: boolean, extra: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify({ success: success, timestamp: new Date().toISOString(), ...extra }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("[twilio-calling] recording_callback refused: TWILIO_AUTH_TOKEN is not set");
    return json(false, { error: "Twilio is not configured" }, 503);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(false, { error: "Expected a form body" }, 400);
  }
  const entries: [string, string][] = [];
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") entries.push([k, v]);
  }

  // The registered URL is what Twilio signed. req.url is tried as well in case
  // the gateway forwards the public URL unchanged; neither can be signed
  // without the auth token.
  const signature = req.headers.get(TWILIO_SIGNATURE_HEADER);
  const candidates = [...new Set([recordingCallbackUrl(), req.url])];
  let valid = false;
  for (const url of candidates) {
    if (await verifyTwilioSignature(authToken, signature, url, entries)) {
      valid = true;
      break;
    }
  }
  if (!valid) {
    console.error("[twilio-calling] recording_callback rejected: bad or missing X-Twilio-Signature");
    return json(false, { error: "Invalid signature" }, 403);
  }

  const get = (k: string) => entries.find(([name]) => name === k)?.[1];
  const callSid = get("CallSid");
  const recordingSid = get("RecordingSid");
  const recordingUrl = get("RecordingUrl");
  const recordingDuration = get("RecordingDuration");

  if (!callSid || !CALL_SID.test(callSid) || !recordingSid || !RECORDING_SID.test(recordingSid) || !recordingUrl) {
    // Signed by Twilio but not a completed-recording event we can attach.
    return json(true, { ignored: true });
  }

  // Twilio retries this callback when it does not get a 2xx, so failing loudly
  // is what gets the recording attached (US-300). transcription_status is left
  // alone: nothing queues a transcription, and "pending" used to sit on every
  // recorded call forever. The transcribe action sets it when one is run.
  const { error: recordingError } = await createServiceClient()
    .from("call_logs")
    .update({
      recording_sid: recordingSid,
      recording_url: recordingUrl,
      recording_duration_seconds: parseInt(recordingDuration || "0"),
    })
    .eq("call_sid", callSid);

  if (recordingError) {
    console.error(`[twilio-calling] Recording ${recordingSid} could not be attached to call ${callSid}: ${recordingError.message}`);
    return json(false, { error: "Recording could not be attached" }, 500);
  }
  return json(true, {});
}

/** Whisper's upload ceiling. */
const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

async function transcribeRecording(mediaUrl: string, twilioAuth: string, openAiKey: string): Promise<string> {
  const media = await fetch(mediaUrl, { headers: { Authorization: `Basic ${twilioAuth}` } });
  if (!media.ok) {
    throw new Error(`Could not download the recording from Twilio: HTTP ${media.status}`);
  }
  const declared = Number(media.headers.get("content-length") ?? "0");
  if (declared > MAX_TRANSCRIBE_BYTES) {
    throw new Error("Recording is larger than the 25 MB transcription limit");
  }
  const audio = new Uint8Array(await media.arrayBuffer());
  if (audio.byteLength === 0) throw new Error("Twilio returned an empty recording");
  if (audio.byteLength > MAX_TRANSCRIBE_BYTES) {
    throw new Error("Recording is larger than the 25 MB transcription limit");
  }

  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "recording.mp3");
  form.append("model", "whisper-1");
  form.append("temperature", "0");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[twilio-calling] Whisper error", res.status, detail.slice(0, 500));
    throw new Error(`Transcription provider error: HTTP ${res.status}`);
  }
  const body = await res.json();
  if (typeof body?.text !== "string") {
    throw new Error("Transcription provider returned no text");
  }
  return body.text;
}
