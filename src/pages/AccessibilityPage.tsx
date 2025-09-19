import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PageLayout } from '@/components/layouts/PageLayout';
import { AccessibilityPanel } from '@/components/accessibility/AccessibilityPanel';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Keyboard, 
  Eye, 
  Volume2, 
  Accessibility as AccessibilityIcon,
  HelpCircle 
} from 'lucide-react';

export default function AccessibilityPage() {
  const shortcuts = [
    { combo: 'Alt + Shift + C', action: 'Toggle high contrast mode' },
    { combo: 'Alt + Shift + O', action: 'Toggle outdoor mode' },
    { combo: 'Alt + Shift + =', action: 'Increase font size' },
    { combo: 'Alt + Shift + -', action: 'Decrease font size' },
    { combo: 'Alt + Shift + S', action: 'Toggle screen reader mode' },
    { combo: 'Alt + Shift + 1', action: 'Focus main content' },
    { combo: 'Alt + Shift + 2', action: 'Focus sidebar' },
    { combo: 'Alt + Shift + 3', action: 'Focus search' },
  ];

  return (
    <>
      <Helmet>
        <title>Accessibility Settings | Construction Management Platform</title>
        <meta
          name="description"
          content="Customize accessibility settings including high contrast mode, font sizes, screen reader optimization, and keyboard navigation for better usability."
        />
      </Helmet>
      <PageLayout>
        <div className="container mx-auto p-6 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <AccessibilityIcon className="h-8 w-8" />
              Accessibility Settings
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Customize the interface to meet your accessibility needs. These settings will be saved 
              and applied across all your sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Settings Panel */}
            <div className="xl:col-span-2">
              <AccessibilityPanel />
            </div>

            {/* Information Panel */}
            <div className="space-y-6">
              {/* Keyboard Shortcuts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Keyboard className="h-5 w-5" />
                    Keyboard Shortcuts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{shortcut.action}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {shortcut.combo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Accessibility Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="h-5 w-5" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Visual Accessibility</h4>
                      <p className="text-xs text-muted-foreground">
                        High contrast modes, adjustable font sizes, and outdoor viewing optimization
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Volume2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Screen Reader Support</h4>
                      <p className="text-xs text-muted-foreground">
                        Enhanced descriptions, ARIA labels, and audio feedback
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Keyboard className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Keyboard Navigation</h4>
                      <p className="text-xs text-muted-foreground">
                        Full keyboard control with enhanced focus indicators
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Info */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    This platform is designed to meet:
                  </p>
                  <div className="space-y-2">
                    <Badge variant="secondary">WCAG 2.1 AA</Badge>
                    <Badge variant="secondary">Section 508</Badge>
                    <Badge variant="secondary">ADA Compliant</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
}