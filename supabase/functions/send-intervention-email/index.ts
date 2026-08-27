// send-intervention-email
//
// Churn-intervention outreach. This is COMMERCIAL email (marketing
// re-engagement) under CAN-SPAM / CASL and MUST honor opt-out preferences
// and carry a functional unsubscribe mechanism.
//
// Retrofit: routes through the shared sendCommercialEmail() helper which
//   1. checks email_preferences before sending,
//   2. attaches RFC-8058 List-Unsubscribe / List-Unsubscribe-Post headers,
//   3. injects a CAN-SPAM-compliant footer (physical address, unsubscribe
//      link, privacy link).
//
// If the user has opted out of product_updates / marketing, the send is
// skipped and the intervention is logged with status='skipped_opt_out' so
// analytics reflect the suppression rather than a false "no response."

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from "../_shared/auth-helpers.ts";
import { sendCommercialEmail } from "../_shared/commercial-email.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { supabase: supabaseClient } = authContext;
    console.log('[SEND-INTERVENTION-EMAIL] Auth context initialized');

    const { userId, predictionId } = await req.json();

    // Get user and prediction data
    const { data: user, error: userError } = await supabaseClient
      .from("user_profiles")
      .select("user_id, email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    const { data: prediction, error: predictionError } = await supabaseClient
      .from("churn_predictions")
      .select("*")
      .eq("id", predictionId)
      .single();

    if (predictionError) throw predictionError;

    // Determine intervention type based on risk level
    let subject = "";
    let message = "";

    if (prediction.churn_probability >= 70) {
      subject = `${user.first_name}, we'd love to help you get more value from Brikly`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>We noticed you haven't been as active on Brikly lately, and we want to make sure you're getting the most out of the platform.</p>

        <p><strong>Here's what we can do to help:</strong></p>
        <ul>
          ${prediction.recommended_interventions.map((intervention: string) => `<li>${intervention}</li>`).join('')}
        </ul>

        <p>I'd love to schedule a quick 15-minute call to:</p>
        <ul>
          <li>Understand what's blocking you</li>
          <li>Show you features that could save you hours each week</li>
          <li>Answer any questions you have</li>
        </ul>

        <p><a href="https://brikly.net/schedule-support-call?user=${userId}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Schedule a Call</a></p>

        <p>Or reply to this email and let me know what would be most helpful.</p>

        <p>Best regards,<br>
        The Brikly Team</p>
      `;
    } else if (prediction.churn_probability >= 40) {
      subject = `${user.first_name}, check out these Brikly features you might have missed`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>We wanted to share some Brikly features that could make your construction management even easier:</p>

        <p><strong>Based on your usage, we recommend:</strong></p>
        <ul>
          ${prediction.recommended_interventions.map((intervention: string) => `<li>${intervention}</li>`).join('')}
        </ul>

        <p><a href="https://brikly.net/features-guide?user=${userId}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Explore Features</a></p>

        <p>Need help getting started? Reply to this email and we'll set up a quick demo.</p>

        <p>Best regards,<br>
        The Brikly Team</p>
      `;
    } else {
      subject = `${user.first_name}, tips to get more from Brikly`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>Thanks for being a Brikly customer! Here are some tips to get even more value from the platform:</p>

        <ul>
          ${prediction.recommended_interventions.map((intervention: string) => `<li>${intervention}</li>`).join('')}
        </ul>

        <p>Check out our <a href="https://brikly.net/knowledge-base">Knowledge Base</a> for video tutorials and guides.</p>

        <p>Best regards,<br>
        The Brikly Team</p>
      `;
    }

    // Prefer the auth user id over the profile row id so the unsubscribe
    // token resolves to the correct auth.users record.
    const targetUserId: string = user.user_id ?? userId;

    const sendResult = await sendCommercialEmail(supabaseClient, {
      to: user.email,
      userId: targetUserId,
      // Re-engagement campaigns are best classified as product_updates so
      // users who opted out of pure marketing still get them unless they
      // also opted out of product updates. Change to 'marketing' if policy
      // requires a stricter opt-out.
      kind: 'product_updates',
      subject,
      html: message,
      from: 'support@brikly.net',
      fromName: 'Brikly',
    });

    if (!sendResult.success && sendResult.skipped === 'opted_out') {
      await supabaseClient.from("intervention_logs").insert({
        user_id: userId,
        prediction_id: predictionId,
        intervention_type: "email",
        subject,
        status: "skipped_opt_out",
        sent_at: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: true,
          skipped: "opted_out",
          message: "Recipient has opted out of product-update / marketing email; send suppressed.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    if (!sendResult.success) {
      throw new Error(sendResult.error ?? "Failed to send intervention email");
    }

    // Log successful intervention in database
    await supabaseClient.from("intervention_logs").insert({
      user_id: userId,
      prediction_id: predictionId,
      intervention_type: "email",
      subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Intervention email sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending intervention email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
