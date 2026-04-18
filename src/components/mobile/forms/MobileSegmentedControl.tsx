import { useId, useState, useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface MobileSegmentedControlProps<T extends string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  /** Makes each segment a full 44px hit target — prefer on touch-first UIs. */
  size?: 'sm' | 'md';
  /** Optional inline helper text. */
  helper?: string;
}

/**
 * iOS-style segmented control with a spring-animated active pill.
 * Keyboard accessible (roving tabindex + arrow keys), with haptic
 * feedback on selection.
 */
export function MobileSegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  size = 'md',
  helper,
}: MobileSegmentedControlProps<T>) {
  const reactId = useId();
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();
  const [focusedIndex, setFocusedIndex] = useState<number>(
    options.findIndex((o) => o.value === value),
  );

  useEffect(() => {
    setFocusedIndex(options.findIndex((o) => o.value === value));
  }, [value, options]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIndex + 1) % options.length;
      setFocusedIndex(next);
      onChange(options[next].value);
      haptics.selection();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIndex - 1 + options.length) % options.length;
      setFocusedIndex(prev);
      onChange(options[prev].value);
      haptics.selection();
    }
  };

  const heightClass = size === 'sm' ? 'min-h-[36px]' : 'min-h-[44px]';

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex w-full rounded-xl p-1',
          'glass-thin',
          'tap-highlight-transparent'
        )}
      >
        {options.map((opt, i) => {
          const selected = opt.value === value;
          const rowId = `${reactId}-${opt.value}`;
          return (
            <button
              key={opt.value}
              id={rowId}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (!selected) {
                  haptics.selection();
                  onChange(opt.value);
                  setFocusedIndex(i);
                }
              }}
              className={cn(
                'relative flex-1 rounded-lg font-medium text-sm tracking-tight',
                'flex items-center justify-center gap-1.5',
                heightClass,
                'transition-colors duration-[150ms] ease-ios',
                selected ? 'text-foreground' : 'text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`segmented-${reactId}`}
                  className="absolute inset-0 rounded-lg bg-background shadow-ios-1 ring-1 ring-inset ring-white/30 dark:ring-white/5"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 38 }
                  }
                  aria-hidden="true"
                />
              )}
              {opt.icon && (
                <span className="relative z-[1]" aria-hidden="true">
                  {opt.icon}
                </span>
              )}
              <span className="relative z-[1]">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {helper && (
        <p className="mt-1.5 px-1 text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
