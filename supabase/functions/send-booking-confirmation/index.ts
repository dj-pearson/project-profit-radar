import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { initializeAuthContext, errorResponse } from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from "../_shared/validate-body.ts";
import { generateBookingConfirmationHTML } from "../_shared/booking-confirmation-email.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Sent by src/components/crm/PublicBookingForm.tsx with the inserted row's id.
const BookingConfirmationSchema = z.object({
  bookingId: z.string().uuid(),
}).passthrough();

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
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

    const parsed = await validateBody(req, BookingConfirmationSchema, { name: 'send-booking-confirmation' });
    if (!parsed.ok) return parsed.response;
    const { bookingId } = parsed.data;

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

    const emailHtml = generateBookingConfirmationHTML({
      title: booking.booking_pages?.title,
      location: booking.booking_pages?.location,
      attendeeName: booking.attendee_name,
      attendeeEmail: booking.attendee_email,
      notes: booking.notes,
      date: formattedDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
    });

    // Send email to attendee
    const attendeeEmail = await resend.emails.send({
      from: "Brikly CRM <notifications@resend.dev>",
      to: [booking.attendee_email],
      subject: `Meeting Confirmed: ${booking.booking_pages?.title || 'Your Appointment'}`,
      html: emailHtml,
    });

    console.log("Confirmation email sent successfully:", attendeeEmail);

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(), 
      success: true, 
      emailId: attendeeEmail.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    await captureException(error, { fn: 'send-booking-confirmation', req });
    console.error("Error sending booking confirmation:", error);
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
