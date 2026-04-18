import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface MobileBottomNavProps {
  items: NavItem[];
}

/**
 * Mobile bottom navigation with thumb-friendly positioning and safe area support
 */
export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'glass-chrome border-t border-white/10 dark:border-white/5',
        'md:hidden',
        'z-50',
        'safe-area-x'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => (
          <NavButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={location.pathname === item.href}
          />
        ))}
      </div>
    </nav>
  );
}

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active: boolean;
}

function NavButton({ icon: Icon, label, href, active }: NavButtonProps) {
  return (
    <Link
      to={href}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'min-w-[64px] min-h-[48px] py-2 px-3 space-y-1',
        'transition-all duration-[180ms] ease-ios',
        'touch-manipulation tap-highlight-transparent',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        'active:scale-95',
        'rounded-2xl'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-2 inset-y-1 rounded-2xl bg-gradient-to-b from-primary/18 to-primary/8 ring-1 ring-inset ring-primary/20"
        />
      )}
      <Icon className={cn('h-5 w-5 relative z-[1]', active && 'drop-shadow-sm')} />
      <span
        className={cn(
          'text-xs font-medium leading-tight relative z-[1]',
          active && 'font-semibold'
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * Wrapper to add padding for mobile bottom navigation with safe area support
 */
export function MobileBottomNavWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pb-20 md:pb-0"
      style={{
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
    </div>
  );
}
