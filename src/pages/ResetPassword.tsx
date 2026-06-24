import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  validatePassword,
  sanitizeInput,
} from "@/utils/security";
import { AlertCircle, CheckCircle, Lock } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check if we have access token and type parameters (from email link)
  // Supabase can pass these as either query parameters or URL fragments
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
  const type = urlParams.get('type') || hashParams.get('type');
  const error = urlParams.get('error') || hashParams.get('error');
  const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

  useEffect(() => {
    const validateTokenAndSetSession = async () => {
      // Check for errors first
      if (error) {
        console.error('Reset link error:', error, errorDescription);
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Reset Link Error",
          description: errorDescription || "There was an error with your reset link.",
        });
        return;
      }

      // Check if this is a password recovery link
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Session setup error:', error);
            setIsValidToken(false);
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: "This password reset link is invalid or has expired.",
            });
          } else {
            setIsValidToken(true);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          setIsValidToken(false);
        }
      } else if (type === 'recovery') {
        // Handle case where we have recovery type but tokens are in different format
        // Check if we have a current session (tokens might have been processed by Supabase already)
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && !error) {
            setIsValidToken(true);
          } else {
            setIsValidToken(false);
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: "This password reset link is invalid or has expired. Please request a new one.",
            });
          }
        } catch (error) {
          console.error('Session check error:', error);
          setIsValidToken(false);
          toast({
            variant: "destructive",
            title: "Invalid Reset Link",
            description: "Unable to validate reset link. Please request a new one.",
          });
        }
      } else {
        // No valid recovery parameters found
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Invalid Reset Link",
          description: "This password reset link is missing required parameters.",
        });
      }
    };

    validateTokenAndSetSession();
  }, [accessToken, refreshToken, type, error, errorDescription]);

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValidToken) {
      toast({
        variant: "destructive",
        title: "Invalid Session",
        description: "Please request a new password reset link.",
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        variant: "destructive",
        title: "Password Requirements Not Met",
        description: passwordValidation.errors[0],
      });
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please ensure both password fields match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: sanitizeInput(password)
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "Failed to update password. Please try again.",
        });
      } else {
        toast({
          title: "Password Updated!",
          description: "Your password has been successfully updated. You can now sign in with your new password.",
        });
        
        // Sign out to clear the temporary session and redirect to auth
        await supabase.auth.signOut();
        navigate("/auth", { 
          state: { message: "Password updated successfully. Please sign in with your new password." }
        });
      }
    } catch (error) {
      console.error('Password reset exception:', error);
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating token
  if (isValidToken === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4" role="main" aria-label="Password Reset">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center" role="status" aria-live="polite" aria-label="Validating reset link">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-blue mx-auto mb-4" aria-hidden="true"></div>
                <p className="text-muted-foreground">Validating reset link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Show error state for invalid token
  if (!isValidToken) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4" role="main" aria-label="Invalid Reset Link">
        <div className="w-full max-w-md">
          <header className="text-center mb-6">
            <Link to="/" className="inline-block">
              <h1 className="text-3xl font-bold text-construction-blue hover:text-construction-orange transition-colors">
                Brikly
              </h1>
            </Link>
            <p className="text-muted-foreground mt-2">
              Construction Management Platform
            </p>
          </header>

          <Card role="alert" aria-labelledby="error-title">
            <CardHeader>
              <CardTitle id="error-title" className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                Invalid Reset Link
              </CardTitle>
              <CardDescription>
                This password reset link is invalid, expired, or has already been used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  Please request a new password reset link from the sign-in page.
                </AlertDescription>
              </Alert>

              <nav className="flex flex-col gap-2" aria-label="Navigation options">
                <Button asChild>
                  <Link to="/auth">Go to Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Back to Homepage</Link>
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Show password reset form for valid token
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" role="main" aria-label="Set New Password">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-construction-blue hover:text-construction-orange transition-colors">
              Brikly
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">
            Construction Management Platform
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" aria-hidden="true" />
              Set New Password
            </CardTitle>
            <CardDescription id="form-description">
              Enter your new password below. Make sure it's strong and secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4" role="status">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Your reset link has been validated. You can now set a new password.
              </AlertDescription>
            </Alert>

            <form onSubmit={handlePasswordReset} className="space-y-4" aria-label="Set new password form" aria-describedby="form-description">
              <div className="space-y-2">
                <Label htmlFor="password">New Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  minLength={6}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  aria-required="true"
                  minLength={6}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="text-sm text-muted-foreground" id="password-requirements">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1" role="list" aria-label="Password requirements">
                  <li>At least 6 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
                {loading ? "Updating Password..." : "Update Password"}
              </Button>

              <nav className="text-center" aria-label="Additional navigation">
                <Link
                  to="/auth"
                  className="text-sm text-construction-blue hover:text-construction-orange transition-colors"
                >
                  Back to Sign In
                </Link>
              </nav>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ResetPassword;