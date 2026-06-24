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
//   6. creates the auth user + profile with the service role.
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

// Roles permitted to invite new members.
const CAN_INVITE = new Set(["admin", "root_admin", "project_manager"]);

const generatePassword = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let password = "";
  for (let i = 0; i < bytes.length; i++) {
    password += chars.charAt(bytes[i] % chars.length);
  }
  return password;
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

    // 3. Validate input.
    let payload: z.infer<typeof InviteSchema>;
    try {
      payload = InviteSchema.parse(await req.json());
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

    // 5. Create the auth user.
    const { data: authUser, error: createUserError } = await serviceClient.auth.admin
      .createUser({
        email: payload.email,
        password: generatePassword(),
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

    logStep("Member invited", { userId: authUser.user.id, companyId: inviter.company_id });
    return successResponse(
      {
        userId: authUser.user.id,
        email: payload.email,
        usage: { current: entitlement.currentUsage + 1, limit: entitlement.limit },
      },
      req,
    );
  } catch (err) {
    logStep("Unhandled error", err instanceof Error ? err.message : String(err));
    return errorResponse("An unexpected error occurred", 500, req);
  }
});
