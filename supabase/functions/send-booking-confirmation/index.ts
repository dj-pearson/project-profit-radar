import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { initializeAuthContext, errorResponse } from "../_shared/auth-helpers.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  bookingId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { supabase: supabaseClient } = authContext;
    console.log('[SEND-BOOKING-CONFIRMATION] Auth context initialized');

    const { bookingId }: BookingConfirmationRequest = await req.json();

    // Fetch booking details with booking page info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        booking_pages (
          title,
          location
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedStartTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const formattedEndTime = endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 24px;">Meeting Confirmed! 🎉</h1>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin-top: 0; color: #334155;">${booking.booking_pages?.title || 'Meeting'}</h2>
          
          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">📅 Date:</strong><br/>
            <span style="font-size: 16px;">${formattedDate}</span>
          </div>
          
          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">⏰ Time:</strong><br/>
            <span style="font-size: 16px;">${formattedStartTime} - ${formattedEndTime}</span>
          </div>
          
          ${booking.booking_pages?.location ? `
            <div style="margin: 16px 0;">
              <strong style="color: #64748b;">📍 Location:</strong><br/>
              <span style="font-size: 16px;">${booking.booking_pages.location}</span>
            </div>
          ` : ''}
          
          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">👤 Attendee:</strong><br/>
            <span style="font-size: 16px;">${booking.attendee_name}</span><br/>
            <span style="color: #64748b;">${booking.attendee_email}</span>
          </div>
          
          ${booking.notes ? `
            <div style="margin: 16px 0;">
              <strong style="color: #64748b;">📝 Notes:</strong><br/>
              <span style="font-size: 14px;">${booking.notes}</span>
            </div>
          ` : ''}
        </div>
        
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #065f46;">
            <strong>✓ This meeting has been added to your calendar.</strong><br/>
            You will receive a reminder before the meeting starts.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          This is an automated confirmation from BuildDesk CRM.<br/>
          If you need to reschedule or cancel, please contact us directly.
        </p>
      </div>
    `;

    // Send email to attendee
    const attendeeEmail = await resend.emails.send({
      from: "BuildDesk CRM <notifications@resend.dev>",
      to: [booking.attendee_email],
      subject: `Meeting Confirmed: ${booking.booking_pages?.title || 'Your Appointment'}`,
      html: emailHtml,
    });

    console.log("Confirmation email sent successfully:", attendeeEmail);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: attendeeEmail.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
