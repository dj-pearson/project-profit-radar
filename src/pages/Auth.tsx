import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Building2,
  BarChart3,
  Users,
  HardHat,
  Eye,
  EyeOff,
} from "lucide-react";
import { getReturnUrl, clearRememberedRoute } from "@/lib/routeMemory";

// Redirect loop detection constants
const REDIRECT_LOOP_KEY = 'bd.auth.redirectLoop';
const REDIRECT_LOOP_THRESHOLD = 3;
const REDIRECT_LOOP_WINDOW = 10000;

// OTP verification flow states
type OTPFlowState =
  | 'idle'
  | 'sending'
  | 'verifying'
  | 'submitted'
  | 'verified'
  | 'setting_password';

// Auth view states
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
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: true,
    errors: [] as string[],
  });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentType, setEmailSentType] = useState<'signup' | 'reset' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{tier: string, period: string} | null>(null);

  // OTP verification state
  const [otpFlowState, setOtpFlowState] = useState<OTPFlowState>('idle');
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(15);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordValidation, setNewPasswordValidation] = useState({
    isValid: true,
    errors: [] as string[],
  });

  const otpResendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAttemptedRedirect = useRef(false);
  const redirectStabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    signIn,
    signInWithGoogle,
    signInWithApple,
    signUp,
    resetPassword,
    resetPasswordWithOTP,
    sendOTP,
    verifyOTP,
    resendOTP,
    user,
    userProfile,
    session,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect and prevent redirect loops
  const checkRedirectLoop = useCallback((): boolean => {
    try {
      const stored = sessionStorage.getItem(REDIRECT_LOOP_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const recentRedirects = data.timestamps.filter(
          (ts: number) => now - ts < REDIRECT_LOOP_WINDOW
        );
        if (recentRedirects.length >= REDIRECT_LOOP_THRESHOLD) {
          console.warn('Redirect loop detected, blocking redirect');
          sessionStorage.removeItem(REDIRECT_LOOP_KEY);
          return true;
        }
        sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify({
          timestamps: recentRedirects
        }));
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const recordRedirectAttempt = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(REDIRECT_LOOP_KEY);
      const data = stored ? JSON.parse(stored) : { timestamps: [] };
      data.timestamps.push(Date.now());
      sessionStorage.setItem(REDIRECT_LOOP_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearRedirectLoopTracking = useCallback(() => {
    try {
      sessionStorage.removeItem(REDIRECT_LOOP_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (otpResendTimerRef.current) {
        clearInterval(otpResendTimerRef.current);
      }
      if (redirectStabilityTimer.current) {
        clearTimeout(redirectStabilityTimer.current);
      }
    };
  }, []);

  // Start resend cooldown timer
  const startResendCooldown = (seconds: number = 60) => {
    setOtpResendCooldown(seconds);
    if (otpResendTimerRef.current) {
      clearInterval(otpResendTimerRef.current);
    }
    otpResendTimerRef.current = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) {
          if (otpResendTimerRef.current) {
            clearInterval(otpResendTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Check for plan context from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const period = urlParams.get('period');
    const tab = urlParams.get('tab');

    if (plan && period) {
      setPendingPlan({ tier: plan, period });
    }

    if (tab) {
      setActiveView(tab as AuthView);
    }
  }, []);

  // Navigate to dashboard after successful authentication
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = urlParams.get('type') || hashParams.get('type');
    const redirect = urlParams.get('redirect');
    const errorRecovery = urlParams.has('error_recovery');
    const refresh = urlParams.has('refresh');

    if (errorRecovery || refresh) {
      window.history.replaceState({}, '', '/auth');
      clearRedirectLoopTracking();
      return;
    }

    if (!user || authLoading) {
      hasAttemptedRedirect.current = false;
      return;
    }

    if (type === 'recovery') {
      return;
    }

    if (checkRedirectLoop()) {
      console.warn('Auth: Redirect loop detected, staying on auth page');
      hasAttemptedRedirect.current = true;
      return;
    }

    if (hasAttemptedRedirect.current) {
      return;
    }

    if (!session) {
      console.debug('Auth: User exists but no session, waiting for stable auth state');
      return;
    }

    if (redirectStabilityTimer.current) {
      clearTimeout(redirectStabilityTimer.current);
    }

    redirectStabilityTimer.current = setTimeout(() => {
      if (!user || !session || authLoading) {
        return;
      }

      hasAttemptedRedirect.current = true;
      recordRedirectAttempt();

      const pendingCheckout = localStorage.getItem('pendingCheckout');
      if (pendingCheckout && redirect === 'checkout') {
        try {
          const checkout = JSON.parse(pendingCheckout);
          if (Date.now() - checkout.timestamp < 3600000) {
            localStorage.removeItem('pendingCheckout');
            clearRememberedRoute();
            clearRedirectLoopTracking();
            navigate('/pricing');
            return;
          } else {
            localStorage.removeItem('pendingCheckout');
          }
        } catch (e) {
          console.error('Error parsing pending checkout:', e);
          localStorage.removeItem('pendingCheckout');
        }
      }

      if (!userProfile || (!userProfile.company_id && userProfile.role !== 'root_admin')) {
        clearRememberedRoute();
        clearRedirectLoopTracking();
        navigate('/setup');
        return;
      }

      const returnUrl = getReturnUrl(urlParams, '/dashboard');
      clearRememberedRoute();
      clearRedirectLoopTracking();
      navigate(returnUrl);
    }, 100);

    return () => {
      if (redirectStabilityTimer.current) {
        clearTimeout(redirectStabilityTimer.current);
      }
    };
  }, [user, userProfile, session, authLoading, navigate, checkRedirectLoop, recordRedirectAttempt, clearRedirectLoopTracking]);

  const validatePasswordInput = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push('Password must contain at least one special character');
    setPasswordValidation({ isValid: errors.length === 0, errors });
    setShowPasswordRequirements(pwd.length > 0);
  };

  const getPasswordRequirementStatus = (requirement: string, pwd: string = password) => {
    switch (requirement) {
      case 'length': return pwd.length >= 8;
      case 'lowercase': return /[a-z]/.test(pwd);
      case 'uppercase': return /[A-Z]/.test(pwd);
      case 'number': return /\d/.test(pwd);
      case 'special': return /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
      default: return false;
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      toast({ title: "Welcome back!", description: "You've been successfully signed in." });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    if (!passwordValidation.isValid) {
      toast({ variant: "destructive", title: "Password Requirements Not Met", description: passwordValidation.errors[0] });
      return;
    }
    setLoading(true);
    setOtpFlowState('sending');
    const userData = { first_name: firstName, last_name: lastName, role: "admin" };
    const result = await signUp(email, password, userData);
    if (result.error) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: result.error });
      setOtpFlowState('idle');
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 15);
      setOtpFlowState('verifying');
      setEmailSent(true);
      setEmailSentType('signup');
      startResendCooldown(60);
      toast({ title: "Verification Code Sent!", description: "Please check your email for the 6-digit verification code." });
    }
    setLoading(false);
  };

  const handleVerifySignupOTP = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Please enter the complete 6-digit verification code." });
      return;
    }
    setLoading(true);
    setOtpFlowState('submitted');
    const result = await verifyOTP({ email, otpCode, type: 'confirm_signup' });
    if (result.success && result.emailConfirmed) {
      setOtpFlowState('verified');
      toast({ title: "Email Verified!", description: "Your account has been verified. You can now sign in." });
      setTimeout(() => {
        setOtpFlowState('idle');
        setEmailSent(false);
        setEmailSentType(null);
        setOtpCode("");
        setPassword("");
        setActiveView("signin");
      }, 2000);
    } else {
      setOtpFlowState('verifying');
      toast({ variant: "destructive", title: "Verification Failed", description: result.error || "Invalid verification code. Please try again." });
    }
    setLoading(false);
  };

  const handleResendSignupOTP = async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    const result = await resendOTP({ email, type: 'confirm_signup', recipientName: firstName });
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 15);
      setOtpCode("");
      startResendCooldown(60);
      toast({ title: "Code Resent!", description: "A new verification code has been sent to your email." });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    setOtpFlowState('sending');
    const result = await resetPassword(resetEmail);
    if (result.error) {
      toast({ variant: "destructive", title: "Reset Failed", description: result.error });
      setOtpFlowState('idle');
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 10);
      setOtpFlowState('verifying');
      setEmailSent(true);
      setEmailSentType('reset');
      startResendCooldown(60);
      toast({ title: "Reset Code Sent!", description: "Please check your email for the 6-digit verification code." });
    }
    setLoading(false);
  };

  const validateNewPassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push('Password must contain at least one special character');
    setNewPasswordValidation({ isValid: errors.length === 0, errors });
  };

  const handleVerifyResetOTP = () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Please enter the complete 6-digit verification code." });
      return;
    }
    setOtpFlowState('setting_password');
    toast({ title: "Enter New Password", description: "Please create your new password below." });
  };

  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPasswordValidation.isValid) {
      toast({ variant: "destructive", title: "Password Requirements Not Met", description: newPasswordValidation.errors[0] });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords Don't Match", description: "Please make sure your passwords match." });
      return;
    }
    setLoading(true);
    const result = await resetPasswordWithOTP(resetEmail, otpCode, newPassword);
    if (result.success) {
      setOtpFlowState('verified');
      toast({ title: "Password Reset!", description: "Your password has been updated. You can now sign in." });
      setTimeout(() => {
        setOtpFlowState('idle');
        setEmailSent(false);
        setEmailSentType(null);
        setOtpCode("");
        setResetEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveView("signin");
      }, 2000);
    } else {
      if (result.error?.toLowerCase().includes('code') || result.error?.toLowerCase().includes('otp')) {
        setOtpFlowState('verifying');
      }
      toast({ variant: "destructive", title: "Reset Failed", description: result.error || "Failed to reset password. Please try again." });
    }
    setLoading(false);
  };

  const handleResendResetOTP = async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    const result = await resetPassword(resetEmail);
    if (result.error) {
      toast({ variant: "destructive", title: "Error", description: result.error });
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 10);
      setOtpCode("");
      startResendCooldown(60);
      toast({ title: "Code Resent!", description: "A new verification code has been sent to your email." });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ variant: "destructive", title: "Google Sign In Failed", description: error });
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    if (error) {
      toast({ variant: "destructive", title: "Apple Sign In Failed", description: error });
      setLoading(false);
    }
  };

  // Password requirement rendering helper
  const renderPasswordRequirements = (pwd: string, idPrefix: string) => (
    <div id={`${idPrefix}-requirements`} className="space-y-1.5 p-3 rounded-lg bg-slate-800/50 border border-white/5" role="status" aria-live="polite">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password Requirements</p>
      <ul className="space-y-1" aria-label="Password requirements checklist">
        {[
          { key: 'length', text: 'At least 8 characters' },
          { key: 'lowercase', text: 'One lowercase letter' },
          { key: 'uppercase', text: 'One uppercase letter' },
          { key: 'number', text: 'One number' },
          { key: 'special', text: 'One special character' }
        ].map(req => {
          const met = getPasswordRequirementStatus(req.key, pwd);
          return (
            <li key={req.key} className="flex items-center gap-2 text-xs">
              {met ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              )}
              <span className={met ? 'text-emerald-400' : 'text-slate-500'}>
                {req.text}
                <span className="sr-only">{met ? ' - met' : ' - not met'}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // OTP input rendering helper
  const renderOTPInput = () => (
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
  );

  // OAuth buttons component
  const renderOAuthButtons = () => (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-3 text-slate-500">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
          disabled={loading}
          onClick={handleAppleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Apple
        </Button>
      </div>
    </div>
  );

  // Styled input component for dark theme
  const inputClassName = "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors";

  return (
    <main
      className="min-h-screen flex"
      role="main"
      aria-label="Authentication"
    >
      {/* Left Panel - Branding & Hero */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
          <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                Build<span className="text-blue-400">Desk</span>
              </span>
            </Link>
          </div>

          {/* Hero text */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Build smarter.{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Profit more.
                </span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed">
                The construction management platform that gives you real-time financial control without enterprise complexity.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid gap-4">
              {[
                { icon: BarChart3, title: 'Real-Time Job Costing', desc: 'Know your margins on every project, every day' },
                { icon: Users, title: 'Team Collaboration', desc: 'Field to office, everyone stays in sync' },
                { icon: HardHat, title: 'Built for Construction', desc: 'Purpose-built tools for how you actually work' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 transition-colors">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust indicators */}
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {[
                  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'
                ].map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${color} border-2 border-slate-900 flex items-center justify-center`}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {['JM', 'SK', 'AR', 'TW', 'LP'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">
                Trusted by <span className="text-white font-medium">500+</span> construction companies
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                SOC2 Ready
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>256-bit encryption</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>99.9% uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 xl:w-[45%] bg-slate-900 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                Build<span className="text-blue-400">Desk</span>
              </span>
            </Link>
          </div>

          {/* Plan Context Banner */}
          {pendingPlan && (
            <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20" role="status">
              <div className="flex items-center gap-2 text-blue-400">
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {pendingPlan.tier.charAt(0).toUpperCase() + pendingPlan.tier.slice(1)} Plan
                </span>
                <span className="text-blue-400/50 text-xs">
                  {pendingPlan.period === 'annual' ? 'Annual' : 'Monthly'} - 14-day free trial
                </span>
              </div>
            </div>
          )}

          {/* ===== SIGN IN VIEW ===== */}
          {activeView === 'signin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                <p className="text-slate-400 mt-1 text-sm">Sign in to your BuildDesk account</p>
              </div>

              {renderOAuthButtons()}

              <form onSubmit={handleSignIn} className="space-y-4" aria-label="Sign in form">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-required="true"
                    placeholder="you@company.com"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                    <button
                      type="button"
                      onClick={() => setActiveView("forgot")}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-required="true"
                      placeholder="Enter your password"
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
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveView("signup")}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* ===== SIGN UP VIEW ===== */}
          {activeView === 'signup' && (
            <div className="space-y-6">
              {emailSent && emailSentType === 'signup' ? (
                /* OTP Verification for Signup */
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
                        onClick={() => { setEmailSent(false); setEmailSentType(null); setOtpFlowState('idle'); setOtpCode(""); }}
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

                      {renderOTPInput()}

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={handleVerifySignupOTP}
                        disabled={loading || otpCode.length !== 6}
                      >
                        {loading ? "Verifying..." : "Verify Email"}
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-slate-500">Didn't receive it?</span>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-400 hover:text-blue-300"
                          onClick={handleResendSignupOTP}
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
                /* Signup Form */
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create your account</h2>
                    <p className="text-slate-400 mt-1 text-sm">Start your 14-day free trial</p>
                  </div>

                  {renderOAuthButtons()}

                  <form onSubmit={handleSignUp} className="space-y-4" aria-label="Create account form">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-300 text-sm">First name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
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
                        autoComplete="email"
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
                            validatePasswordInput(e.target.value);
                          }}
                          required
                          minLength={8}
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
                      onClick={() => setActiveView("signin")}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===== FORGOT PASSWORD VIEW ===== */}
          {activeView === 'forgot' && (
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
                    /* New Password Form */
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

                      <form onSubmit={handleSetNewPassword} className="space-y-4" aria-label="Set new password form">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-slate-300 text-sm">New password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); validateNewPassword(e.target.value); }}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            aria-required="true"
                            aria-describedby={newPassword.length > 0 ? "new-password-requirements" : undefined}
                            aria-invalid={!newPasswordValidation.isValid && newPassword.length > 0}
                            placeholder="Create a strong password"
                            className={inputClassName}
                          />
                          {newPassword.length > 0 && renderPasswordRequirements(newPassword, "new-password")}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">Confirm password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            aria-required="true"
                            aria-invalid={confirmPassword.length > 0 && newPassword !== confirmPassword}
                            aria-describedby={confirmPassword.length > 0 && newPassword !== confirmPassword ? "password-match-error" : undefined}
                            placeholder="Confirm your password"
                            className={inputClassName}
                          />
                          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <p id="password-match-error" className="text-xs text-red-400 flex items-center gap-1" role="alert">
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              Passwords don't match
                            </p>
                          )}
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
                    /* OTP Entry for Reset */
                    <div className="space-y-5">
                      <button
                        type="button"
                        onClick={() => { setEmailSent(false); setEmailSentType(null); setOtpFlowState('idle'); setOtpCode(""); setResetEmail(""); }}
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
                        <p className="text-xs text-slate-500">Expires in {otpExpiresIn} minutes</p>
                      </div>

                      {renderOTPInput()}

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={handleVerifyResetOTP}
                        disabled={loading || otpCode.length !== 6}
                        aria-busy={loading}
                      >
                        {loading ? "Verifying..." : "Verify code"}
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-slate-500">Didn't receive it?</span>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-400 hover:text-blue-300"
                          onClick={handleResendResetOTP}
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
                /* Reset Password Request Form */
                <div className="space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveView("signin")}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to sign in
                    </button>
                    <h2 className="text-2xl font-bold text-white">Reset password</h2>
                    <p className="text-slate-400 mt-1 text-sm">We'll send you a 6-digit code to verify your identity</p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-4" aria-label="Reset password form">
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
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoComplete="email"
                        aria-required="true"
                        placeholder="you@company.com"
                        className={inputClassName}
                      />
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
