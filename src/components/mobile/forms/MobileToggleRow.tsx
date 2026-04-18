import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * iOS-style settings row: icon + title/subtitle + Switch. Full row is
 * tappable (keyboard-accessible). Glass surface matches MobileCard.
 */
export function MobileToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  icon,
  disabled,
  className,
}: MobileToggleRowProps) {
  const id = useId();
  const haptics = useHaptics();

  const handleToggle = () => {
    if (disabled) return;
    haptics.selection();
    onCheckedChange(!checked);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={cn(
        'group flex items-center gap-3 p-4 rounded-2xl min-h-[64px]',
        'glass-thin shadow-ios-1',
        'transition-all duration-[180ms] ease-ios',
        !disabled &&
          'cursor-pointer active:scale-[0.99] active:bg-foreground/5 tap-highlight-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        disabled && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br from-primary/15 to-primary/5 text-primary',
            'ring-1 ring-inset ring-primary/10',
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="block text-base font-medium tracking-tight cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => {
          haptics.selection();
          onCheckedChange(v);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
