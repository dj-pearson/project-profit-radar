import React, { useState } from 'react';
import { MobileDashboardLayout } from '@/components/layout/MobileDashboardLayout';
import {
  MobileLayout,
  MobileSection,
  MobileGrid,
  MobileStack,
  MobileCard,
  MobileButton,
} from '@/components/mobile';
import {
  LongPressDemo,
  DoubleTapDemo,
  PinchZoomDemo,
  DragDemo,
  RotationDemo,
  CombinedGesturesDemo,
} from '@/components/mobile/GestureDemos';
import { EnhancedMobileBottomNav } from '@/components/mobile/EnhancedMobileBottomNav';
import { useMobileNavigation, type MobileNavItem } from '@/hooks/useMobileNavigation';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Gauge,
  Hand,
  Navigation,
  Zap,
  CheckCircle2,
  Users,
  Building2,
  DollarSign,
  Wrench,
  Calendar,
} from 'lucide-react';

/**
 * Advanced mobile showcase with gesture demos and enhanced navigation
 */
export default function AdvancedMobileShowcase() {
  const isMobile = useIsMobile();
  const { items: navItems, userRole, isCustomContext } = useMobileNavigation();
  const [showCustomNav, setShowCustomNav] = useState(false);

  // Custom navigation example
  const customNavItems: MobileNavItem[] = [
    { icon: Building2, label: 'Projects', href: '/projects-hub' },
    { icon: Calendar, label: 'Schedule', href: '/schedule-management' },
    { icon: Wrench, label: 'Tools', href: '/tools' },
    { icon: Users, label: 'Team', href: '/team' },
    { icon: DollarSign, label: 'Money', href: '/financial-hub', badge: 5 },
  ];

  return (
    <MobileDashboardLayout
      title="Advanced Mobile Features"
      showBottomNav={!showCustomNav}
    >
      <MobileLayout withPadding={false} className="space-y-6">
        {/* Header */}
        <MobileSection
          title="🚀 Advanced Mobile Showcase"
          description="Enhanced gestures, smart navigation, and touch interactions"
        >
          <MobileCard>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Device Type</p>
                  <p className="text-sm text-muted-foreground">
                    {isMobile ? 'Mobile Device' : 'Desktop/Tablet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">User Role</p>
                  <p className="text-sm text-muted-foreground">
                    {userRole.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Navigation className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Navigation Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {isCustomContext ? 'Context-Aware' : 'Role-Based'}
                  </p>
                </div>
              </div>
            </div>
          </MobileCard>
        </MobileSection>

        {/* Enhanced Navigation Features */}
        <MobileSection
          title="🧭 Smart Navigation"
          description="Role-based and context-aware bottom navigation"
        >
          <MobileStack spacing="md">
            <MobileCard>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Role-Based Navigation</h3>
                    <p className="text-sm text-muted-foreground">
                      Bottom nav adapts to your role
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm">Current navigation items:</p>
                  <div className="flex flex-wrap gap-2">
                    {navItems.map((item) => (
                      <Badge key={item.href} variant="secondary">
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </MobileCard>

            <MobileCard>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Context-Aware Nav</h3>
                    <p className="text-sm text-muted-foreground">
                      Changes based on current page
                    </p>
                  </div>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm">
                  Visit a project detail page or financial section to see the
                  navigation automatically adapt to show relevant actions.
                </p>
              </div>
            </MobileCard>

            <MobileCard>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold">Custom Navigation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Pages can define their own navigation items
                </p>
                <MobileButton
                  fullWidth
                  variant={showCustomNav ? 'outline' : 'default'}
                  onClick={() => setShowCustomNav(!showCustomNav)}
                >
                  {showCustomNav ? 'Show Default Nav' : 'Show Custom Nav'}
                </MobileButton>
              </div>
            </MobileCard>
          </MobileStack>
        </MobileSection>

        {/* Advanced Gestures */}
        <MobileSection
          title="👆 Advanced Touch Gestures"
          description="Rich touch interactions for mobile devices"
        >
          <MobileStack spacing="md">
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> These gestures work best on touch devices.
                On desktop, some interactions may be simulated with mouse.
              </p>
            </div>

            <LongPressDemo />
            <DoubleTapDemo />
            <PinchZoomDemo />
            <DragDemo />
            <RotationDemo />
            <CombinedGesturesDemo />
          </MobileStack>
        </MobileSection>

        {/* Feature Summary */}
        <MobileSection title="✨ Feature Summary">
          <MobileStack spacing="sm">
            <FeatureItem
              icon={<Hand />}
              title="Long Press"
              description="Hold for 500ms to activate"
            />
            <FeatureItem
              icon={<Hand />}
              title="Double Tap"
              description="Quick double tap detection"
            />
            <FeatureItem
              icon={<Hand />}
              title="Pinch to Zoom"
              description="Two-finger pinch scaling (0.5x - 3x)"
            />
            <FeatureItem
              icon={<Hand />}
              title="Drag"
              description="Drag elements with smooth tracking"
            />
            <FeatureItem
              icon={<Hand />}
              title="Rotation"
              description="Two-finger rotation gesture"
            />
            <FeatureItem
              icon={<Navigation />}
              title="Smart Navigation"
              description="Role-based and context-aware bottom nav"
            />
            <FeatureItem
              icon={<Zap />}
              title="Haptic Feedback"
              description="Vibration feedback on interactions"
            />
            <FeatureItem
              icon={<Gauge />}
              title="Performance"
              description="Optimized gesture detection with no lag"
            />
          </MobileStack>
        </MobileSection>

        {/* Implementation Examples */}
        <MobileSection
          title="📝 Implementation Examples"
          description="Code snippets for using these features"
        >
          <MobileCard>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Long Press Hook</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`const { handlers } = useLongPress(
  () => console.log('Long pressed!'),
  { threshold: 500 }
);

<div {...handlers}>Press me</div>`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Smart Navigation</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`const { items } = useMobileNavigation();

<EnhancedMobileBottomNav
  customItems={items}
  showLabels={true}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Pinch to Zoom</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`const { scale, handlers } = usePinchZoom(
  (s) => console.log(s)
);

<div {...handlers}
  style={{ transform: \`scale(\${scale})\` }}
>
  Zoom me
</div>`}
                </pre>
              </div>
            </div>
          </MobileCard>
        </MobileSection>
      </MobileLayout>

      {/* Custom Navigation Overlay */}
      {showCustomNav && isMobile && (
        <EnhancedMobileBottomNav customItems={customNavItems} />
      )}
    </MobileDashboardLayout>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <MobileCard>
      <div className="p-3 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </MobileCard>
  );
}
