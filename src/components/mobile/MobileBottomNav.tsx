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
        'bg-background/95 backdrop-blur-sm border-t',
        'md:hidden', // Only show on mobile
        'z-50',
        'safe-area-bottom-nav safe-area-x'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16">
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
        'flex flex-col items-center justify-center',
        'min-w-[64px] min-h-[48px] py-2 px-3',
        'space-y-1',
        'transition-all duration-150',
        'touch-manipulation',
        active
          ? 'text-primary scale-105'
          : 'text-muted-foreground hover:text-foreground',
        'active:scale-95 active:opacity-70',
        'rounded-lg'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
      <span className={cn(
        'text-xs font-medium leading-tight',
        active && 'font-semibold'
      )}>
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
