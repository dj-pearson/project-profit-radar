import { CONTACT, hasPostalAddress, postalAddressLines } from '@/config/companyContact';
/**
 * Base Email Template
 * Provides consistent styling and layout for all emails
 */

export interface EmailTemplateProps {
  previewText?: string;
  headline: string;
  subheadline?: string;
  bodyContent: string; // HTML content
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
  unsubscribeUrl?: string;
}

export const baseEmailTemplate = ({
  previewText = 'Brikly - Construction Management Made Simple',
  headline,
  subheadline,
  bodyContent,
  ctaText,
  ctaUrl,
  footerText = 'Brikly - Construction Management Software',
  unsubscribeUrl = '{{unsubscribe_url}}',
}: EmailTemplateProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${headline}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    a {
      text-decoration: none;
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #F97316;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover {
      background-color: #EA580C;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText}
  </div>

  <!-- Preheader Spacer -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F3F4F6; padding: 40px 0;">
    <tr>
      <td align="center">

        <!-- Main Content Container -->
        <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0; text-align: center; background: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%);">
              <img src="https://brikly.net/logo.png" alt="Brikly" width="150" style="max-width: 150px; height: auto; margin-bottom: 20px;" />
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding: 20px 40px 0; text-align: center; background: linear-gradient(135deg, #FEF3C7 0%, #FFFFFF 100%);">
              <h1 style="margin: 0; color: #1F2937; font-size: 32px; line-height: 1.2; font-weight: 700;">
                ${headline}
              </h1>
              ${subheadline ? `
              <p style="margin: 12px 0 0; color: #F97316; font-size: 18px; font-weight: 600;">
                ${subheadline}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 40px;"></div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="content" style="padding: 0 40px 40px; color: #4B5563; font-size: 16px; line-height: 1.6;">
              ${bodyContent}
            </td>
          </tr>

          <!-- CTA Button -->
          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <a href="${ctaUrl}" class="button" style="display: inline-block; padding: 16px 32px; background-color: #F97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer
               CAN-SPAM Act (15 U.S.C. § 7704) and CASL require:
                 - clear identification of the sender,
                 - a physical postal address,
                 - a working unsubscribe mechanism honored within 10 business days.
               GDPR/ePrivacy further require a one-click withdrawal of consent
               for marketing emails. Keep all four elements present below. -->
          <tr>
            <td style="padding: 40px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 16px; color: #6B7280; font-size: 14px; line-height: 1.5;">
                ${footerText}
              </p>
              <!--
                CAN-SPAM (15 U.S.C. 7704(a)(5)) requires a VALID physical postal
                address in commercial email. The address hardcoded here was
                placeholder text ("123 Construction Way, Suite 100, Builder
                City, BC 12345"), which is a violation rather than compliance,
                so it was removed. Set POSTAL_ADDRESS in
                src/config/companyContact.ts to Brikly Inc.'s real registered
                address and it renders again here automatically. Commercial
                (marketing) email should not be sent until that is set.
              -->
              <p style="margin: 0 0 12px; color: #6B7280; font-size: 12px; line-height: 1.5;">
                <strong>${CONTACT.legalName}</strong>${
                  hasPostalAddress() ? `<br />${postalAddressLines().join('<br />')}` : ''
                }
              </p>
              <p style="margin: 0 0 8px; color: #9CA3AF; font-size: 12px;">
                You're receiving this email because you have an account with Brikly or signed up for product updates. Questions? Reply to this email or visit our <a href="https://brikly.net/support" style="color: #F97316;">Help Center</a>.
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe</a> |
                <a href="https://brikly.net/email-preferences" style="color: #9CA3AF; text-decoration: underline;">Email Preferences</a> |
                <a href="https://brikly.net/privacy-policy" style="color: #9CA3AF; text-decoration: underline;">Privacy Policy</a> |
                <a href="https://brikly.net/terms-of-service" style="color: #9CA3AF; text-decoration: underline;">Terms</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Email Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
          <tr>
            <td style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Brikly. All rights reserved.
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
};

export default baseEmailTemplate;
