import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { generateIncidentHTML, getSeverityEmoji } from '../_shared/safety-incident-email.ts';
import { captureException } from '../_shared/observability.ts';
import { sendEmail, emailIdempotencyKey } from '../_shared/ses-email-service.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// incident is the row the client just inserted, so passthrough. severity and
// incident_type are required because the subject line calls toUpperCase() and
// replace() on them. MobileSafetyIncidentManager also sends emergency_services.
const SafetyNotificationSchema = z.object({
  incident: z.object({
    id: z.string().max(64).optional(),
    incident_type: z.string().min(1).max(100),
    severity: z.string().min(1).max(32),
    description: z.string().max(10_000).nullish(),
    location_description: z.string().max(1000).nullish(),
  }).passthrough(),
  urgency: z.string().max(32).nullish(),
  emergency_services: z.boolean().nullish(),
}).passthrough();

interface SafetyNotificationRequest {
  incident: {
    id: string;
    incident_type: string;
    severity: string;
    description: string;
    location_description: string;
    project_id: string;
    reported_by: string;
    reported_at: string;
  };
  urgency: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    // Authenticate the caller. Safety-incident mail goes out under Brikly's
    // name to addresses the body names; verify_jwt = true is a signature check
    // the publishable anon key satisfies, not authentication (US-241).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    console.log('Safety notification request received');
    
    const parsed = await validateBody(req, SafetyNotificationSchema, { name: 'send-safety-notification' });
    if (!parsed.ok) return parsed.response;
    const { incident, urgency } = parsed.data as unknown as SafetyNotificationRequest;

    if (!incident) {
      throw new Error('Incident data is required');
    }

    console.log('Processing safety incident notification:', {
      id: incident.id,
      type: incident.incident_type,
      severity: incident.severity
    });

    // Determine notification recipients based on severity
    const recipients = [];
    const isUrgent = urgency === 'critical' || urgency === 'high';

    // For now, we'll use a default recipient - in production this would query the database
    // for project managers, safety officers, and supervisors
    recipients.push('safety@brikly.app'); // Replace with actual supervisor emails

    // Generate email content
    const emailHTML = generateIncidentHTML(incident);
    const severityEmoji = getSeverityEmoji(incident.severity);
    
    const subject = `${severityEmoji} ${incident.severity.toUpperCase()} Safety Incident - ${incident.incident_type.replace('_', ' ')}`;

    // Send notifications to all recipients (US-253: SES through the shared
    // sender). Keyed on the incident, so a client that retries the same
    // report does not page the supervisor twice.
    const emailPromises = recipients.map(async (email) => {
      return await sendEmail({
        to: email,
        from: 'safety@brikly.net',
        fromName: 'Brikly Safety',
        subject: subject,
        html: emailHTML,
        // Add high priority for critical incidents
        headers: isUrgent ? {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        } : undefined,
        template: 'safety_incident',
        source: 'send-safety-notification',
        idempotencyKey: incident.id
          ? await emailIdempotencyKey('safety_incident', incident.id, email)
          : undefined,
      });
    });

    const emailResults = await Promise.all(emailPromises);
    const failedSends = emailResults.filter((r) => !r.success);
    if (failedSends.length > 0) {
      // This used to report success whatever the provider answered.
      throw new Error(`${failedSends.length} of ${emailResults.length} safety notifications not sent: ${failedSends[0].error ?? 'unknown error'}`);
    }

    console.log('Safety notifications sent successfully:', emailResults);

    // For critical incidents, could also send SMS notifications here
    if (urgency === 'critical') {
      console.log('Critical incident - additional notifications may be required');
      // Could integrate with Twilio for SMS alerts
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Safety notifications sent successfully',
      recipients: recipients.length,
      incident_id: incident.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    await captureException(error, { fn: 'send-safety-notification', req });
    console.error("Error in send-safety-notification function:", error);
    
    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(), 
        success: false,
        error: error.message,
        message: 'Failed to send safety notifications'
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);