import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: string;
  role:
    | "root_admin"
    | "admin"
    | "project_manager"
    | "field_supervisor"
    | "office_staff"
    | "accounting"
    | "client_portal";
  is_active: boolean;
}

// SECURITY: Zod schema for validating cached user profile data
// This prevents type confusion and injection attacks from tampered sessionStorage
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(255),
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  role: z.enum([
    "root_admin",
    "admin",
    "project_manager",
    "field_supervisor",
    "office_staff",
    "accounting",
    "client_portal",
  ]),
  is_active: z.boolean(),
});

// OTP types for email verification flows
// No 'invite_user': send-auth-otp no longer accepts it (US-339). Invites go
// through invite-team-member, which authenticates the inviter.
export type OTPType =
  | 'confirm_signup'
  | 'magic_link'
  | 'change_email'
  | 'reset_password'
  | 'reauthentication';

export interface SendOTPOptions {
  email: string;
  type: OTPType;
  recipientName?: string;
  newEmail?: string;
  inviterName?: string;
  inviterUserId?: string;
  companyId?: string;
  companyName?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyOTPOptions {
  email: string;
  otpCode: string;
  type: OTPType;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  verified?: boolean;
  emailConfirmed?: boolean;
  userCreated?: boolean;
  emailChanged?: boolean;
  passwordReset?: boolean;
  canResetPassword?: boolean;
  reauthenticated?: boolean;
  userId?: string;
  newEmail?: string;
  // SECURITY (US-131): the magic_link flow returns only a short-lived, single-use
  // token hash - never raw access/refresh JWTs. The client exchanges it via
  // supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
  tokenHash?: string;
  error?: string;
}

/** A signed-in session held back until its MFA code is verified (US-346). */
export interface MfaChallenge {
  userId: string;
  email: string | null;
  accessToken: string;
}

/** The user-facing auth state, without the session (US-219). */
export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  mfaChallenge: MfaChallenge | null;
}

/** Every auth action. Identities never change for the provider's lifetime. */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: string; mfaRequired?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData?: { first_name?: string; last_name?: string; terms_accepted?: boolean }
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  // MFA challenge after password sign-in (US-346). While mfaChallenge is set,
  // the session exists but user, session and userProfile stay null.
  completeMfaChallenge: () => Promise<void>;
  cancelMfaChallenge: () => Promise<void>;
  // OTP-based authentication methods
  sendOTP: (options: SendOTPOptions) => Promise<{ error?: string; expiresInMinutes?: number }>;
  verifyOTP: (options: VerifyOTPOptions) => Promise<VerifyOTPResult>;
  resendOTP: (options: SendOTPOptions) => Promise<{ error?: string; expiresInMinutes?: number }>;
  resetPasswordWithOTP: (email: string, otpCode: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export type AuthContextType = AuthState & AuthActions & { session: Session | null };

