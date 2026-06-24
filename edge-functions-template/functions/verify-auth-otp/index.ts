/**
 * Verify Auth OTP Edge Function
 *
 * Verifies OTP codes for authentication flows and performs the appropriate action:
 * - confirm_signup: Confirms user email and activates account
 * - invite_user: Confirms invitation and creates user account
 * - magic_link: Signs in user via magic link
 * - change_email: Updates user's email address
 * - reset_password: Allows password reset
 * - reauthentication: Confirms identity for sensitive actions
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

// Helper function to get user by email (works with all Supabase client versions)
async function getUserByEmail(supabaseAdmin: any, email: string) {
  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    return { user: null, error };
  }
  const user = usersData?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );
  return { user: user || null, error: null };
}

// Validation schemas
const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
  type: z.enum([
    'confirm_signup',
    'invite_user',
    'magic_link',
    'change_email',
    'reset_password',
    'reauthentication',
  ]),
  siteId: z.string().uuid('Invalid site ID'),
  // For confirm_signup and invite_user - the password to set
  password: z.string().min(8).optional(),
  // For invite_user - user details
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight - 204 No Content cannot have a body
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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
    const validation = verifyOTPSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error('[VerifyAuthOTP] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { email, otpCode, type, siteId, password, firstName, lastName } = validation.data;

    console.log(`[VerifyAuthOTP] Verifying ${type} OTP for ${email}`);

    // Create service role Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify OTP code using database function
    const { data: verifyResult, error: verifyError } = await supabaseAdmin.rpc('verify_otp_code', {
      p_site_id: siteId,
      p_email: email,
      p_otp_code: otpCode,
      p_token_type: type,
    });

    if (verifyError) {
      console.error('[VerifyAuthOTP] Verification error:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Verification failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if verification was successful
    const result = verifyResult?.[0];
    if (!result?.success) {
      console.log('[VerifyAuthOTP] OTP verification failed:', result?.error_message);
      return new Response(
        JSON.stringify({ error: result?.error_message || 'Invalid verification code' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[VerifyAuthOTP] OTP verified successfully for ${email}`);

    // Handle specific verification types
    let actionResult: any = { verified: true };

    switch (type) {
      case 'confirm_signup': {
        // Confirm user's email
        const { user: authUser, error: getUserError } = await getUserByEmail(supabaseAdmin, email);

        if (getUserError || !authUser) {
          console.error('[VerifyAuthOTP] User not found for email confirmation:', email);
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Update user to confirm email
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error('[VerifyAuthOTP] Error confirming email:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to confirm email' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        actionResult = {
          verified: true,
          emailConfirmed: true,
          userId: authUser.id,
        };
        break;
      }

      case 'invite_user': {
        // Create new user from invitation
        if (!password) {
          return new Response(
            JSON.stringify({ error: 'Password is required for invitation acceptance' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Create the user with the invitation details
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName || result.metadata?.first_name,
            last_name: lastName || result.metadata?.last_name,
            site_id: siteId,
            invited_by: result.inviter_user_id,
          },
          app_metadata: {
            site_id: siteId,
          },
        });

        if (createError) {
          console.error('[VerifyAuthOTP] Error creating invited user:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create account' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Create user profile
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: newUser.user.id,
            site_id: siteId,
            company_id: result.company_id,
            first_name: firstName || result.metadata?.first_name || '',
            last_name: lastName || result.metadata?.last_name || '',
            email: email,
            role: result.metadata?.role || 'office_staff',
          });

        if (profileError) {
          console.error('[VerifyAuthOTP] Error creating user profile:', profileError);
        }

        actionResult = {
          verified: true,
          userCreated: true,
          userId: newUser.user.id,
          companyId: result.company_id,
        };
        break;
      }

      case 'magic_link': {
        // Generate a magic link session token
        const { user: authUser } = await getUserByEmail(supabaseAdmin, email);

        if (!authUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Generate a magic link token for the user
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (linkError) {
          console.error('[VerifyAuthOTP] Error generating magic link:', linkError);
          return new Response(
            JSON.stringify({ error: 'Failed to generate sign-in link' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        actionResult = {
          verified: true,
          userId: authUser.id,
          // Return the token properties for frontend to use
          accessToken: linkData.properties?.access_token,
          refreshToken: linkData.properties?.refresh_token,
        };
        break;
      }

      case 'change_email': {
        // Update user's email address
        const { user: authUser } = await getUserByEmail(supabaseAdmin, email);

        if (!authUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        if (!result.new_email) {
          return new Response(
            JSON.stringify({ error: 'New email not specified' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Update the user's email
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          {
            email: result.new_email,
            email_confirm: true,
          }
        );

        if (updateError) {
          console.error('[VerifyAuthOTP] Error updating email:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update email' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Update user profile email
        await supabaseAdmin
          .from('user_profiles')
          .update({ email: result.new_email })
          .eq('id', authUser.id);

        actionResult = {
          verified: true,
          emailChanged: true,
          newEmail: result.new_email,
          userId: authUser.id,
        };
        break;
      }

      case 'reset_password': {
        // Generate a password reset token for the user
        const { user: authUser } = await getUserByEmail(supabaseAdmin, email);

        if (!authUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // If password is provided, update it directly
        if (password) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password }
          );

          if (updateError) {
            console.error('[VerifyAuthOTP] Error updating password:', updateError);
            return new Response(
              JSON.stringify({ error: 'Failed to update password' }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          actionResult = {
            verified: true,
            passwordReset: true,
            userId: authUser.id,
          };
        } else {
          // Just confirm OTP is valid - password will be set in a follow-up request
          actionResult = {
            verified: true,
            canResetPassword: true,
            userId: authUser.id,
            tokenId: result.token_id,
          };
        }
        break;
      }

      case 'reauthentication': {
        // Just verify the OTP - the frontend will proceed with the sensitive action
        actionResult = {
          verified: true,
          reauthenticated: true,
          tokenId: result.token_id,
        };
        break;
      }
    }

    console.log(`[VerifyAuthOTP] ${type} completed successfully for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...actionResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('[VerifyAuthOTP] Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
