/**
 * Signup with OTP Edge Function
 *
 * Creates a new user account WITHOUT triggering Supabase's built-in email.
 * Instead, sends a custom OTP email via Amazon SES for verification.
 *
 * Flow:
 * 1. Create user via Admin API (email_confirm: false)
 * 2. Create user profile with site_id isolation
 * 3. Generate OTP and store in auth_otp_codes table
 * 4. Send OTP email via Amazon SES
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { sendEmail, getSiteEmailConfig } from '../_shared/ses-email-service.ts';
import { generateAuthEmail, generateOTPCode } from '../_shared/auth-email-templates.ts';

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  siteId: z.string().uuid('Invalid site ID'),
  role: z.string().optional().default('admin'),
});

const OTP_EXPIRY_MINUTES = 15;

const handler = async (req: Request): Promise<Response> => {
  console.log('[SignupWithOTP] Handler invoked, method:', req.method);

  const corsHeaders = getCorsHeaders(req);
  console.log('[SignupWithOTP] CORS headers obtained');

  // Handle CORS preflight - 204 No Content cannot have a body
  if (req.method === 'OPTIONS') {
    console.log('[SignupWithOTP] Handling OPTIONS preflight');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('[SignupWithOTP] Method not POST:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log('[SignupWithOTP] Processing POST request');

  try {
    // Parse and validate request
    console.log('[SignupWithOTP] Parsing request body...');
    const rawBody = await req.json();
    console.log('[SignupWithOTP] Request body parsed');
    const validation = signupSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error('[SignupWithOTP] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: validation.error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { email, password, firstName, lastName, siteId, role } = validation.data;

    console.log(`[SignupWithOTP] Processing signup for ${email} on site ${siteId}`);

    // Create service role Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify site exists
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, key, name')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      console.error('[SignupWithOTP] Invalid site:', siteId);
      return new Response(
        JSON.stringify({ error: 'Invalid site' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userExists) {
      console.log('[SignupWithOTP] User already exists:', email);
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists. Please sign in instead.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create user via Admin API with email_confirm: false
    // This creates the user but does NOT send Supabase's confirmation email
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't auto-confirm - we'll confirm after OTP verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        site_id: siteId,
      },
      app_metadata: {
        site_id: siteId,
      },
    });

    if (createError) {
      console.error('[SignupWithOTP] Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message || 'Failed to create account' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[SignupWithOTP] User created: ${newUser.user.id}`);

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        site_id: siteId,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        role: role,
        is_active: false, // Will be activated after email verification
      });

    if (profileError) {
      console.error('[SignupWithOTP] Error creating profile:', profileError);
      // Don't fail the whole signup, profile can be created later
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
      p_token_type: 'confirm_signup',
      p_expires_in_minutes: OTP_EXPIRY_MINUTES,
      p_metadata: { user_id: newUser.user.id, first_name: firstName },
      p_ip: clientIP,
      p_user_agent: userAgent,
    });

    if (otpError) {
      console.error('[SignupWithOTP] Error storing OTP:', otpError);
      // Try to clean up the user we created
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
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
        type: 'confirm_signup',
        recipientEmail: email,
        recipientName: firstName,
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
      console.error('[SignupWithOTP] Email send failed:', emailResult.error);
      // Mark OTP as used since email failed
      await supabaseAdmin
        .from('auth_otp_codes')
        .update({ is_used: true, metadata: { email_failed: true } })
        .eq('id', otpId);

      // Clean up the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      return new Response(
        JSON.stringify({ error: 'Failed to send verification email. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[SignupWithOTP] OTP email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created. Please check your email for the verification code.',
        userId: newUser.user.id,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('[SignupWithOTP] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
