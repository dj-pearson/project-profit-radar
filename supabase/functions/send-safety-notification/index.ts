import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const getSeverityEmoji = (severity: string) => {
  switch (severity) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '🔶';
    case 'low': return '🔵';
    default: return '📋';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#2563eb';
    default: return '#6b7280';
  }
};

const generateIncidentHTML = (incident: any) => {
  const severityEmoji = getSeverityEmoji(incident.severity);
  const severityColor = getSeverityColor(incident.severity);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Safety Incident Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid ${severityColor}; padding-left: 20px; margin-bottom: 20px;">
        <h1 style="color: ${severityColor}; margin: 0 0 10px 0;">
          ${severityEmoji} Safety Incident Reported
        </h1>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${severityColor};">
          ${incident.severity.toUpperCase()} SEVERITY
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #2c3e50;">Incident Details</h2>
        
        <div style="margin-bottom: 15px;">
          <strong>Type:</strong> ${incident.incident_type.replace('_', ' ').toUpperCase()}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Location:</strong> ${incident.location_description || 'Not specified'}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Reported:</strong> ${new Date(incident.reported_at).toLocaleString()}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>Incident ID:</strong> ${incident.id}
        </div>
      </div>
      
      <div style="background-color: #fff; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Description</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${incident.description}</p>
      </div>
      
      ${incident.immediate_actions_taken ? `
        <div style="background-color: #e8f5e8; border: 1px solid #b4e4b4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #2d5a2d;">Immediate Actions Taken</h3>
          <p style="margin-bottom: 0; white-space: pre-wrap;">${incident.immediate_actions_taken}</p>
        </div>
      ` : ''}
      
      <div style="border-top: 2px solid #dee2e6; padding-top: 20px; text-align: center;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          This is an automated safety notification from BuildDesk.<br>
          Please review and take appropriate action immediately.
        </p>
        
        <div style="margin-top: 15px;">
          <a href="https://builddesk.app/safety/incidents/${incident.id}" 
             style="background-color: ${severityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Full Report
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Safety notification request received');
    
    const { incident, urgency }: SafetyNotificationRequest = await req.json();

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
    recipients.push('safety@builddesk.app'); // Replace with actual supervisor emails

    // Generate email content
    const emailHTML = generateIncidentHTML(incident);
    const severityEmoji = getSeverityEmoji(incident.severity);
    
    const subject = `${severityEmoji} ${incident.severity.toUpperCase()} Safety Incident - ${incident.incident_type.replace('_', ' ')}`;

    // Send notifications to all recipients
    const emailPromises = recipients.map(async (email) => {
      return await resend.emails.send({
        from: "BuildDesk Safety <safety@builddesk.dev>",
        to: [email],
        subject: subject,
        html: emailHTML,
        // Add high priority for critical incidents
        headers: isUrgent ? {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        } : undefined
      });
    });

    const emailResults = await Promise.all(emailPromises);
    
    console.log('Safety notifications sent successfully:', emailResults);

    // For critical incidents, could also send SMS notifications here
    if (urgency === 'critical') {
      console.log('Critical incident - additional notifications may be required');
      // Could integrate with Twilio for SMS alerts
    }

    return new Response(JSON.stringify({
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
    console.error("Error in send-safety-notification function:", error);
    
    return new Response(
      JSON.stringify({ 
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