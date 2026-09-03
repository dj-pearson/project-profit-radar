// Invite Team Member Edge Function (US-199)
//
// Authoritative server-side path for adding a user to a company. This replaces
// the previous client-side flow (supabase.auth.admin.createUser + a direct
// user_profiles insert from the browser), which (a) required exposing the
// service-role key to the client and (b) enforced the seat limit ONLY in the
// UI via useSubscription().checkLimit() — trivially bypassable by calling the
// API directly.
//
// This function:
//   1. authenticates the caller (verify_jwt is on by default for this fn),
//   2. enforces RBAC (admin / root_admin / project_manager may invite),
//   3. Zod-validates the request body,
//   4. enforces the company's teamMembers plan limit server-side
//      (checkEntitlement) — the gate the client can no longer bypass,
//   5. derives company_id from the AUTHENTICATED caller's profile, never from
//      the request body, so a caller cannot inject another tenant's company_id,
//   6. creates the auth user + profile with the service role,
//   7. emails the invitee a link that lets them set their own password (US-320).
//
// US-320: this function used to mint a password with generatePassword(), create
// the user with it, and then neither send it nor return it. The inviter saw
// "User Invited Successfully" and the invitee was never told an account
// existed - so nobody but the very first user could ever reach a company. The
// user is now created with no password at all, and a recovery link (the flow
// src/pages/ResetPassword.tsx already handles end to end) is emailed through
// the same SES helper the rest of the auth mail uses.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  initializeAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { checkEntitlement } from "../_shared/entitlements.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { writeAuditLog } from '../_shared/audit-log.ts';
import { sendInviteWithSetPasswordLink, escapeHtml } from '../_shared/invite-email.ts';

const logStep = (step: string, details?: unknown) => {
  console.log(
    `[INVITE-TEAM-MEMBER] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`,
  );
};

// Roles a member can be invited as. Mirrors the role ladder in CLAUDE.md and the
// TeamManagement UI; excludes root_admin (platform-level, never company-invited).
const InviteRoleSchema = z.enum([
  "admin",
  "project_manager",
  "field_supervisor",
  "office_staff",
  "accounting",
  "client_portal",
]);

const InviteSchema = z.object({
  email: z.string().email("A valid email is required"),
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  role: InviteRoleSchema,
  phone: z.string().trim().max(40).optional().nullable(),
});

// Resending goes through this function rather than a second one so the RBAC
// gate, the company scoping and the email template have exactly one definition.
const ResendSchema = z.object({
  action: z.literal("resend"),
  user_id: z.string().uuid("A valid user id is required"),
});

// Roles permitted to invite new members.
const CAN_INVITE = new Set(["admin", "root_admin", "project_manager"]);

/**
 * The staff wording. Link generation, escaping and the send live in
 * _shared/invite-email.ts, which invite-client (US-319) uses too.
 */
async function sendInviteEmail(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  args: { email: string; firstName: string; companyName: string; inviterName: string; role: string },
): Promise<{ sent: boolean; error?: string }> {
  const readableRole = args.role.replace(/_/g, " ");
  const company = escapeHtml(args.companyName);
  const inviter = escapeHtml(args.inviterName);

  return await sendInviteWithSetPasswordLink(serviceClient, args.email, {
    subject: `${args.inviterName} invited you to ${args.companyName} on Brikly`,
    headline: `You have been added to ${company}`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hi ${escapeHtml(args.firstName)}, ${inviter} added you to ${company} on Brikly
        as ${escapeHtml(readableRole)}.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0;">
        Choose a password to finish setting up your account.
      </p>`,
    bodyText:
      `${args.inviterName} added you to ${args.companyName} on Brikly as ${readableRole}.\n\n` +
      `Set your password to finish setting up your account.`,
    buttonLabel: "Set your password",
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    // 1. Authenticate the caller.
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized - missing or invalid authentication", 401, req);
    }
    const { user, supabase } = authContext;

    // 2. Resolve caller's profile (role + company) from the server, not the body.
    const { data: inviter, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !inviter) {
      return errorResponse("Could not resolve your user profile", 403, req);
    }
    if (!inviter.company_id) {
      return errorResponse("Your account is not associated with a company", 403, req);
    }
    if (!CAN_INVITE.has(inviter.role)) {
      return errorResponse("You do not have permission to invite team members", 403, req);
    }

    // 3. Validate input. One body shape adds a member; the other resends an
    // existing member's set-password link.
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse("Invalid request body", 400, req);
    }

    const resend = ResendSchema.safeParse(rawBody);
    if (resend.success) {
      const serviceClientForResend = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      // The target must be in the caller's own company. Without this check a
      // project_manager could mail a password-reset link to any user id they
      // could guess, in any tenant.
      const { data: target } = await serviceClientForResend
        .from("user_profiles")
        .select("id, email, first_name, role, company_id, last_login")
        .eq("id", resend.data.user_id)
        .maybeSingle();

      if (!target || target.company_id !== inviter.company_id) {
        return errorResponse("That team member is not in your company", 404, req);
      }

      const [{ data: company }, { data: inviterProfile }] = await Promise.all([
        serviceClientForResend.from("companies").select("name").eq("id", inviter.company_id).maybeSingle(),
        serviceClientForResend.from("user_profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
      ]);

      const resendInviterName = [inviterProfile?.first_name, inviterProfile?.last_name]
        .filter(Boolean).join(" ").trim() || user.email || "A teammate";

      const delivery = await sendInviteEmail(serviceClientForResend, {
        email: target.email,
        firstName: target.first_name || "there",
        companyName: company?.name || "your team",
        inviterName: resendInviterName,
        role: target.role,
      });

      await writeAuditLog(serviceClientForResend, {
        actorUserId: user.id,
        companyId: inviter.company_id,
        action: 'team_member.invite_resent',
        entityType: 'user_profile',
        entityId: target.id,
        after: { email: target.email, email_sent: delivery.sent },
        description: `Resent the invite to ${target.email}` +
          (delivery.sent ? '' : ' (email could not be sent)'),
        riskLevel: 'medium',
      });

      if (!delivery.sent) {
        return errorResponse(
          delivery.error || "The invite email could not be sent",
          502,
          req,
        );
      }

      logStep("Invite resent", { userId: target.id });
      return successResponse({ userId: target.id, email: target.email, emailSent: true }, req);
    }

    let payload: z.infer<typeof InviteSchema>;
    try {
      payload = InviteSchema.parse(rawBody);
    } catch (err) {
      const message = err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join("; ")
        : "Invalid request body";
      return errorResponse(message, 400, req);
    }

    // A client_portal user cannot be granted admin via invite by a non-admin.
    if (payload.role === "admin" && !["admin", "root_admin"].includes(inviter.role)) {
      return errorResponse("Only an admin can invite another admin", 403, req);
    }

    // Service-role client for admin user creation + RLS-bypassing profile insert
    // and an authoritative seat count.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // 4. Enforce the seat limit server-side — the gate the UI can no longer be
    // the only enforcer of. Counts user_profiles for the caller's company.
    const entitlement = await checkEntitlement(
      serviceClient,
      inviter.company_id,
      "teamMembers",
      { userId: user.id },
    );
    if (!entitlement.allowed) {
      logStep("Seat limit reached", entitlement);
      return errorResponse(
        entitlement.reason || "Team member limit reached for your plan",
        403,
        req,
      );
    }

    // 5. Create the auth user, with NO password. The invitee sets their own
    // through the emailed link below (US-320). Omitting it is what makes
    // "no generated password is created, stored or displayed" true rather than
    // merely unmentioned.
    const { data: authUser, error: createUserError } = await serviceClient.auth.admin
      .createUser({
        email: payload.email,
        email_confirm: true,
        user_metadata: {
          first_name: payload.first_name,
          last_name: payload.last_name,
          role: payload.role,
        },
      });

    if (createUserError || !authUser?.user) {
      logStep("createUser failed", createUserError?.message);
      return errorResponse(
        createUserError?.message || "Could not create the user account",
        400,
        req,
      );
    }

    // 6. Insert the profile, with company_id derived from the AUTHENTICATED
    // inviter — never trusted from the request body.
    const { error: insertError } = await serviceClient.from("user_profiles").insert([
      {
        id: authUser.user.id,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role,
        phone: payload.phone || null,
        company_id: inviter.company_id,
        is_active: true,
      },
    ]);

    if (insertError) {
      // Roll back the orphaned auth user so a retry can succeed.
      await serviceClient.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      logStep("profile insert failed", insertError.message);
      return errorResponse(`Could not create the user profile: ${insertError.message}`, 400, req);
    }

    // 7. Email the invitee a set-password link. The account and profile already
    // exist at this point, so a failed send is not a failed invite - it is an
    // invite the recipient cannot act on yet, which the response says plainly
    // so the UI can offer a resend instead of claiming success.
    const [{ data: company }, { data: inviterProfile }] = await Promise.all([
      serviceClient.from("companies").select("name").eq("id", inviter.company_id).maybeSingle(),
      serviceClient.from("user_profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    ]);

    const inviterName = [inviterProfile?.first_name, inviterProfile?.last_name]
      .filter(Boolean).join(" ").trim() || user.email || "A teammate";

    const delivery = await sendInviteEmail(serviceClient, {
      email: payload.email,
      firstName: payload.first_name,
      companyName: company?.name || "your team",
      inviterName,
      role: payload.role,
    });

    if (!delivery.sent) {
      logStep("Invite email failed", delivery.error);
    }

    // Audit trail (US-244): granting someone access to a company, at a chosen
    // role, is exactly the kind of action a dispute or SOC2 review asks about.
    // Whether the invitee could actually be reached belongs in the same row.
    await writeAuditLog(serviceClient, {
      actorUserId: user.id,
      companyId: inviter.company_id,
      action: 'team_member.invited',
      entityType: 'user_profile',
      entityId: authUser.user.id,
      after: { email: payload.email, role: payload.role, email_sent: delivery.sent },
      description: `Invited ${payload.email} as ${payload.role}` +
        (delivery.sent ? '' : ' (invite email could not be sent)'),
      riskLevel: 'high',
    });

    logStep("Member invited", {
      userId: authUser.user.id,
      companyId: inviter.company_id,
      emailSent: delivery.sent,
    });
    return successResponse(
      {
        userId: authUser.user.id,
        email: payload.email,
        emailSent: delivery.sent,
        emailError: delivery.sent ? undefined : (delivery.error || "The invite email could not be sent"),
        usage: { current: entitlement.currentUsage + 1, limit: entitlement.limit },
      },
      req,
    );
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return errorResponse("An unexpected error occurred", 500, req);
  }
});
