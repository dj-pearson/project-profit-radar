/**
 * Reset Password with OTP Edge Function
 *
 * Handles password reset WITHOUT triggering Supabase's built-in email.
 * Sends a custom OTP email via Amazon SES for verification.
 *
 * Two endpoints:
 * 1. POST /request - Request password reset (sends OTP)
 * 2. POST /verify - Verify OTP and update password
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { sendEmail, getSiteEmailConfig } from '../_shared/ses-email-service.ts';
import { generateAuthEmail, generateOTPCode } from '../_shared/auth-email-templates.ts';

// Validation schemas
const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  siteId: z.string().uuid('Invalid site ID'),
});

const verifyResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  siteId: z.string().uuid('Invalid site ID'),
});

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const rawBody = await req.json();
    const action = rawBody.action || 'request';

    // Create service role Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'request') {
      return handleRequestReset(req, rawBody, supabaseAdmin, corsHeaders);
    } else if (action === 'verify') {
      return handleVerifyReset(req, rawBody, supabaseAdmin, corsHeaders);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "request" or "verify".' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

  } catch (error) {
    console.error('[ResetPasswordOTP] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

async function handleRequestReset(
  req: Request,
  rawBody: any,
  supabaseAdmin: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate request
  const validation = requestResetSchema.safeParse(rawBody);
  if (!validation.success) {
    console.error('[ResetPasswordOTP] Validation error:', validation.error);
    return new Response(
      JSON.stringify({ error: 'Invalid request parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { email, siteId } = validation.data;

  console.log(`[ResetPasswordOTP] Request reset for ${email} on site ${siteId}`);

  // Verify site exists
  const { data: site, error: siteError } = await supabaseAdmin
    .from('sites')
    .select('id, key, name')
    .eq('id', siteId)
    .single();

  if (siteError || !site) {
    console.error('[ResetPasswordOTP] Invalid site:', siteId);
    return new Response(
      JSON.stringify({ error: 'Invalid site' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Check if user exists - but don't reveal this to prevent enumeration
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

  if (!authUser?.user) {
    // Don't reveal that user doesn't exist - still return success
    console.log('[ResetPasswordOTP] No user found for:', email);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, a verification code will be sent.',
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Rate limiting check
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
  const { data: recentCodes } = await supabaseAdmin
    .from('auth_otp_codes')
    .select('id')
    .eq('site_id', siteId)
    .ilike('email', email)
    .eq('token_type', 'reset_password')
    .gte('created_at', oneHourAgo);

  if (recentCodes && recentCodes.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[ResetPasswordOTP] Rate limit exceeded for ${email}`);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait before requesting another code.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Generate OTP code
  const otpCode = generateOTPCode();

  // Get request metadata for security auditing
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('cf-connecting-ip') ||
                   'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Store OTP in database
  const { data: otpId, error: otpError } = await supabaseAdmin.rpc('create_otp_token', {
    p_site_id: siteId,
    p_email: email.toLowerCase(),
    p_otp_code: otpCode,
    p_token_type: 'reset_password',
    p_expires_in_minutes: OTP_EXPIRY_MINUTES,
    p_metadata: { user_id: authUser.user.id },
    p_ip: clientIP,
    p_user_agent: userAgent,
  });

  if (otpError) {
    console.error('[ResetPasswordOTP] Error storing OTP:', otpError);
    return new Response(
      JSON.stringify({ error: 'Failed to generate verification code' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Get site email configuration
  const siteConfig = await getSiteEmailConfig(supabaseAdmin, siteId);

  // Generate email content
  const emailContent = generateAuthEmail(
    {
      type: 'reset_password',
      recipientEmail: email,
      otpCode,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    },
    siteConfig
  );

  // Send email via Amazon SES
  const emailResult = await sendEmail(
    {
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    },
    siteConfig
  );

  if (!emailResult.success) {
    console.error('[ResetPasswordOTP] Email send failed:', emailResult.error);
    // Mark OTP as used since email failed
    await supabaseAdmin
      .from('auth_otp_codes')
      .update({ is_used: true, metadata: { email_failed: true } })
      .eq('id', otpId);

    return new Response(
      JSON.stringify({ error: 'Failed to send verification email. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log(`[ResetPasswordOTP] OTP email sent successfully to ${email}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Verification code sent. Please check your email.',
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function handleVerifyReset(
  req: Request,
  rawBody: any,
  supabaseAdmin: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate request
  const validation = verifyResetSchema.safeParse(rawBody);
  if (!validation.success) {
    console.error('[ResetPasswordOTP] Validation error:', validation.error);
    return new Response(
      JSON.stringify({ error: 'Invalid request parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { email, otpCode, newPassword, siteId } = validation.data;

  console.log(`[ResetPasswordOTP] Verify reset for ${email}`);

  // Verify OTP code
  const { data: verifyResult, error: verifyError } = await supabaseAdmin.rpc('verify_otp_code', {
    p_site_id: siteId,
    p_email: email,
    p_otp_code: otpCode,
    p_token_type: 'reset_password',
  });

  if (verifyError) {
    console.error('[ResetPasswordOTP] Verification error:', verifyError);
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const result = verifyResult?.[0];
  if (!result?.success) {
    console.log('[ResetPasswordOTP] OTP verification failed:', result?.error_message);
    return new Response(
      JSON.stringify({ error: result?.error_message || 'Invalid verification code' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Get user
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

  if (!authUser?.user) {
    console.error('[ResetPasswordOTP] User not found:', email);
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Update password via Admin API (bypasses Supabase's email)
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUser.user.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('[ResetPasswordOTP] Error updating password:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to update password' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log(`[ResetPasswordOTP] Password reset successfully for ${email}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

serve(handler);
