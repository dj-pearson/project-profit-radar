// Invite a client to a project's portal (US-319).
//
// There was no way to do this. Three access models existed and none of them
// reached a working page:
//
//   1. src/components/crm/ClientPortalAccess.tsx wrote a client_portal_access
//      row with a generated token and offered "copy link" to ${origin}/portal/
//      ${token} - a path no route answers, and a token nothing reads.
//   2. A client_portal_users table, created by no migration and absent from the
//      generated types (US-311), used only by an admin page.
//   3. The portal pages themselves assumed a Supabase auth user whose profile
//      role is client_portal, found by matching projects.client_email to the
//      user's address. Such a user could only be made through
//      invite-team-member, which counted the customer as a paid team seat and
//      (until US-320) emailed them nothing.
//
// This function is the missing surface. It:
//   1. authenticates the caller and requires a role that may invite,
//   2. verifies the project belongs to the caller's company - never the body,
//   3. creates or reuses the client's auth user at role client_portal,
//   4. writes the client_portal_access enrolment row, which is what the RLS
//      predicate client_has_project_access() reads,
//   5. writes the project_communication_participants row that project_messages
//      and the project-communications bucket have keyed their policies on since
//      20250706130335 and that nothing has ever written (US-316),
//   6. emails the client a set-password link through the same shared path as
//      the staff invite (US-320).
//
// Client portal users are NOT counted against the team-seat entitlement. A
// customer being shown their own job is not a seat the contractor bought, and
// billing them for it would make the portal something you ration.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  initializeAuthContext,
  errorResponse,
  successResponse,
} from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { writeAuditLog } from "../_shared/audit-log.ts";
import { sendInviteWithSetPasswordLink, escapeHtml } from "../_shared/invite-email.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(
    `[INVITE-CLIENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`,
  );
};

const InviteClientSchema = z.object({
  project_id: z.string().uuid("A valid project id is required"),
  email: z.string().email("A valid email is required"),
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional().nullable(),
  // read_only is the default for a reason: the portal's write actions are
  // approvals, and an approval is meaningful only from someone who was given
  // that power deliberately.
  access_level: z.enum(["read_only", "can_comment", "can_approve"]).default("read_only"),
  expires_at: z.string().datetime().optional().nullable(),
});

// Same ladder as invite-team-member, plus office_staff: the person who sets a
// customer up with portal access is often not the one who hires staff.
const CAN_INVITE_CLIENTS = new Set([
  "admin",
  "root_admin",
  "project_manager",
  "office_staff",
]);

/** Opaque enrolment key. Not a credential: nothing authenticates with it. */
const generateAccessToken = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

    const { data: inviter, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, company_id, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError || !inviter) {
      return errorResponse("Could not resolve your user profile", 403, req);
    }
    if (!inviter.company_id) {
      return errorResponse("Your account is not associated with a company", 403, req);
    }
    if (!CAN_INVITE_CLIENTS.has(inviter.role)) {
      return errorResponse("You do not have permission to invite clients", 403, req);
    }

    let payload: z.infer<typeof InviteClientSchema>;
    try {
      payload = InviteClientSchema.parse(await req.json());
    } catch (err) {
      const message = err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join("; ")
        : "Invalid request body";
      return errorResponse(message, 400, req);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // 2. The project must belong to the caller's company. Without this check a
    // caller could enrol anyone - including themselves - on another tenant's
    // job by passing its id.
    const { data: project } = await serviceClient
      .from("projects")
      .select("id, name, company_id, site_id")
      .eq("id", payload.project_id)
      .maybeSingle();

    if (!project || project.company_id !== inviter.company_id) {
      return errorResponse("That project is not in your company", 404, req);
    }

    const email = payload.email.trim().toLowerCase();

    // 3. Create or reuse the client's account. Reuse matters: one homeowner can
    // be a client on two jobs, and a second account would split their portal in
    // half and strand the first invite.
    const { data: existingProfile } = await serviceClient
      .from("user_profiles")
      .select("id, role, company_id")
      .ilike("email", email)
      .maybeSingle();

    let clientUserId = existingProfile?.id ?? null;
    let createdAccount = false;

    if (!clientUserId) {
      // No password: the invitee sets their own through the emailed link.
      const { data: authUser, error: createUserError } = await serviceClient.auth.admin
        .createUser({
          email,
          email_confirm: true,
          user_metadata: {
            first_name: payload.first_name,
            last_name: payload.last_name || "",
            role: "client_portal",
          },
        });

      if (createUserError || !authUser?.user) {
        logStep("createUser failed", createUserError?.message);
        return errorResponse(
          createUserError?.message || "Could not create the client account",
          400,
          req,
        );
      }

      clientUserId = authUser.user.id;
      createdAccount = true;

      const { error: insertProfileError } = await serviceClient.from("user_profiles").insert([{
        id: clientUserId,
        email,
        first_name: payload.first_name,
        last_name: payload.last_name || "",
        role: "client_portal",
        // The client belongs to the contractor's company for tenancy, but sees
        // nothing through it: every client-facing policy goes through
        // client_has_project_access(), which reads enrolment, not company.
        company_id: inviter.company_id,
        is_active: true,
      }]);

      if (insertProfileError) {
        await serviceClient.auth.admin.deleteUser(clientUserId).catch(() => {});
        logStep("profile insert failed", insertProfileError.message);
        return errorResponse("Could not create the client profile", 400, req);
      }
    } else if (existingProfile && existingProfile.company_id !== inviter.company_id) {
      // The address already belongs to someone in another tenant. Enrolling
      // them would hand that person a window into this company's project.
      return errorResponse(
        "That email already belongs to an account outside your company",
        409,
        req,
      );
    }

    // 4. Enrolment. This row is what every client-facing RLS policy reads.
    const { error: accessError } = await serviceClient
      .from("client_portal_access")
      .upsert({
        company_id: inviter.company_id,
        project_id: payload.project_id,
        client_email: email,
        user_id: clientUserId,
        access_token: generateAccessToken(),
        access_level: payload.access_level,
        expires_at: payload.expires_at || null,
        is_active: true,
        created_by: user.id,
      }, { onConflict: "project_id,client_email" });

    if (accessError) {
      logStep("enrolment failed", accessError.message);
      return errorResponse("Could not record the client's project access", 400, req);
    }

    // 5. The participant row (US-316). project_messages and the
    // project-communications bucket have keyed their policies on this table
    // since 20250706130335, and nothing has ever written to it, so the client
    // half of project messaging has never functioned.
    const { error: participantError } = await serviceClient
      .from("project_communication_participants")
      .upsert({
        project_id: payload.project_id,
        user_id: clientUserId,
        participant_type: "client",
        can_upload_files: payload.access_level !== "read_only",
      }, { onConflict: "project_id,user_id" });

    if (participantError) {
      // Enrolment succeeded, so the portal works; only messaging does not.
      // Worth knowing about, not worth failing the invite over.
      logStep("participant enrolment failed", participantError.message);
    }

    // 6. Tell the client.
    const [{ data: company }] = await Promise.all([
      serviceClient.from("companies").select("name").eq("id", inviter.company_id).maybeSingle(),
    ]);

    const inviterName = [inviter.first_name, inviter.last_name]
      .filter(Boolean).join(" ").trim() || user.email || "Your contractor";
    const companyName = company?.name || "your contractor";

    const delivery = await sendInviteWithSetPasswordLink(serviceClient, email, {
      subject: `${companyName} shared ${project.name} with you`,
      headline: `Follow ${escapeHtml(project.name)}`,
      bodyHtml: `
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
          Hi ${escapeHtml(payload.first_name)}, ${escapeHtml(inviterName)} at
          ${escapeHtml(companyName)} has given you access to your project,
          ${escapeHtml(project.name)}, on Brikly.
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0;">
          You can see progress, photos, documents and invoices, and approve
          change orders. Choose a password to get in.
        </p>`,
      bodyText:
        `${inviterName} at ${companyName} has given you access to your project, ` +
        `${project.name}, on Brikly.\n\n` +
        `You can see progress, photos, documents and invoices, and approve change orders.`,
      buttonLabel: "Set your password",
    });

    if (!delivery.sent) {
      logStep("Invite email failed", delivery.error);
    }

    await writeAuditLog(serviceClient, {
      actorUserId: user.id,
      companyId: inviter.company_id,
      action: "client.portal_access_granted",
      entityType: "client_portal_access",
      entityId: payload.project_id,
      after: {
        email,
        project_id: payload.project_id,
        access_level: payload.access_level,
        account_created: createdAccount,
        email_sent: delivery.sent,
      },
      description: `Gave ${email} portal access to ${project.name}` +
        (delivery.sent ? "" : " (invite email could not be sent)"),
      riskLevel: "high",
    });

    logStep("Client invited", {
      userId: clientUserId,
      projectId: payload.project_id,
      emailSent: delivery.sent,
    });

    return successResponse({
      userId: clientUserId,
      email,
      projectId: payload.project_id,
      accountCreated: createdAccount,
      emailSent: delivery.sent,
      emailError: delivery.sent ? undefined : (delivery.error || "The invite email could not be sent"),
    }, req);
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return errorResponse("An unexpected error occurred", 500, req);
  }
});
