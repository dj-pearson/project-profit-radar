import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMobileNavigation, type MobileNavItem } from '@/hooks/useMobileNavigation';
import { useHaptics } from '@/hooks/useHaptics';

interface EnhancedMobileBottomNavProps {
  customItems?: MobileNavItem[];
  showLabels?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Enhanced mobile bottom navigation with role-based and context-aware items.
 *
 * Premium polish (US-117):
 *  - Spring-animated active pill indicator via framer-motion shared layoutId
 *  - Active icon springs to 1.1 scale
 *  - Badge pulses subtly when present
 *  - Light haptic on tab tap
 *  - Honors prefers-reduced-motion
 */
export function EnhancedMobileBottomNav({
  customItems,
  showLabels = true,
  variant = 'default',
  className,
}: EnhancedMobileBottomNavProps) {
  const { items: defaultItems, isCustomContext } = useMobileNavigation();
  const location = useLocation();
  const items = customItems || defaultItems;
  const haptics = useHaptics();

  const handleNavClick = () => {
    haptics.impact('light');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const navHeight = variant === 'compact' ? 'h-14' : 'h-16';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'glass-chrome border-t border-white/10 dark:border-white/5',
        'md:hidden',
        'z-50',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary"
    >
      {/* Thin brand gradient accent for contextual surfaces */}
      {isCustomContext && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
        aria-hidden="true"
      />

      <div className={cn('flex items-center justify-around px-1', navHeight)}>
        {items.map((item) => (
          <NavButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={isActive(item.href)}
            badge={item.badge}
            showLabel={showLabels}
            variant={variant}
            onClick={handleNavClick}
          />
        ))}
      </div>
    </nav>
  );
}

interface NavButtonProps {
  icon: any;
  label: string;
  href: string;
  active: boolean;
  badge?: string | number;
  showLabel: boolean;
  variant: 'default' | 'compact';
  onClick: () => void;
}

function NavButton({
  icon: Icon,
  label,
  href,
  active,
  badge,
  showLabel,
  variant,
  onClick,
}: NavButtonProps) {
  const reduceMotion = useReducedMotion();
  const [pulseKey, setPulseKey] = useState(0);

  // Re-trigger pulse animation whenever the badge value changes.
  useEffect(() => {
    if (badge !== undefined) setPulseKey((k) => k + 1);
  }, [badge]);

  const iconSize = variant === 'compact' ? 'h-5 w-5' : 'h-6 w-6';
  const fontSize = variant === 'compact' ? 'text-[10px]' : 'text-xs';

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center',
        'relative',
        'min-w-[64px] min-h-[48px]',
        'px-2',
        'space-y-1',
        'transition-colors duration-200',
        active ? 'text-primary' : 'text-muted-foreground',
        'touch-manipulation tap-highlight-transparent'
      )}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {/* Active pill background — shared layoutId springs between tabs */}
      {active && (
        <motion.div
          layoutId="mobile-nav-active-pill"
          className={cn(
            'absolute inset-x-2 inset-y-1 rounded-2xl',
            'bg-gradient-to-b from-primary/18 to-primary/8',
            'ring-1 ring-inset ring-primary/20',
            'shadow-ios-1'
          )}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 500, damping: 34 }
          }
          aria-hidden="true"
        />
      )}

      {badge && (
        <motion.div
          key={pulseKey}
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [0.6, 1.15, 1],
                  opacity: [0, 1, 1],
                }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute top-1 right-2 z-10"
        >
          <Badge
            variant="destructive"
            className={cn(
              'h-4 min-w-4 px-1',
              'text-[10px] leading-none',
              'flex items-center justify-center'
            )}
          >
            {badge}
          </Badge>
        </motion.div>
      )}

      <motion.div
        animate={reduceMotion ? undefined : { scale: active ? 1.1 : 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 24 }
        }
        className="relative z-[1]"
      >
        <Icon className={iconSize} />
      </motion.div>

      {showLabel && (
        <span className={cn('font-medium leading-tight relative z-[1]', fontSize)}>
          {label}
        </span>
      )}
    </Link>
  );
}

/**
 * Wrapper to add padding for mobile bottom navigation
 */
export function EnhancedMobileBottomNavWrapper({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'compact';
}) {
  const padding = variant === 'compact' ? 'pb-14' : 'pb-16';
  return <div className={cn(padding, 'md:pb-0')}>{children}</div>;
}
