/**
 * Send Auth OTP Edge Function
 *
 * Generates and sends OTP codes for various authentication flows:
 * - confirm_signup: Email verification for new signups
 * - invite_user: Team member invitations
 * - magic_link: Passwordless sign-in
 * - change_email: Email address change confirmation
 * - reset_password: Password reset verification
 * - reauthentication: Verify identity for sensitive actions
 *
 * Uses Amazon SES SMTP for reliable email delivery with BuildDesk branding.
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { sendEmail, getSiteEmailConfig } from '../_shared/ses-email-service.ts';
import { generateAuthEmail, generateOTPCode, AuthEmailType } from '../_shared/auth-email-templates.ts';

// Validation schema
const sendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum([
    'confirm_signup',
    'invite_user',
    'magic_link',
    'change_email',
    'reset_password',
    'reauthentication',
  ]),
    // Optional fields for specific flows
  recipientName: z.string().max(100).optional(),
  newEmail: z.string().email().optional(),
  inviterName: z.string().max(100).optional(),
  inviterUserId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  companyName: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional()
});

// Expiration times for different token types (in minutes)
const EXPIRATION_TIMES: Record<AuthEmailType, number> = {
  confirm_signup: 15,
  invite_user: 60,
  magic_link: 10,
  change_email: 15,
  reset_password: 10,
  reauthentication: 5
};

// Rate limiting: max requests per email per hour
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
    // Parse and validate request
    const rawBody = await req.json();
    const validation = sendOTPSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error('[SendAuthOTP] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: validation.error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const {
      email,
      type,
      recipientName,
      newEmail,
      inviterName,
      inviterUserId,
      companyId,
      companyName,
      metadata
    } = validation.data;

    console.log(`[SendAuthOTP] Processing ${type} request for ${email} on site ${siteId}`);

    // Create service role Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify site exists
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, key, name')
      .eq('id')
      .single();

    if (siteError || !site) {
      console.error('[SendAuthOTP] Invalid site:');
      return new Response(
        JSON.stringify({ error: 'Invalid site' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
    const { data: recentTokens, error: rateError } = await supabaseAdmin
      .from('auth_otp_codes')
      .select('id')
      .ilike('email', email)
      .eq('token_type', type)
      .gte('created_at', oneHourAgo);

    if (!rateError && recentTokens && recentTokens.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`[SendAuthOTP] Rate limit exceeded for ${email}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before requesting another code.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // For certain types, validate additional requirements
    if (type === 'confirm_signup' || type === 'reset_password') {
      // Check if user exists in auth.users (for reset password, user should exist)
      // For signup, we'll just proceed
      if (type === 'reset_password') {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        if (!authUser?.user) {
          // Don't reveal if email exists - just pretend we sent it
          console.log(`[SendAuthOTP] No user found for reset_password: ${email}`);
          return new Response(
            JSON.stringify({ success: true, message: 'If an account exists, a verification code has been sent.' }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }
    }

    // Generate OTP code
    const otpCode = generateOTPCode();
    const expiresInMinutes = EXPIRATION_TIMES[type];

    // Get request metadata for security auditing
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create OTP token in database
    const { data: tokenId, error: tokenError } = await supabaseAdmin.rpc('create_otp_token', {
      p_
      p_email: email,
      p_otp_code: otpCode,
      p_token_type: type,
      p_expires_in_minutes: expiresInMinutes,
      p_new_email: newEmail || null,
      p_inviter_user_id: inviterUserId || null,
      p_inviter_name: inviterName || null,
      p_company_id: companyId || null,
      p_metadata: metadata || {},
      p_ip: clientIP,
      p_user_agent: userAgent
    });

    if (tokenError) {
      console.error('[SendAuthOTP] Error creating token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[SendAuthOTP] Token created: ${tokenId}`);

    // Get email configuration (single-tenant)
    const siteConfig = await getSiteEmailConfig();

    // Generate email content
    const emailContent = generateAuthEmail(
      {
        type,
        recipientEmail: email,
        recipientName,
        otpCode,
        expiresInMinutes,
        inviterName,
        companyName,
        newEmail
      },
      siteConfig
    );

    // Send email via Amazon SES
    const emailResult = await sendEmail(
      {
        to: email,
        subject: emailContent.subject,
        html: emailContent.html
      },
      siteConfig
    );

    if (!emailResult.success) {
      console.error('[SendAuthOTP] Email send failed:', emailResult.error);
      // Mark token as used so it can't be verified
      await supabaseAdmin
        .from('auth_otp_codes')
        .update({ is_used: true, metadata: { ...metadata, email_failed: true } })
        .eq('id', tokenId);

      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[SendAuthOTP] Email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent successfully',
        expiresInMinutes
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('[SendAuthOTP] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
