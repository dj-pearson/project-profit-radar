import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock } from "lucide-react";
import { CsrfTokenField } from "@/lib/security/csrfProtection.tsx";

interface SignInFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
  inputClassName: string;
  onSubmit: (e: FormEvent) => void;
  onSwitchToSignUp: () => void;
  onSwitchToForgot: () => void;
  renderOAuthButtons: () => React.ReactNode;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email, setEmail, password, setPassword,
  showPassword, setShowPassword, loading, inputClassName,
  onSubmit, onSwitchToSignUp, onSwitchToForgot, renderOAuthButtons,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-slate-400 mt-1 text-sm">Sign in to your Brikly account</p>
      </div>

      {renderOAuthButtons()}

      <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign in form">
        <CsrfTokenField />
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
          <Input
            id="email"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
            <button
              type="button"
              onClick={onSwitchToForgot}
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
              maxLength={128}
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

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500" aria-label="Secure connection indicator">
          <Lock className="w-3 h-3" aria-hidden="true" />
          <span>Secure Connection</span>
        </div>
      </form>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Create one
        </button>
      </p>
    </div>
  );
};

export default SignInForm;
