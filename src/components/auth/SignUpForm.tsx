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
import { AlertCircle, CheckCircle, RefreshCw, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { CsrfTokenField } from "@/lib/security/csrfProtection.tsx";

type OTPFlowState = 'idle' | 'sending' | 'verifying' | 'submitted' | 'verified' | 'setting_password';

interface SignUpFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
  inputClassName: string;
  emailSent: boolean;
  emailSentType: 'signup' | 'reset' | null;
  otpFlowState: OTPFlowState;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpExpiresIn: number;
  otpResendCooldown: number;
  passwordValidation: { isValid: boolean; errors: string[] };
  showPasswordRequirements: boolean;
  onSubmit: (e: FormEvent) => void;
  onVerifyOTP: () => void;
  onResendOTP: () => void;
  onResetOTPFlow: () => void;
  onPasswordChange: (pwd: string) => void;
  onSwitchToSignIn: () => void;
  renderOAuthButtons: () => React.ReactNode;
  renderPasswordRequirements: (pwd: string, idPrefix: string) => React.ReactNode;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  email, setEmail, password, setPassword,
  firstName, setFirstName, lastName, setLastName,
  showPassword, setShowPassword, loading, inputClassName,
  emailSent, emailSentType, otpFlowState, otpCode, setOtpCode,
  otpExpiresIn, otpResendCooldown, passwordValidation,
  showPasswordRequirements, onSubmit, onVerifyOTP, onResendOTP,
  onResetOTPFlow, onPasswordChange, onSwitchToSignIn,
  renderOAuthButtons, renderPasswordRequirements,
}) => {
  return (
    <div className="space-y-6">
      {emailSent && emailSentType === 'signup' ? (
        <div className="space-y-6" role="status" aria-live="polite">
          {otpFlowState === 'verified' ? (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" aria-hidden="true" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Email Verified!</h3>
                <p className="text-slate-400 text-sm mt-1">Redirecting to sign in...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                onClick={onResetOTPFlow}
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
                <h3 className="text-lg font-semibold text-white">Verify your email</h3>
                <p className="text-sm text-slate-400">
                  We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
                </p>
                <p className="text-xs text-slate-500">Expires in {otpExpiresIn} minutes</p>
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
                onClick={onVerifyOTP}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-500">Didn't receive it?</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-400 hover:text-blue-300"
                  onClick={onResendOTP}
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
                <p className="text-xs text-slate-500 flex items-start gap-2">
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
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-slate-400 mt-1 text-sm">Start your 14-day free trial</p>
          </div>

          {renderOAuthButtons()}

          <form onSubmit={onSubmit} className="space-y-4" aria-label="Create account form">
            <CsrfTokenField />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-300 text-sm">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  maxLength={50}
                  autoComplete="given-name"
                  aria-required="true"
                  placeholder="John"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-300 text-sm">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  maxLength={50}
                  autoComplete="family-name"
                  aria-required="true"
                  placeholder="Doe"
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupEmail" className="text-slate-300 text-sm">Work email</Label>
              <Input
                id="signupEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                autoComplete="username email"
                aria-required="true"
                placeholder="you@company.com"
                className={inputClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupPassword" className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    onPasswordChange(e.target.value);
                  }}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-describedby={showPasswordRequirements ? "signup-password-requirements" : undefined}
                  aria-invalid={!passwordValidation.isValid && password.length > 0}
                  placeholder="Create a strong password"
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showPasswordRequirements && renderPasswordRequirements(password, "signup-password")}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              disabled={loading || !passwordValidation.isValid}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default SignUpForm;
