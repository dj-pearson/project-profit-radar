import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateBookingConfirmationHTML } from './booking-confirmation-email.ts';

/**
 * The attendee name, email and notes come from the public booking form, so
 * anyone could put markup into the confirmation email Brikly sends.
 */
const PAYLOAD = '<img src=x onerror="alert(1)">';

describe('booking confirmation email escaping', () => {
  const html = generateBookingConfirmationHTML({
    title: `Site visit <script>x()</script>`,
    location: `<b>Yard</b> & gate 2`,
    attendeeName: `Pat ${PAYLOAD}`,
    attendeeEmail: `pat"><a href="https://evil.test">x</a>@example.com`,
    notes: `Bring plans. <a href="https://evil.test">click</a>`,
    date: 'Monday, September 1, 2026',
    startTime: '9:00 AM',
    endTime: '10:00 AM',
  });

  it('never emits user-entered markup', () => {
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b>Yard</b>');
    expect(html).not.toContain('href="https://evil.test"');
  });

  it('keeps the text, escaped', () => {
    expect(html).toContain('Pat &lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).toContain('&lt;b&gt;Yard&lt;/b&gt; &amp; gate 2');
    expect(html).toContain('Bring plans. &lt;a href=&quot;https://evil.test&quot;&gt;click&lt;/a&gt;');
    expect(html).toContain('Site visit &lt;script&gt;');
    expect(html).toContain('9:00 AM - 10:00 AM');
  });

  it('leaves out location and notes when there are none', () => {
    const plain = generateBookingConfirmationHTML({ date: 'd', startTime: 's', endTime: 'e' });
    expect(plain).not.toContain('Location:');
    expect(plain).not.toContain('Notes:');
    expect(plain).toContain('>Meeting<');
  });

  it('is what send-booking-confirmation sends, not a hand-built template', () => {
    const fn = readFileSync('supabase/functions/send-booking-confirmation/index.ts', 'utf8');
    expect(fn).toContain('generateBookingConfirmationHTML(');
    expect(fn).not.toMatch(/\$\{booking\.(notes|attendee_name|attendee_email)\}/);
  });
});
