import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportNotificationRequest {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ticketId,
      ticketNumber,
      customerName,
      customerEmail,
      subject,
      description,
      priority,
      category
    }: SupportNotificationRequest = await req.json();

    console.log("Processing support notification for ticket:", ticketNumber);

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "BuildDesk Support <support@build-desk.com>",
      to: ["support@build-desk.com"],
      subject: `New Support Ticket: ${ticketNumber} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            New Support Ticket Created
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Ticket Details</h3>
            <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Priority:</strong> <span style="color: ${getPriorityColor(priority)}; font-weight: bold;">${priority.toUpperCase()}</span></p>
            <p><strong>Category:</strong> ${category}</p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Customer Information</h3>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Description</h3>
            <p style="white-space: pre-wrap;">${description}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://build-desk.com/support" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Ticket in Dashboard
            </a>
          </div>
        </div>
      `,
    });

    // Send confirmation to customer
    const customerEmailResponse = await resend.emails.send({
      from: "BuildDesk Support <support@build-desk.com>",
      to: [customerEmail],
      subject: `Support Ticket Created: ${ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Support Ticket Confirmation
          </h2>
          
          <p>Dear ${customerName},</p>
          
          <p>Thank you for contacting BuildDesk support. We have received your support request and created ticket <strong>${ticketNumber}</strong>.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Your Ticket Details</h3>
            <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Status:</strong> Open</p>
          </div>
          
          <p>Our support team will review your request and respond within:</p>
          <ul>
            <li><strong>Urgent:</strong> 2 hours</li>
            <li><strong>High:</strong> 4 hours</li>
            <li><strong>Medium:</strong> 8 hours</li>
            <li><strong>Low:</strong> 24 hours</li>
          </ul>
          
          <p>You can reply to this email to add additional information to your ticket, or contact us directly at support@build-desk.com.</p>
          
          <p>Best regards,<br>BuildDesk Support Team</p>
        </div>
      `,
    });

    console.log("Email notifications sent successfully");
    console.log("Admin email:", adminEmailResponse);
    console.log("Customer email:", customerEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        adminEmailId: adminEmailResponse.data?.id,
        customerEmailId: customerEmailResponse.data?.id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-support-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return '#dc2626';
    case 'high':
      return '#ea580c';
    case 'medium':
      return '#d97706';
    case 'low':
      return '#059669';
    default:
      return '#6b7280';
  }
}

serve(handler);