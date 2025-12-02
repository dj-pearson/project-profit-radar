import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Shield, AlertCircle, CheckCircle, XCircle, Mail, Clock, RefreshCw, KeyRound } from "lucide-react";
import { getReturnUrl, clearRememberedRoute } from "@/lib/routeMemory";

// OTP verification flow states
type OTPFlowState =
  | 'idle'           // Not in OTP flow
  | 'sending'        // Sending OTP email
  | 'verifying'      // Waiting for user to enter OTP
  | 'submitted'      // OTP submitted, verifying
  | 'verified'       // OTP verified successfully
  | 'setting_password'; // Setting new password (for reset)

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
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
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Cleanup resend timer on unmount
  useEffect(() => {
    return () => {
      if (otpResendTimerRef.current) {
        clearInterval(otpResendTimerRef.current);
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
      setActiveTab(tab);
    }
  }, []);

  // Navigate to dashboard after successful authentication
  // Handle special auth parameters for SEO
  useEffect(() => {
    // Check for special auth parameters that should show the auth page
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = urlParams.get('type') || hashParams.get('type');
    const redirect = urlParams.get('redirect');
    const errorRecovery = urlParams.has('error_recovery');
    const refresh = urlParams.has('refresh');

    // If we have error_recovery or refresh parameters, clean the URL for SEO
    if (errorRecovery || refresh) {
      // Replace URL without parameters to avoid redirect issues
      window.history.replaceState({}, '', '/auth');
      return;
    }

    // Wait until auth profile has finished loading
    if (!user || authLoading) return;

    // Don't redirect to dashboard if this is a password recovery session
    if (type === 'recovery') {
      return;
    }


    // Check if there's a pending checkout
    const pendingCheckout = localStorage.getItem('pendingCheckout');
    if (pendingCheckout && redirect === 'checkout') {
      try {
        const checkout = JSON.parse(pendingCheckout);
        // Check if checkout is not expired (1 hour)
        if (Date.now() - checkout.timestamp < 3600000) {
          // Clear the stored checkout
          localStorage.removeItem('pendingCheckout');
          clearRememberedRoute();
          // Navigate to pricing which will auto-trigger checkout since user is now authenticated
          navigate('/pricing');
          return;
        } else {
          // Expired, clear it
          localStorage.removeItem('pendingCheckout');
        }
      } catch (e) {
        console.error('Error parsing pending checkout:', e);
        localStorage.removeItem('pendingCheckout');
      }
    }

    // If user doesn't have a company in their profile (and isn't root_admin), redirect to setup
    if (!userProfile || (!userProfile.company_id && userProfile.role !== 'root_admin')) {
      clearRememberedRoute();
      navigate('/setup');
      return;
    }

    // Get return URL from query params or remembered route
    const returnUrl = getReturnUrl(urlParams, '/dashboard');

    // Clear route memory after successful redirect
    clearRememberedRoute();

    // Navigate to the return URL
    navigate(returnUrl);
  }, [user, userProfile, authLoading, navigate]);

  const validatePasswordInput = (pwd: string) => {
    const errors: string[] = [];
    
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('Password must contain at least one special character');
    
    setPasswordValidation({ isValid: errors.length === 0, errors });
    setShowPasswordRequirements(pwd.length > 0);
  };

  const getPasswordRequirementStatus = (requirement: string) => {
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    switch (requirement) {
      case 'length': return isLongEnough;
      case 'lowercase': return hasLower;
      case 'uppercase': return hasUpper;
      case 'number': return hasNumber;
      case 'special': return hasSpecial;
      default: return false;
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "You've been successfully signed in.",
      });
    }

    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements Not Met",
        description: passwordValidation.errors[0],
      });
      return;
    }

    setLoading(true);
    setOtpFlowState('sending');

    const userData = {
      first_name: firstName,
      last_name: lastName,
      role: "admin",
    };

    // Create account and send OTP via signup-with-otp edge function
    // This bypasses Supabase's email system and sends OTP via Amazon SES
    const result = await signUp(email, password, userData);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: result.error,
      });
      setOtpFlowState('idle');
    } else {
      // OTP was already sent by the signup-with-otp edge function
      setOtpExpiresIn(result.expiresInMinutes || 15);
      setOtpFlowState('verifying');
      setEmailSent(true);
      setEmailSentType('signup');
      startResendCooldown(60);
      toast({
        title: "Verification Code Sent!",
        description: "Please check your email for the 6-digit verification code.",
      });
    }

    setLoading(false);
  };

  // Handle OTP verification for signup
  const handleVerifySignupOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setLoading(true);
    setOtpFlowState('submitted');

    const result = await verifyOTP({
      email,
      otpCode,
      type: 'confirm_signup',
    });

    if (result.success && result.emailConfirmed) {
      setOtpFlowState('verified');
      toast({
        title: "Email Verified!",
        description: "Your account has been verified. You can now sign in.",
      });
      // Reset form and switch to sign in tab
      setTimeout(() => {
        setOtpFlowState('idle');
        setEmailSent(false);
        setEmailSentType(null);
        setOtpCode("");
        setPassword("");
        setActiveTab("signin");
      }, 2000);
    } else {
      setOtpFlowState('verifying');
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: result.error || "Invalid verification code. Please try again.",
      });
    }

    setLoading(false);
  };

  // Handle resend OTP for signup
  const handleResendSignupOTP = async () => {
    if (otpResendCooldown > 0) return;

    setLoading(true);

    const result = await resendOTP({
      email,
      type: 'confirm_signup',
      recipientName: firstName,
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 15);
      setOtpCode("");
      startResendCooldown(60);
      toast({
        title: "Code Resent!",
        description: "A new verification code has been sent to your email.",
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);
    setOtpFlowState('sending');

    // Send OTP for password reset via reset-password-otp edge function
    // This bypasses Supabase's email system and sends OTP via Amazon SES
    const result = await resetPassword(resetEmail);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: result.error,
      });
      setOtpFlowState('idle');
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 10);
      setOtpFlowState('verifying');
      setEmailSent(true);
      setEmailSentType('reset');
      startResendCooldown(60);
      toast({
        title: "Reset Code Sent!",
        description: "Please check your email for the 6-digit verification code.",
      });
    }

    setLoading(false);
  };

  // Validate new password for reset
  const validateNewPassword = (pwd: string) => {
    const errors: string[] = [];

    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('Password must contain at least one special character');

    setNewPasswordValidation({ isValid: errors.length === 0, errors });
  };

  // Handle OTP format validation for password reset
  // Note: Actual OTP verification happens in handleSetNewPassword to avoid
  // marking the OTP as used before the password is set
  const handleVerifyResetOTP = () => {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    // Just validate format and proceed to password entry
    // The actual OTP verification will happen when setting the new password
    setOtpFlowState('setting_password');
    toast({
      title: "Enter New Password",
      description: "Please create your new password below.",
    });
  };

  // Handle setting new password after OTP entry
  // This verifies the OTP and sets the new password in one step
  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!newPasswordValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements Not Met",
        description: newPasswordValidation.errors[0],
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    setLoading(true);

    // Verify OTP and set new password via reset-password-otp edge function
    // This bypasses Supabase's email system entirely
    const result = await resetPasswordWithOTP(resetEmail, otpCode, newPassword);

    if (result.success) {
      setOtpFlowState('verified');
      toast({
        title: "Password Reset!",
        description: "Your password has been updated. You can now sign in.",
      });
      // Reset form and switch to sign in tab
      setTimeout(() => {
        setOtpFlowState('idle');
        setEmailSent(false);
        setEmailSentType(null);
        setOtpCode("");
        setResetEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveTab("signin");
      }, 2000);
    } else {
      // If OTP verification failed, go back to the OTP entry step
      if (result.error?.toLowerCase().includes('code') || result.error?.toLowerCase().includes('otp')) {
        setOtpFlowState('verifying');
      }
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: result.error || "Failed to reset password. Please try again.",
      });
    }

    setLoading(false);
  };

  // Handle resend OTP for password reset
  const handleResendResetOTP = async () => {
    if (otpResendCooldown > 0) return;

    setLoading(true);

    // Resend OTP via reset-password-otp edge function
    const result = await resetPassword(resetEmail);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      setOtpExpiresIn(result.expiresInMinutes || 10);
      setOtpCode("");
      startResendCooldown(60);
      toast({
        title: "Code Resent!",
        description: "A new verification code has been sent to your email.",
      });
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: error,
      });
      setLoading(false);
    }
    // If successful, user will be redirected by OAuth flow
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Apple Sign In Failed",
        description: error,
      });
      setLoading(false);
    }
    // If successful, user will be redirected by OAuth flow
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-construction-blue hover:text-construction-orange transition-colors">
              Build Desk
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">
            Construction Management Platform
          </p>
        </div>

        {/* Plan Context Banner */}
        {pendingPlan && (
          <Alert className="mb-4 border-construction-blue bg-construction-blue/5">
            <Shield className="h-4 w-4 text-construction-blue" />
            <AlertDescription className="text-construction-dark">
              <strong>Signing up for {pendingPlan.tier.charAt(0).toUpperCase() + pendingPlan.tier.slice(1)} Plan</strong>
              <p className="text-sm mt-1">
                {pendingPlan.period === 'annual' ? 'Annual billing' : 'Monthly billing'} • 14-day free trial
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="forgot">Reset Password</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to your Build Desk account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {loading ? "Signing In..." : "Continue with Google"}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    disabled={loading}
                    onClick={handleAppleSignIn}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {loading ? "Signing In..." : "Continue with Apple"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("forgot")}
                      className="text-sm text-construction-blue hover:text-construction-orange transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Get started with Build Desk today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailSent && emailSentType === 'signup' ? (
                  <div className="text-center space-y-4">
                    {otpFlowState === 'verified' ? (
                      <>
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-green-600">Email Verified!</h3>
                          <p className="text-muted-foreground">
                            Your account has been verified. Redirecting to sign in...
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <KeyRound className="w-8 h-8 text-orange-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Enter Verification Code</h3>
                          <p className="text-muted-foreground">
                            We've sent a 6-digit code to <strong>{email}</strong>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            The code expires in {otpExpiresIn} minutes.
                          </p>
                        </div>

                        <div className="flex justify-center py-4">
                          <InputOTP
                            value={otpCode}
                            onChange={setOtpCode}
                            maxLength={6}
                            disabled={loading || otpFlowState === 'submitted'}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          className="w-full"
                          onClick={handleVerifySignupOTP}
                          disabled={loading || otpCode.length !== 6}
                        >
                          {loading ? "Verifying..." : "Verify Email"}
                        </Button>

                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-muted-foreground">Didn't receive the code?</span>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={handleResendSignupOTP}
                            disabled={loading || otpResendCooldown > 0}
                          >
                            {otpResendCooldown > 0 ? (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Resend in {otpResendCooldown}s
                              </span>
                            ) : (
                              "Resend Code"
                            )}
                          </Button>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Check your spam folder if you don't see the email.
                          </AlertDescription>
                        </Alert>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setEmailSent(false);
                            setEmailSentType(null);
                            setOtpFlowState('idle');
                            setOtpCode("");
                            setActiveTab("signin");
                          }}
                        >
                          Back to Sign In
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {/* Email Verification Notice */}
                    <Alert className="border-blue-500 bg-blue-50">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <strong>Email Verification Required</strong>
                        <p className="text-sm mt-1">
                          After signing up, you'll receive a 6-digit verification code to activate your account.
                        </p>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">Email</Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Password</Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          validatePasswordInput(e.target.value);
                        }}
                        required
                        minLength={8}
                      />
                      {showPasswordRequirements && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Password Requirements:</p>
                          <div className="space-y-1">
                            {[
                              { key: 'length', text: 'At least 8 characters' },
                              { key: 'lowercase', text: 'One lowercase letter' },
                              { key: 'uppercase', text: 'One uppercase letter' },
                              { key: 'number', text: 'One number' },
                              { key: 'special', text: 'One special character' }
                            ].map(req => (
                              <div key={req.key} className="flex items-center gap-2 text-sm">
                                {getPasswordRequirementStatus(req.key) ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className={getPasswordRequirementStatus(req.key) ? 'text-green-600' : 'text-red-500'}>
                                  {req.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Alert className="mb-4">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        After creating your account, you'll receive a 6-digit verification code.
                        Enter the code to verify your email and activate your account.
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || !passwordValidation.isValid}
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {loading ? "Signing In..." : "Continue with Google"}
                    </Button>

                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      disabled={loading}
                      onClick={handleAppleSignIn}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      {loading ? "Signing In..." : "Continue with Apple"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forgot">
            <Card>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  {otpFlowState === 'setting_password'
                    ? 'Enter your new password'
                    : otpFlowState === 'verifying'
                    ? 'Enter the verification code'
                    : 'Enter your email to receive a reset code'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailSent && emailSentType === 'reset' ? (
                  <div className="space-y-4">
                    {otpFlowState === 'verified' ? (
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-green-600">Password Reset!</h3>
                          <p className="text-muted-foreground">
                            Your password has been updated. Redirecting to sign in...
                          </p>
                        </div>
                      </div>
                    ) : otpFlowState === 'setting_password' ? (
                      <form onSubmit={handleSetNewPassword} className="space-y-4">
                        <div className="text-center mb-4">
                          <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                          <p className="text-sm text-green-600 font-medium">Code verified! Create your new password.</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              validateNewPassword(e.target.value);
                            }}
                            required
                            minLength={8}
                          />
                          {newPassword.length > 0 && (
                            <div className="space-y-2 p-3 bg-muted rounded-md">
                              <p className="text-sm font-medium">Password Requirements:</p>
                              <div className="space-y-1">
                                {[
                                  { key: 'length', text: 'At least 8 characters', valid: newPassword.length >= 8 },
                                  { key: 'lowercase', text: 'One lowercase letter', valid: /[a-z]/.test(newPassword) },
                                  { key: 'uppercase', text: 'One uppercase letter', valid: /[A-Z]/.test(newPassword) },
                                  { key: 'number', text: 'One number', valid: /\d/.test(newPassword) },
                                  { key: 'special', text: 'One special character', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) }
                                ].map(req => (
                                  <div key={req.key} className="flex items-center gap-2 text-sm">
                                    {req.valid ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className={req.valid ? 'text-green-600' : 'text-red-500'}>
                                      {req.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                          />
                          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Passwords don't match
                            </p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loading || !newPasswordValidation.isValid || newPassword !== confirmPassword}
                        >
                          {loading ? "Resetting Password..." : "Reset Password"}
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <KeyRound className="w-8 h-8 text-orange-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Enter Reset Code</h3>
                          <p className="text-muted-foreground">
                            We've sent a 6-digit code to <strong>{resetEmail}</strong>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            The code expires in {otpExpiresIn} minutes.
                          </p>
                        </div>

                        <div className="flex justify-center py-4">
                          <InputOTP
                            value={otpCode}
                            onChange={setOtpCode}
                            maxLength={6}
                            disabled={loading || otpFlowState === 'submitted'}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          className="w-full"
                          onClick={handleVerifyResetOTP}
                          disabled={loading || otpCode.length !== 6}
                        >
                          {loading ? "Verifying..." : "Verify Code"}
                        </Button>

                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-muted-foreground">Didn't receive the code?</span>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={handleResendResetOTP}
                            disabled={loading || otpResendCooldown > 0}
                          >
                            {otpResendCooldown > 0 ? (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Resend in {otpResendCooldown}s
                              </span>
                            ) : (
                              "Resend Code"
                            )}
                          </Button>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Check your spam folder if you don't see the email.
                          </AlertDescription>
                        </Alert>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setEmailSent(false);
                            setEmailSentType(null);
                            setOtpFlowState('idle');
                            setOtpCode("");
                            setResetEmail("");
                            setActiveTab("signin");
                          }}
                        >
                          Back to Sign In
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <Alert className="mb-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        You'll receive a 6-digit verification code to reset your password. The code expires after 10 minutes.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending Reset Code..." : "Send Reset Code"}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("signin")}
                        className="text-sm text-construction-blue hover:text-construction-orange transition-colors"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-construction-blue transition-colors"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
