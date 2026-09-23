/**
 * HTML body for send-booking-confirmation.
 *
 * Every field except the formatted date/time comes from the public booking
 * form (attendee name, email, notes) or a company's booking page (title,
 * location), so all of them are escaped before interpolation. Emoji are
 * written as numeric entities to keep this file ASCII; the rendered email is
 * unchanged.
 *
 * Pure (no Deno globals, no remote imports) so vitest can import it directly.
 */
import { escapeHtml } from './html-escape.ts';

export interface BookingConfirmationForEmail {
  title?: string | null;
  location?: string | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  notes?: string | null;
  date: string;
  startTime: string;
  endTime: string;
}

const esc = (value: string | null | undefined) => escapeHtml(String(value ?? ''));

export function generateBookingConfirmationHTML(b: BookingConfirmationForEmail): string {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 24px;">Meeting Confirmed! &#127881;</h1>

        <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin-top: 0; color: #334155;">${esc(b.title || 'Meeting')}</h2>

          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">&#128197; Date:</strong><br/>
            <span style="font-size: 16px;">${esc(b.date)}</span>
          </div>

          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">&#9200; Time:</strong><br/>
            <span style="font-size: 16px;">${esc(b.startTime)} - ${esc(b.endTime)}</span>
          </div>

          ${b.location ? `
            <div style="margin: 16px 0;">
              <strong style="color: #64748b;">&#128205; Location:</strong><br/>
              <span style="font-size: 16px;">${esc(b.location)}</span>
            </div>
          ` : ''}

          <div style="margin: 16px 0;">
            <strong style="color: #64748b;">&#128100; Attendee:</strong><br/>
            <span style="font-size: 16px;">${esc(b.attendeeName)}</span><br/>
            <span style="color: #64748b;">${esc(b.attendeeEmail)}</span>
          </div>

          ${b.notes ? `
            <div style="margin: 16px 0;">
              <strong style="color: #64748b;">&#128221; Notes:</strong><br/>
              <span style="font-size: 14px;">${esc(b.notes)}</span>
            </div>
          ` : ''}
        </div>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #065f46;">
            <strong>&#10003; This meeting has been added to your calendar.</strong><br/>
            You will receive a reminder before the meeting starts.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

        <p style="color: #64748b; font-size: 12px; text-align: center;">
          This is an automated confirmation from Brikly CRM.<br/>
          If you need to reschedule or cancel, please contact us directly.
        </p>
      </div>
    `;
}
