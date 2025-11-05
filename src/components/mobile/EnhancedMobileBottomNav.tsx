import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMobileNavigation, type MobileNavItem } from '@/hooks/useMobileNavigation';
import { vibrate } from '@/lib/mobile-utils';

interface EnhancedMobileBottomNavProps {
  customItems?: MobileNavItem[];
  showLabels?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Enhanced mobile bottom navigation with role-based and context-aware items
 */
export function EnhancedMobileBottomNav({
  customItems,
  showLabels = true,
  variant = 'default',
  className,
}: EnhancedMobileBottomNavProps) {
  const { items: defaultItems, activeHref, isCustomContext } = useMobileNavigation();
  const location = useLocation();
  const items = customItems || defaultItems;

  const handleNavClick = () => {
    // Provide haptic feedback on navigation
    vibrate(10);
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
        'bg-background/95 backdrop-blur-sm border-t',
        'md:hidden', // Only show on mobile
        'z-50',
        'safe-area-inset-bottom',
        className
      )}
    >
      {/* Context indicator */}
      {isCustomContext && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
      )}

      <div className={cn('flex items-center justify-around', navHeight)}>
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
        'transition-all duration-200',
        active ? 'text-primary' : 'text-muted-foreground',
        'active:scale-95',
        // Improved touch feedback
        'touch-manipulation',
        'tap-highlight-transparent',
      )}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {/* Badge indicator */}
      {badge && (
        <Badge
          variant="destructive"
          className={cn(
            'absolute top-1 right-2',
            'h-4 min-w-4 px-1',
            'text-[10px] leading-none',
            'flex items-center justify-center'
          )}
        >
          {badge}
        </Badge>
      )}

      {/* Icon */}
      <Icon className={iconSize} />

      {/* Label */}
      {showLabel && (
        <span className={cn('font-medium leading-tight', fontSize)}>
          {label}
        </span>
      )}

      {/* Active indicator */}
      {active && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
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
