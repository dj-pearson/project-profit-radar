import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Input validation schema
const notificationRequestSchema = z.object({
  type: z.string().min(1).max(50),
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1).max(200),
  content: z.string().max(50000),
  template: z.string().max(100000).optional(),
  variables: z.record(z.string(), z.any()).optional(),
});

type NotificationRequest = z.infer<typeof notificationRequestSchema>;

/**
 * HTML-escape a string to prevent XSS attacks
 * SECURITY: All user-provided values must be escaped before insertion into HTML
 */
function escapeHtml(str: string): string {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const handler = async (req: Request): Promise<Response> => {
  // Use secure CORS (whitelist-based)
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const rawBody = await req.json();

    // Validate input
    const validation = notificationRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, to, subject, content, template, variables } = validation.data;

    console.log("Sending notification:", { type, to, subject });

    let emailContent = content;

    // Apply template variables if provided
    // SECURITY: HTML-escape all variable values to prevent XSS
    if (template && variables) {
      emailContent = template;
      Object.entries(variables).forEach(([key, value]) => {
        // Escape the value to prevent HTML/script injection
        const escapedValue = escapeHtml(String(value));
        emailContent = emailContent.replace(new RegExp(`{{${key}}}`, 'g'), escapedValue);
      });
    }

    const emailResponse = await resend.emails.send({
      from: "BuildDesk <notifications@resend.dev>",
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailContent}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from BuildDesk Construction Management Platform.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending notification:", error);
    // SECURITY: Don't expose internal error details to clients
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);