/**
 * Component Showcase Page
 * Demonstrates all new performance, accessibility, and mobile features
 * Use this as a reference for implementing the components in your app
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CardSkeleton,
  ListSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  StatCardSkeleton,
  ProjectCardSkeleton,
} from '@/components/ui/skeletons';
import { ProgressiveImage, LazyImage } from '@/components/performance/ProgressiveImage';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { OptimizedImageGallery, GalleryImage } from '@/components/gallery/OptimizedImageGallery';
import { TouchOptimizedButton } from '@/components/mobile/TouchOptimizedButton';
import { BiometricSettings } from '@/components/mobile/BiometricSettings';
import { GeofenceManager } from '@/components/mobile/GeofenceManager';
import { useReducedMotion, useHighContrast, useAnnounce } from '@/hooks/useAccessibilityHelpers';
import { Smartphone, Accessibility, Zap, Image, Eye, Fingerprint, MapPin } from 'lucide-react';

export default function ComponentShowcase() {
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();
  const announce = useAnnounce();

  // Sample gallery images
  const galleryImages: GalleryImage[] = [
    {
      id: '1',
      src: '/placeholder.svg',
      thumbnail: '/placeholder.svg',
      alt: 'Sample construction image 1',
      title: 'Foundation Work',
      caption: 'Day 1 - Foundation preparation',
    },
    {
      id: '2',
      src: '/placeholder.svg',
      thumbnail: '/placeholder.svg',
      alt: 'Sample construction image 2',
      title: 'Framing Progress',
      caption: 'Day 15 - Wall framing complete',
    },
    {
      id: '3',
      src: '/placeholder.svg',
      thumbnail: '/placeholder.svg',
      alt: 'Sample construction image 3',
      title: 'Roof Installation',
      caption: 'Day 30 - Roof structure',
    },
    {
      id: '4',
      src: '/placeholder.svg',
      thumbnail: '/placeholder.svg',
      alt: 'Sample construction image 4',
      title: 'Interior Work',
      caption: 'Day 45 - Drywall installation',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Component Showcase</h1>
        <p className="text-muted-foreground text-lg">
          Demonstration of all new performance, accessibility, and mobile features
        </p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={reducedMotion ? 'default' : 'outline'}>
            Reduced Motion: {reducedMotion ? 'On' : 'Off'}
          </Badge>
          <Badge variant={highContrast ? 'default' : 'outline'}>
            High Contrast: {highContrast ? 'On' : 'Off'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="skeletons" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="skeletons">
            <Zap className="h-4 w-4 mr-2" />
            Skeletons
          </TabsTrigger>
          <TabsTrigger value="images">
            <Image className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="accessibility">
            <Accessibility className="h-4 w-4 mr-2" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile
          </TabsTrigger>
          <TabsTrigger value="touch">
            <Eye className="h-4 w-4 mr-2" />
            Touch
          </TabsTrigger>
        </TabsList>

        {/* Skeleton Loading States */}
        <TabsContent value="skeletons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loading States</CardTitle>
              <CardDescription>
                Pre-built skeleton components for all UI patterns. Improves perceived performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    setShowSkeletons(!showSkeletons);
                    announce(showSkeletons ? 'Skeletons hidden' : 'Skeletons shown');
                  }}
                >
                  {showSkeletons ? 'Hide' : 'Show'} Skeletons
                </Button>
                <p className="text-sm text-muted-foreground">
                  Toggle to see different skeleton patterns
                </p>
              </div>

              {showSkeletons && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-semibold mb-3">Card Skeleton</h3>
                    <CardSkeleton />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">List Skeleton</h3>
                    <ListSkeleton items={3} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Table Skeleton</h3>
                    <TableSkeleton rows={5} columns={4} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Stat Cards</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Project Card</h3>
                    <ProjectCardSkeleton />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Form Skeleton</h3>
                    <FormSkeleton fields={4} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Dashboard Skeleton</h3>
                    <DashboardSkeleton />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progressive Images */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progressive Image Loading</CardTitle>
              <CardDescription>
                Images with blur-up effect, lazy loading, and optimized loading patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Progressive Image</h3>
                <div className="max-w-md">
                  <ProgressiveImage
                    src="/BuildDeskLogo.png"
                    alt="BuildDesk Logo"
                    aspectRatio="16/9"
                    className="rounded-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Loads with blur placeholder and transitions smoothly
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Lazy Image (Native)</h3>
                <div className="max-w-md">
                  <LazyImage
                    src="/BuildDeskLogo.png"
                    alt="BuildDesk Logo"
                    className="rounded-lg w-full"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Simple lazy loading with native loading="lazy"
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Optimized Gallery</h3>
                <Button onClick={() => setGalleryOpen(!galleryOpen)}>
                  {galleryOpen ? 'Hide' : 'Show'} Gallery
                </Button>
                {galleryOpen && (
                  <div className="mt-4">
                    <OptimizedImageGallery
                      images={galleryImages}
                      columns={4}
                      gap="md"
                      aspectRatio="4/3"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Full-featured gallery with lightbox, keyboard nav, and download
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Features</CardTitle>
              <CardDescription>
                WCAG 2.1 AA compliant components with full keyboard navigation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Accessible Modal</h3>
                <Button onClick={() => setModalOpen(true)}>
                  Open Accessible Modal
                </Button>
                <AccessibleModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  title="Accessible Modal Example"
                  description="This modal has focus trap, keyboard navigation, and screen reader support"
                  footer={
                    <>
                      <Button variant="outline" onClick={() => setModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        announce('Action confirmed!', 'assertive');
                        setModalOpen(false);
                      }}>
                        Confirm
                      </Button>
                    </>
                  }
                >
                  <div className="space-y-4">
                    <p>
                      This modal demonstrates all accessibility features:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Focus trap - Tab cycles through modal elements only</li>
                      <li>Escape key to close</li>
                      <li>Click outside to close</li>
                      <li>Returns focus to trigger element</li>
                      <li>Proper ARIA attributes</li>
                      <li>Body scroll lock</li>
                      <li>Screen reader announcements</li>
                    </ul>
                  </div>
                </AccessibleModal>
                <p className="text-sm text-muted-foreground mt-2">
                  Try keyboard navigation: Tab, Shift+Tab, Escape
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Screen Reader Test</h3>
                <Button onClick={() => announce('This is a screen reader announcement!', 'polite')}>
                  Trigger Announcement
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Screen readers will announce the message (enable screen reader to hear)
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Accessibility Hooks Available</h3>
                <div className="grid gap-2 text-sm">
                  <Badge variant="outline">useFocusTrap</Badge>
                  <Badge variant="outline">useAriaId</Badge>
                  <Badge variant="outline">useAnnounce</Badge>
                  <Badge variant="outline">useReducedMotion</Badge>
                  <Badge variant="outline">useHighContrast</Badge>
                  <Badge variant="outline">useKeyboardListNavigation</Badge>
                  <Badge variant="outline">useEscapeKey</Badge>
                  <Badge variant="outline">useClickOutside</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile Features */}
        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                <CardTitle>Biometric Authentication</CardTitle>
              </div>
              <CardDescription>
                Face ID, Touch ID, and Fingerprint support for mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BiometricSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <CardTitle>Geofencing & Auto Time Tracking</CardTitle>
              </div>
              <CardDescription>
                Automatic check-in/out when entering/exiting job sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeofenceManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Touch Optimization */}
        <TabsContent value="touch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Touch-Optimized Components</CardTitle>
              <CardDescription>
                44px minimum touch targets with haptic feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Touch-Optimized Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <TouchOptimizedButton touchSize="sm" haptic>
                    Small (44px)
                  </TouchOptimizedButton>
                  <TouchOptimizedButton touchSize="md" haptic>
                    Medium (48px)
                  </TouchOptimizedButton>
                  <TouchOptimizedButton touchSize="lg" haptic>
                    Large (56px)
                  </TouchOptimizedButton>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  All buttons meet WCAG 2.1 AAA touch target size requirements
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">With Haptic Feedback</h3>
                <TouchOptimizedButton touchSize="md" haptic variant="default">
                  Tap for Haptic
                </TouchOptimizedButton>
                <p className="text-sm text-muted-foreground mt-2">
                  On mobile devices, you'll feel subtle vibration feedback
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Implementation Guide */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
          <CardDescription>
            All components are ready to use in your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Available Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>13 Skeleton components for all UI patterns</li>
              <li>Progressive image loading with lazy loading</li>
              <li>Accessible modal with focus trap and keyboard nav</li>
              <li>Optimized image gallery with lightbox</li>
              <li>Biometric authentication (Face ID, Touch ID, Fingerprint)</li>
              <li>Geofencing for automatic time tracking</li>
              <li>Touch-optimized buttons with haptic feedback</li>
              <li>11 Accessibility hooks for WCAG compliance</li>
              <li>Mobile-first responsive design</li>
            </ul>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              All components include full TypeScript types, JSDoc documentation, and usage examples.
              Check the source files for implementation details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
