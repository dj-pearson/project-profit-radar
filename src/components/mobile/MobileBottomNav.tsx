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
 * Mobile bottom navigation with thumb-friendly positioning
 */
export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'bg-background border-t',
        'md:hidden', // Only show on mobile
        'z-50',
        'safe-area-inset-bottom'
      )}
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
        'min-w-[64px] min-h-[44px]',
        'space-y-1',
        'transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
        'active:scale-95 transition-transform'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

/**
 * Wrapper to add padding for mobile bottom navigation
 */
export function MobileBottomNavWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16 md:pb-0">
      {children}
    </div>
  );
}
