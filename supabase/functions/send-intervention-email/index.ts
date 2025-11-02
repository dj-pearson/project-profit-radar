import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, predictionId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user and prediction data
    const { data: user, error: userError } = await supabaseClient
      .from("user_profiles")
      .select("email, first_name, last_name")
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
      subject = `${user.first_name}, we'd love to help you get more value from BuildDesk`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>We noticed you haven't been as active on BuildDesk lately, and we want to make sure you're getting the most out of the platform.</p>

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

        <p><a href="https://build-desk.com/schedule-support-call?user=${userId}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Schedule a Call</a></p>

        <p>Or reply to this email and let me know what would be most helpful.</p>

        <p>Best regards,<br>
        The BuildDesk Team</p>
      `;
    } else if (prediction.churn_probability >= 40) {
      subject = `${user.first_name}, check out these BuildDesk features you might have missed`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>We wanted to share some BuildDesk features that could make your construction management even easier:</p>

        <p><strong>Based on your usage, we recommend:</strong></p>
        <ul>
          ${prediction.recommended_interventions.map((intervention: string) => `<li>${intervention}</li>`).join('')}
        </ul>

        <p><a href="https://build-desk.com/features-guide?user=${userId}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Explore Features</a></p>

        <p>Need help getting started? Reply to this email and we'll set up a quick demo.</p>

        <p>Best regards,<br>
        The BuildDesk Team</p>
      `;
    } else {
      subject = `${user.first_name}, tips to get more from BuildDesk`;
      message = `
        <h2>Hi ${user.first_name},</h2>

        <p>Thanks for being a BuildDesk customer! Here are some tips to get even more value from the platform:</p>

        <ul>
          ${prediction.recommended_interventions.map((intervention: string) => `<li>${intervention}</li>`).join('')}
        </ul>

        <p>Check out our <a href="https://build-desk.com/knowledge-base">Knowledge Base</a> for video tutorials and guides.</p>

        <p>Best regards,<br>
        The BuildDesk Team</p>
      `;
    }

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BuildDesk <support@build-desk.com>",
        to: [user.email],
        subject: subject,
        html: message,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    // Log intervention in database
    await supabaseClient.from("intervention_logs").insert({
      user_id: userId,
      prediction_id: predictionId,
      intervention_type: "email",
      subject: subject,
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
