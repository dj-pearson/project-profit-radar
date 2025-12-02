/**
 * BuildDesk Auth Email Templates
 *
 * OTP-based email templates for authentication flows.
 * All emails use 6-digit OTP codes instead of links to work with Amazon SES.
 */

import { SiteEmailConfig, DEFAULT_SITE_CONFIG } from './ses-email-service.ts';

export type AuthEmailType =
  | 'confirm_signup'
  | 'invite_user'
  | 'magic_link'
  | 'change_email'
  | 'reset_password'
  | 'reauthentication';

export interface AuthEmailData {
  type: AuthEmailType;
  recipientEmail: string;
  recipientName?: string;
  otpCode: string;
  expiresInMinutes?: number;
  inviterName?: string;
  companyName?: string;
  newEmail?: string;
}

/**
 * Base email wrapper with BuildDesk branding
 */
function baseEmailTemplate(
  content: string,
  config: SiteEmailConfig = DEFAULT_SITE_CONFIG
): string {
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${config.siteName}</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: ${config.primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .otp-code {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      padding: 16px 24px;
      background-color: #F3F4F6;
      border-radius: 8px;
      color: #1F2937;
    }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
      .otp-code { font-size: 24px; letter-spacing: 4px; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
    <tr>
      <td align="center">

        <!-- Main Content Container -->
        <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%);">
              <img src="${config.logoUrl}" alt="${config.siteName}" width="150" style="max-width: 150px; height: auto;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 20px 40px 40px; color: #4B5563; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 12px; color: #6B7280; font-size: 14px;">
                Questions? Contact us at <a href="mailto:${config.supportEmail}" style="color: ${config.primaryColor};">${config.supportEmail}</a>
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                &copy; ${year} ${config.siteName}. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #9CA3AF; font-size: 11px;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Confirm Sign Up Email
 */
function confirmSignupEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const name = data.recipientName || 'there';
  const expires = data.expiresInMinutes || 15;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      Verify Your Email Address
    </h1>

    <p style="margin: 0 0 16px;">Hi ${name},</p>

    <p style="margin: 0 0 24px;">
      Welcome to ${config.siteName}! To complete your registration, please enter the verification code below:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This code expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Security Tip:</strong> Never share this code with anyone. ${config.siteName} will never ask for your verification code.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: #6B7280; font-size: 14px;">
      If you didn't create an account with ${config.siteName}, you can safely ignore this email.
    </p>
  `;

  return {
    subject: `${data.otpCode} is your ${config.siteName} verification code`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Invite User Email
 */
function inviteUserEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const inviter = data.inviterName || 'A team member';
  const company = data.companyName || config.siteName;
  const expires = data.expiresInMinutes || 60;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      You've Been Invited!
    </h1>

    <p style="margin: 0 0 16px;">Hello,</p>

    <p style="margin: 0 0 24px;">
      ${inviter} has invited you to join <strong>${company}</strong> on ${config.siteName}. Enter the verification code below to accept the invitation and set up your account:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This invitation expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #DBEAFE; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #1E40AF; font-size: 14px;">
        <strong>What is ${config.siteName}?</strong><br/>
        ${config.siteName} is a comprehensive construction management platform that helps teams track projects, manage finances, and collaborate effectively.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: #6B7280; font-size: 14px;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `;

  return {
    subject: `${inviter} invited you to join ${company} on ${config.siteName}`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Magic Link / Passwordless Sign In Email
 */
function magicLinkEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const expires = data.expiresInMinutes || 10;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      Sign In to ${config.siteName}
    </h1>

    <p style="margin: 0 0 24px;">
      Use the code below to sign in to your ${config.siteName} account. No password needed!
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This code expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        <strong>Didn't request this?</strong> If you didn't try to sign in, someone may be trying to access your account. You can safely ignore this email and consider updating your password.
      </p>
    </div>
  `;

  return {
    subject: `${data.otpCode} is your ${config.siteName} sign-in code`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Change Email Address Email
 */
function changeEmailEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const newEmail = data.newEmail || data.recipientEmail;
  const expires = data.expiresInMinutes || 15;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      Confirm Your New Email Address
    </h1>

    <p style="margin: 0 0 24px;">
      You requested to change your email address to <strong>${newEmail}</strong>. Enter the verification code below to confirm this change:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This code expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #FEE2E2; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #991B1B; font-size: 14px;">
        <strong>Didn't request this change?</strong> If you didn't request an email change, please secure your account immediately by changing your password.
      </p>
    </div>
  `;

  return {
    subject: `${data.otpCode} - Confirm your new email address`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Reset Password Email
 */
function resetPasswordEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const expires = data.expiresInMinutes || 10;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      Reset Your Password
    </h1>

    <p style="margin: 0 0 24px;">
      We received a request to reset your ${config.siteName} password. Enter the verification code below to proceed:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This code expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #FEE2E2; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #991B1B; font-size: 14px;">
        <strong>Didn't request this?</strong> If you didn't request a password reset, your account is still secure. You can safely ignore this email.
      </p>
    </div>

    <p style="margin: 24px 0 0; color: #6B7280; font-size: 14px;">
      For security, password reset codes can only be used once and expire quickly. If you need a new code, please request another password reset.
    </p>
  `;

  return {
    subject: `${data.otpCode} is your ${config.siteName} password reset code`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Reauthentication Email (for sensitive actions)
 */
function reauthenticationEmail(
  data: AuthEmailData,
  config: SiteEmailConfig
): { subject: string; html: string } {
  const expires = data.expiresInMinutes || 5;

  const content = `
    <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 24px; font-weight: 700; text-align: center;">
      Verify Your Identity
    </h1>

    <p style="margin: 0 0 24px;">
      For your security, we need to verify your identity before completing a sensitive action on your ${config.siteName} account.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <span class="otp-code">${data.otpCode}</span>
    </div>

    <p style="margin: 24px 0 16px; text-align: center; color: #6B7280; font-size: 14px;">
      This code expires in <strong>${expires} minutes</strong>.
    </p>

    <div style="background-color: #FEE2E2; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #991B1B; font-size: 14px;">
        <strong>Did you initiate this request?</strong> If you didn't try to perform a sensitive action on your account, please change your password immediately and contact our support team.
      </p>
    </div>
  `;

  return {
    subject: `${data.otpCode} - Verify your ${config.siteName} identity`,
    html: baseEmailTemplate(content, config),
  };
}

/**
 * Generate auth email based on type
 */
export function generateAuthEmail(
  data: AuthEmailData,
  config: SiteEmailConfig = DEFAULT_SITE_CONFIG
): { subject: string; html: string } {
  switch (data.type) {
    case 'confirm_signup':
      return confirmSignupEmail(data, config);
    case 'invite_user':
      return inviteUserEmail(data, config);
    case 'magic_link':
      return magicLinkEmail(data, config);
    case 'change_email':
      return changeEmailEmail(data, config);
    case 'reset_password':
      return resetPasswordEmail(data, config);
    case 'reauthentication':
      return reauthenticationEmail(data, config);
    default:
      throw new Error(`Unknown auth email type: ${data.type}`);
  }
}

/**
 * Generate a secure 6-digit OTP code
 */
export function generateOTPCode(): string {
  // Generate cryptographically secure random number
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Get a 6-digit number (100000-999999)
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}
