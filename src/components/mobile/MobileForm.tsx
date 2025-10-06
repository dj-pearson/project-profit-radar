import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes } from 'react';

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

/**
 * Mobile-optimized input field with proper touch targets
 */
export function MobileInput({ label, id, error, className, ...props }: MobileInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input
        id={id}
        className={cn(
          'h-12 text-base', // Larger for mobile
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Email input with proper keyboard
 */
export function MobileEmailInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="email"
      inputMode="email"
      autoComplete="email"
      error={error}
      {...props}
    />
  );
}

/**
 * Phone input with numeric keyboard
 */
export function MobilePhoneInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      error={error}
      {...props}
    />
  );
}

/**
 * Number input with numeric keyboard
 */
export function MobileNumberInput({ label, id, error, ...props }: MobileInputProps) {
  return (
    <MobileInput
      label={label}
      id={id}
      type="number"
      inputMode="numeric"
      error={error}
      {...props}
    />
  );
}

/**
 * Mobile-optimized textarea
 */
interface MobileTextareaProps {
  label: string;
  id: string;
  error?: string;
  className?: string;
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function MobileTextarea({
  label,
  id,
  error,
  className,
  rows = 4,
  ...props
}: MobileTextareaProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Textarea
        id={id}
        rows={rows}
        className={cn(
          'text-base resize-none', // Larger text, disable resize on mobile
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Form wrapper with single-column layout
 */
export function MobileFormWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      {children}
    </div>
  );
}
