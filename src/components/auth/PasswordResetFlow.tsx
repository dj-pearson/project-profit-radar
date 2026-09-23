import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  newPasswordSchema,
  passwordResetRequestSchema,
  type NewPasswordValues,
  type PasswordResetRequestValues,
} from "@/lib/validations/auth";
import { AuthFieldError } from "./AuthFieldError";
import { describedBy, useSyncedFormValues } from "./authFormHelpers";

type OTPFlowState = 'idle' | 'sending' | 'verifying' | 'submitted' | 'verified' | 'setting_password';

interface PasswordResetFlowProps {
  resetEmail: string;
  setResetEmail: (v: string) => void;
  loading: boolean;
  inputClassName: string;
  emailSent: boolean;
  emailSentType: 'signup' | 'reset' | null;
  otpFlowState: OTPFlowState;
  setOtpFlowState: (v: OTPFlowState) => void;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpExpiresIn: number;
  otpResendCooldown: number;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  newPasswordValidation: { isValid: boolean; errors: string[] };
  /** Called with the submit event once the email passes passwordResetRequestSchema. */
  onSubmitReset: (e: FormEvent) => void;
  onVerifyResetOTP: () => void;
  /** Called with the submit event once the passwords pass newPasswordSchema. */
  onSetNewPassword: (e: FormEvent) => void;
  onResendResetOTP: () => void;
  onResetFlow: () => void;
  onSwitchToSignIn: () => void;
  onNewPasswordChange: (pwd: string) => void;
  renderPasswordRequirements: (pwd: string, idPrefix: string) => React.ReactNode;
}

const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({
  resetEmail, setResetEmail, loading, inputClassName,
  emailSent, emailSentType, otpFlowState, setOtpFlowState,
  otpCode, setOtpCode, otpExpiresIn, otpResendCooldown,
  newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  newPasswordValidation, onSubmitReset, onVerifyResetOTP,
  onSetNewPassword, onResendResetOTP, onResetFlow, onSwitchToSignIn,
  onNewPasswordChange, renderPasswordRequirements,
}) => {
  const requestForm = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: resetEmail },
  });
  useSyncedFormValues(requestForm, { email: resetEmail });
  const requestErrors = requestForm.formState.errors;
  const resetEmailField = requestForm.register("email");

  const passwordForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword, confirmPassword },
  });
  useSyncedFormValues(passwordForm, { newPassword, confirmPassword });
  const passwordErrors = passwordForm.formState.errors;
  const newPasswordField = passwordForm.register("newPassword");
  const confirmPasswordField = passwordForm.register("confirmPassword");
  const mismatchMessage =
    confirmPassword.length > 0 && newPassword !== confirmPassword
      ? "Passwords don't match"
      : passwordErrors.confirmPassword?.message;

  return (
    <div className="space-y-6">
      {emailSent && emailSentType === 'reset' ? (
        <div className="space-y-5" role="status" aria-live="polite">
          {otpFlowState === 'verified' ? (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" aria-hidden="true" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Password Reset!</h3>
                <p className="text-slate-400 text-sm mt-1">Redirecting to sign in...</p>
              </div>
            </div>
          ) : otpFlowState === 'setting_password' ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setOtpFlowState('verifying')}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to code
              </button>

              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">Create new password</h3>
                <p className="text-sm text-emerald-400/80">Code verified successfully</p>
              </div>

              <form
                onSubmit={passwordForm.handleSubmit((_values, e) => onSetNewPassword(e as FormEvent))}
                noValidate
                className="space-y-4"
                aria-label="Set new password form"
              >
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300 text-sm">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...newPasswordField}
                    onChange={(e) => {
                      void newPasswordField.onChange(e);
                      setNewPassword(e.target.value);
                      onNewPasswordChange(e.target.value);
                    }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-describedby={describedBy(
                      newPassword.length > 0 && "new-password-requirements",
                      passwordErrors.newPassword && "new-password-error",
                    )}
                    aria-invalid={!!passwordErrors.newPassword || (!newPasswordValidation.isValid && newPassword.length > 0)}
                    placeholder="Create a strong password"
                    className={inputClassName}
                  />
                  {newPassword.length > 0 && renderPasswordRequirements(newPassword, "new-password")}
                  <AuthFieldError id="new-password-error" message={passwordErrors.newPassword?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...confirmPasswordField}
                    onChange={(e) => { void confirmPasswordField.onChange(e); setConfirmPassword(e.target.value); }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!mismatchMessage}
                    aria-describedby={describedBy(mismatchMessage && "password-match-error")}
                    placeholder="Confirm your password"
                    className={inputClassName}
                  />
                  <AuthFieldError id="password-match-error" message={mismatchMessage} />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  disabled={loading || !newPasswordValidation.isValid || newPassword !== confirmPassword}
                >
                  {loading ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                onClick={onResetFlow}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                    <KeyRound className="w-7 h-7 text-orange-400" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">Enter reset code</h3>
                <p className="text-sm text-slate-400">
                  Code sent to <span className="text-white font-medium">{resetEmail}</span>
                </p>
                <p className="text-xs text-slate-400">Expires in {otpExpiresIn} minutes</p>
              </div>

              <div className="flex justify-center py-4">
                <InputOTP
                  value={otpCode}
                  onChange={setOtpCode}
                  maxLength={6}
                  disabled={loading || otpFlowState === 'submitted'}
                  aria-label="Enter 6-digit verification code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="border-white/20 text-white bg-white/5" />
                    <InputOTPSlot index={1} className="border-white/20 text-white bg-white/5" />
                    <InputOTPSlot index={2} className="border-white/20 text-white bg-white/5" />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-white/30" />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="border-white/20 text-white bg-white/5" />
                    <InputOTPSlot index={4} className="border-white/20 text-white bg-white/5" />
                    <InputOTPSlot index={5} className="border-white/20 text-white bg-white/5" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                onClick={onVerifyResetOTP}
                disabled={loading || otpCode.length !== 6}
                aria-busy={loading}
              >
                {loading ? "Verifying..." : "Verify code"}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-400">Didn't receive it?</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-400 hover:text-blue-300"
                  onClick={onResendResetOTP}
                  disabled={loading || otpResendCooldown > 0}
                  aria-label={otpResendCooldown > 0 ? `Resend code in ${otpResendCooldown} seconds` : "Resend verification code"}
                >
                  {otpResendCooldown > 0 ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      {otpResendCooldown}s
                    </span>
                  ) : "Resend"}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                <p className="text-xs text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                  Check your spam folder if you don't see the email.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
            <h2 className="text-2xl font-bold text-white">Reset password</h2>
            <p className="text-slate-400 mt-1 text-sm">We'll send you a 6-digit code to verify your identity</p>
          </div>

          <form
            onSubmit={requestForm.handleSubmit((_values, e) => onSubmitReset(e as FormEvent))}
            noValidate
            className="space-y-4"
            aria-label="Reset password form"
          >
            <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5" role="note">
              <p className="text-xs text-slate-400 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
                The verification code expires after 10 minutes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resetEmail" className="text-slate-300 text-sm">Email address</Label>
              <Input
                id="resetEmail"
                type="email"
                {...resetEmailField}
                onChange={(e) => { void resetEmailField.onChange(e); setResetEmail(e.target.value); }}
                required
                autoComplete="email"
                aria-required="true"
                aria-invalid={!!requestErrors.email}
                aria-describedby={describedBy(requestErrors.email && "reset-email-error")}
                placeholder="you@company.com"
                className={inputClassName}
              />
              <AuthFieldError id="reset-email-error" message={requestErrors.email?.message} />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Sending code..." : "Send reset code"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PasswordResetFlow;
