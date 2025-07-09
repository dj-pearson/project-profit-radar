import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  generateCSRFToken,
  setCSRFToken,
  checkRateLimit,
} from "@/utils/security";
import { Shield, AlertCircle } from "lucide-react";

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
  const [csrfToken] = useState(() => generateCSRFToken());
  const { signIn, signInWithGoogle, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCSRFToken(csrfToken);
  }, [csrfToken]);

  // Check for password recovery tokens in URL on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const type = urlParams.get('type') || hashParams.get('type');
    
    // If this is a password recovery session, redirect to reset password page immediately
    if (type === 'recovery' && accessToken) {
      console.log("Password recovery session detected, redirecting to reset password...");
      navigate(`/reset-password${window.location.search}${window.location.hash}`);
      return;
    }
  }, [navigate]);

  // Navigate to dashboard after successful authentication
  useEffect(() => {
    if (user) {
      console.log("User authenticated, navigating to dashboard...");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const validatePasswordInput = (pwd: string) => {
    const validation = validatePassword(pwd);
    setPasswordValidation(validation);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (!checkRateLimit("signin-attempts", 5, 300000)) {
      // 5 attempts per 5 minutes
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
      });
      return;
    }

    // Input validation
    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);

    const sanitizedEmail = sanitizeInput(email);
    const { error } = await signIn(sanitizedEmail, password);

    if (!error) {
      toast({
        title: "Welcome back!",
        description: "You've been successfully signed in.",
      });
      // Navigation will be handled by route protection
    }

    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (!checkRateLimit("signup-attempts", 3, 3600000)) {
      // 3 attempts per hour
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before trying to create another account.",
      });
      return;
    }

    // Input validation
    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    const passwordValid = validatePassword(password);
    if (!passwordValid.isValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements Not Met",
        description: passwordValid.errors[0],
      });
      return;
    }

    setLoading(true);

    const sanitizedData = {
      first_name: sanitizeInput(firstName),
      last_name: sanitizeInput(lastName),
      role: "admin",
    };

    const { error } = await signUp(
      sanitizeInput(email),
      password,
      sanitizedData
    );

    if (!error) {
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (!checkRateLimit("reset-attempts", 3, 3600000)) {
      // 3 attempts per hour
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before requesting another password reset.",
      });
      return;
    }

    if (!validateEmail(resetEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(sanitizeInput(resetEmail));
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error,
      });
    } else {
      toast({
        title: "Reset Link Sent!",
        description: "Please check your email for the password reset link.",
      });
      setResetEmail("");
      setActiveTab("signin");
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
                <form onSubmit={handleSignUp} className="space-y-4">
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
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forgot">
            <Card>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
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
                    {loading ? "Sending Reset Link..." : "Send Reset Link"}
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
