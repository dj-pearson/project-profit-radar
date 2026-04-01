import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Shield, Building2 } from "lucide-react";
import { getReturnUrl, clearRememberedRoute } from "@/lib/routeMemory";
import { useRedirectLoopDetection } from "@/hooks/useRedirectLoopDetection";
import AuthBrandingPanel from "@/components/auth/AuthBrandingPanel";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import PasswordResetFlow from "@/components/auth/PasswordResetFlow";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { useCsrfToken } from "@/lib/security/csrfProtection.tsx";
import { validateCsrfToken, getCsrfToken } from "@/lib/security/csrfProtection";
import { createEndpointLimiter } from "@/lib/security/rateLimiter";

type OTPFlowState = 'idle' | 'sending' | 'verifying' | 'submitted' | 'verified' | 'setting_password';
type AuthView = 'signin' | 'signup' | 'forgot';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<AuthView>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] as string[] });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentType, setEmailSentType] = useState<'signup' | 'reset' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{tier: string, period: string} | null>(null);
  const [otpFlowState, setOtpFlowState] = useState<OTPFlowState>('idle');
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(15);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordValidation, setNewPasswordValidation] = useState({ isValid: true, errors: [] as string[] });
  const otpResendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAttemptedRedirect = useRef(false);
  const redirectStabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SECURITY: Initialize CSRF token for auth forms
  const csrfToken = useCsrfToken();
  // SECURITY: Client-side rate limiter for sign-in attempts
  const signInLimiter = useRef(createEndpointLimiter('/auth/signin', 'auth'));

  const {
    signIn, signInWithGoogle, signInWithApple, signUp,
    resetPassword: authResetPassword, resetPasswordWithOTP,
    verifyOTP, resendOTP,
    user, userProfile, session, loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const { redirectLoopDetected, checkRedirectLoop, recordRedirectAttempt, clearRedirectLoopTracking, isBlocked } = useRedirectLoopDetection();

  useEffect(() => {
    return () => {
      if (otpResendTimerRef.current) clearInterval(otpResendTimerRef.current);
      if (redirectStabilityTimer.current) clearTimeout(redirectStabilityTimer.current);
    };
  }, []);

  const startResendCooldown = (seconds: number = 60) => {
    setOtpResendCooldown(seconds);
    if (otpResendTimerRef.current) clearInterval(otpResendTimerRef.current);
    otpResendTimerRef.current = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) { if (otpResendTimerRef.current) clearInterval(otpResendTimerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // --- URL params on mount ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const period = urlParams.get('period');
    const tab = urlParams.get('tab');
    if (plan && period) setPendingPlan({ tier: plan, period });
    if (tab) setActiveView(tab as AuthView);
  }, []);

  // --- Auth redirect effect ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = urlParams.get('type') || hashParams.get('type');
    const redirect = urlParams.get('redirect');
    const errorRecovery = urlParams.has('error_recovery');
    const refresh = urlParams.has('refresh');

    if (isBlocked()) return;
    if (errorRecovery || refresh) { window.history.replaceState({}, '', '/auth'); clearRedirectLoopTracking(); return; }
    if (!user || authLoading) { hasAttemptedRedirect.current = false; return; }
    if (type === 'recovery') return;
    if (checkRedirectLoop()) { hasAttemptedRedirect.current = true; return; }
    if (hasAttemptedRedirect.current) return;
    if (!session) return;

    if (redirectStabilityTimer.current) clearTimeout(redirectStabilityTimer.current);
    redirectStabilityTimer.current = setTimeout(() => {
      if (!user || !session || authLoading) return;
      hasAttemptedRedirect.current = true;
      recordRedirectAttempt();

      const pendingCheckout = localStorage.getItem('pendingCheckout');
      if (pendingCheckout && redirect === 'checkout') {
        try {
          const checkout = JSON.parse(pendingCheckout);
          if (Date.now() - checkout.timestamp < 3600000) {
            localStorage.removeItem('pendingCheckout');
            clearRememberedRoute(); clearRedirectLoopTracking();
            navigate('/pricing'); return;
          } else { localStorage.removeItem('pendingCheckout'); }
        } catch { localStorage.removeItem('pendingCheckout'); }
      }

      if (!userProfile || (!userProfile.company_id && userProfile.role !== 'root_admin')) {
        clearRememberedRoute(); clearRedirectLoopTracking(); navigate('/setup'); return;
      }
      const returnUrl = getReturnUrl(urlParams, '/dashboard');
      clearRememberedRoute(); clearRedirectLoopTracking(); navigate(returnUrl);
    }, 100);

    return () => { if (redirectStabilityTimer.current) clearTimeout(redirectStabilityTimer.current); };
  }, [user, userProfile, session, authLoading, navigate, checkRedirectLoop, recordRedirectAttempt, clearRedirectLoopTracking]);

  // --- Password validation ---
  const validatePasswordInput = useCallback((pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Must contain lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Must contain a number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push('Must contain special character');
    setPasswordValidation({ isValid: errors.length === 0, errors });
    setShowPasswordRequirements(pwd.length > 0);
  }, []);

  const validateNewPassword = useCallback((pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Must contain lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Must contain a number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push('Must contain special character');
    setNewPasswordValidation({ isValid: errors.length === 0, errors });
  }, []);

  // --- Form handlers ---
  // SECURITY: Validate CSRF token from form submission
  const verifyCsrf = useCallback((e: FormEvent): boolean => {
    const form = e.target as HTMLFormElement;
    const formCsrfInput = form.querySelector<HTMLInputElement>('input[name="csrf_token"]');
    const formToken = formCsrfInput?.value || '';
    const storedToken = getCsrfToken();
    if (!storedToken || !validateCsrfToken(storedToken, formToken)) {
      toast({ variant: "destructive", title: "Security Error", description: "Form validation failed. Please refresh the page and try again." });
      return false;
    }
    return true;
  }, []);

  const handleSignIn = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!verifyCsrf(e)) return;
    // SECURITY: Client-side rate limiting
    const rlResult = signInLimiter.current.checkRateLimit();
    if (!rlResult.allowed) {
      toast({ variant: "destructive", title: "Too Many Attempts", description: `Please wait ${rlResult.retryAfter} seconds before trying again.` });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." }); return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) toast({ title: "Welcome back!", description: "You've been successfully signed in." });
    setLoading(false);
  }, [email, password, signIn, verifyCsrf]);

  const handleSignUp = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!verifyCsrf(e)) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." }); return;
    }
    if (!passwordValidation.isValid) {
      toast({ variant: "destructive", title: "Password Requirements Not Met", description: passwordValidation.errors[0] }); return;
    }
    setLoading(true); setOtpFlowState('sending');
    const result = await signUp(email, password, { first_name: firstName, last_name: lastName, role: "admin" });
    if (result.error) { toast({ variant: "destructive", title: "Sign Up Failed", description: result.error }); setOtpFlowState('idle'); }
    else { setOtpExpiresIn(result.expiresInMinutes || 15); setOtpFlowState('verifying'); setEmailSent(true); setEmailSentType('signup'); startResendCooldown(60); toast({ title: "Verification Code Sent!", description: "Check your email for the 6-digit code." }); }
    setLoading(false);
  }, [email, password, firstName, lastName, passwordValidation, signUp, verifyCsrf]);

  const handleVerifySignupOTP = useCallback(async () => {
    if (otpCode.length !== 6) { toast({ variant: "destructive", title: "Invalid Code", description: "Enter the complete 6-digit code." }); return; }
    setLoading(true); setOtpFlowState('submitted');
    const result = await verifyOTP({ email, otpCode, type: 'confirm_signup' });
    if (result.success && result.emailConfirmed) {
      setOtpFlowState('verified'); toast({ title: "Email Verified!", description: "You can now sign in." });
      setTimeout(() => { setOtpFlowState('idle'); setEmailSent(false); setEmailSentType(null); setOtpCode(""); setPassword(""); setActiveView("signin"); }, 2000);
    } else { setOtpFlowState('verifying'); toast({ variant: "destructive", title: "Verification Failed", description: result.error || "Invalid code." }); }
    setLoading(false);
  }, [otpCode, email, verifyOTP]);

  const handleResendSignupOTP = useCallback(async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    const result = await resendOTP({ email, type: 'confirm_signup', recipientName: firstName });
    if (result.error) toast({ variant: "destructive", title: "Error", description: result.error });
    else { setOtpExpiresIn(result.expiresInMinutes || 15); setOtpCode(""); startResendCooldown(60); toast({ title: "Code Resent!" }); }
    setLoading(false);
  }, [otpResendCooldown, email, firstName, resendOTP]);

  const handleForgotPassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." }); return;
    }
    setLoading(true); setOtpFlowState('sending');
    const result = await authResetPassword(resetEmail);
    if (result.error) { toast({ variant: "destructive", title: "Reset Failed", description: result.error }); setOtpFlowState('idle'); }
    else { setOtpExpiresIn(result.expiresInMinutes || 10); setOtpFlowState('verifying'); setEmailSent(true); setEmailSentType('reset'); startResendCooldown(60); toast({ title: "Reset Code Sent!" }); }
    setLoading(false);
  }, [resetEmail, authResetPassword]);

  const handleVerifyResetOTP = useCallback(() => {
    if (otpCode.length !== 6) { toast({ variant: "destructive", title: "Invalid Code", description: "Enter the complete 6-digit code." }); return; }
    setOtpFlowState('setting_password');
  }, [otpCode]);

  const handleSetNewPassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!newPasswordValidation.isValid) { toast({ variant: "destructive", title: "Password Requirements Not Met", description: newPasswordValidation.errors[0] }); return; }
    if (newPassword !== confirmPassword) { toast({ variant: "destructive", title: "Passwords Don't Match" }); return; }
    setLoading(true);
    const result = await resetPasswordWithOTP(resetEmail, otpCode, newPassword);
    if (result.success) {
      setOtpFlowState('verified'); toast({ title: "Password Reset!", description: "You can now sign in." });
      setTimeout(() => { setOtpFlowState('idle'); setEmailSent(false); setEmailSentType(null); setOtpCode(""); setResetEmail(""); setNewPassword(""); setConfirmPassword(""); setActiveView("signin"); }, 2000);
    } else {
      if (result.error?.toLowerCase().includes('code') || result.error?.toLowerCase().includes('otp')) setOtpFlowState('verifying');
      toast({ variant: "destructive", title: "Reset Failed", description: result.error || "Failed to reset password." });
    }
    setLoading(false);
  }, [newPasswordValidation, newPassword, confirmPassword, resetEmail, otpCode, resetPasswordWithOTP]);

  const handleResendResetOTP = useCallback(async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    const result = await authResetPassword(resetEmail);
    if (result.error) toast({ variant: "destructive", title: "Error", description: result.error });
    else { setOtpExpiresIn(result.expiresInMinutes || 10); setOtpCode(""); startResendCooldown(60); toast({ title: "Code Resent!" }); }
    setLoading(false);
  }, [otpResendCooldown, resetEmail, authResetPassword]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { toast({ variant: "destructive", title: "Google Sign In Failed", description: error }); setLoading(false); }
  }, [signInWithGoogle]);

  const handleAppleSignIn = useCallback(async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    if (error) { toast({ variant: "destructive", title: "Apple Sign In Failed", description: error }); setLoading(false); }
  }, [signInWithApple]);

  const inputClassName = "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors";

  const renderOAuthButtons = () => (
    <OAuthButtons onGoogleSignIn={handleGoogleSignIn} onAppleSignIn={handleAppleSignIn} loading={loading} />
  );

  const renderPasswordRequirements = (pwd: string, idPrefix: string) => (
    <PasswordRequirements password={pwd} idPrefix={idPrefix} />
  );

  return (
    <main className="min-h-screen flex" role="main" aria-label="Authentication">
      <AuthBrandingPanel />

      <div className="w-full lg:w-1/2 xl:w-[45%] bg-slate-900 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Build<span className="text-blue-400">Desk</span></span>
            </Link>
          </div>

          {redirectLoopDetected && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-400">Authentication Loop Detected</p>
                  <p className="text-xs text-slate-400">Automatic navigation has been paused. This will reset in 60 seconds.</p>
                </div>
              </div>
            </div>
          )}

          {pendingPlan && (
            <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20" role="status">
              <div className="flex items-center gap-2 text-blue-400">
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">{pendingPlan.tier.charAt(0).toUpperCase() + pendingPlan.tier.slice(1)} Plan</span>
                <span className="text-blue-400/50 text-xs">{pendingPlan.period === 'annual' ? 'Annual' : 'Monthly'} - 14-day free trial</span>
              </div>
            </div>
          )}

          {activeView === 'signin' && (
            <SignInForm
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              showPassword={showPassword} setShowPassword={setShowPassword}
              loading={loading} inputClassName={inputClassName}
              onSubmit={handleSignIn}
              onSwitchToSignUp={() => setActiveView("signup")}
              onSwitchToForgot={() => setActiveView("forgot")}
              renderOAuthButtons={renderOAuthButtons}
            />
          )}

          {activeView === 'signup' && (
            <SignUpForm
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              showPassword={showPassword} setShowPassword={setShowPassword}
              loading={loading} inputClassName={inputClassName}
              passwordValidation={passwordValidation}
              showPasswordRequirements={showPasswordRequirements}
              emailSent={emailSent} emailSentType={emailSentType}
              otpFlowState={otpFlowState}
              otpCode={otpCode} setOtpCode={setOtpCode}
              otpExpiresIn={otpExpiresIn} otpResendCooldown={otpResendCooldown}
              onSubmit={handleSignUp}
              onVerifyOTP={handleVerifySignupOTP}
              onResendOTP={handleResendSignupOTP}
              onResetOTPFlow={() => { setEmailSent(false); setEmailSentType(null); setOtpFlowState('idle'); setOtpCode(""); }}
              onPasswordChange={validatePasswordInput}
              onSwitchToSignIn={() => setActiveView("signin")}
              renderOAuthButtons={renderOAuthButtons}
              renderPasswordRequirements={renderPasswordRequirements}
            />
          )}

          {activeView === 'forgot' && (
            <PasswordResetFlow
              resetEmail={resetEmail} setResetEmail={setResetEmail}
              loading={loading} inputClassName={inputClassName}
              emailSent={emailSent} emailSentType={emailSentType}
              otpFlowState={otpFlowState} setOtpFlowState={setOtpFlowState}
              otpCode={otpCode} setOtpCode={setOtpCode}
              otpExpiresIn={otpExpiresIn} otpResendCooldown={otpResendCooldown}
              newPassword={newPassword} setNewPassword={setNewPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              newPasswordValidation={newPasswordValidation}
              onSubmitReset={handleForgotPassword}
              onVerifyResetOTP={handleVerifyResetOTP}
              onSetNewPassword={handleSetNewPassword}
              onResendResetOTP={handleResendResetOTP}
              onResetFlow={() => { setEmailSent(false); setEmailSentType(null); setOtpFlowState('idle'); setOtpCode(""); setResetEmail(""); }}
              onSwitchToSignIn={() => setActiveView("signin")}
              onNewPasswordChange={validateNewPassword}
              renderPasswordRequirements={renderPasswordRequirements}
            />
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <nav className="flex items-center justify-center gap-4 text-xs text-slate-500" aria-label="Footer navigation">
              <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <Link to="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <Link to="/features" className="hover:text-slate-300 transition-colors">Features</Link>
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Auth;
