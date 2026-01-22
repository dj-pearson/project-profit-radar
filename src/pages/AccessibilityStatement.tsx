import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Accessibility,
  CheckCircle2,
  Mail,
  Phone,
  ExternalLink,
  Eye,
  Keyboard,
  Volume2,
  Smartphone,
  Settings,
  AlertCircle
} from 'lucide-react';

/**
 * Accessibility Statement Page
 *
 * This page provides a formal accessibility statement as required by ADA/WCAG guidelines.
 * It documents our commitment to accessibility, conformance status, and feedback mechanisms.
 */
const AccessibilityStatement = () => {
  const navigate = useNavigate();
  const lastUpdated = new Date('2026-01-12').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <Helmet>
        <title>Accessibility Statement | BuildDesk Construction Management</title>
        <meta
          name="description"
          content="BuildDesk's commitment to digital accessibility. Learn about our WCAG 2.1 AA conformance, accessibility features, and how to provide feedback."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card" role="banner">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  aria-label="Return to home page"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Back to Home
                </Button>
                <div className="flex items-center space-x-2">
                  <Accessibility className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h1 className="text-xl font-semibold">Accessibility Statement</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Compliance Badges */}
          <div className="flex flex-wrap gap-2 mb-6" role="list" aria-label="Compliance certifications">
            <Badge variant="default" className="bg-green-600" role="listitem">
              <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
              WCAG 2.1 Level AA
            </Badge>
            <Badge variant="default" className="bg-blue-600" role="listitem">
              <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Section 508 Compliant
            </Badge>
            <Badge variant="default" className="bg-purple-600" role="listitem">
              <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
              ADA Compliant
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Accessibility Statement</CardTitle>
              <p className="text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none dark:prose-invert">
              <div className="space-y-8">
                {/* Commitment */}
                <section aria-labelledby="commitment-heading">
                  <h2 id="commitment-heading" className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Accessibility className="h-5 w-5 text-primary" aria-hidden="true" />
                    Our Commitment to Accessibility
                  </h2>
                  <p className="mb-3">
                    BuildDesk is committed to ensuring digital accessibility for people with disabilities.
                    We are continually improving the user experience for everyone and applying the relevant
                    accessibility standards to ensure we provide equal access to all users.
                  </p>
                  <p>
                    We believe that the internet should be accessible to everyone, and we are dedicated to
                    providing a website and application that is accessible to the widest possible audience,
                    regardless of technology or ability.
                  </p>
                </section>

                {/* Conformance Status */}
                <section aria-labelledby="conformance-heading">
                  <h2 id="conformance-heading" className="text-xl font-semibold mb-3">Conformance Status</h2>
                  <p className="mb-3">
                    The <strong>Web Content Accessibility Guidelines (WCAG)</strong> defines requirements for
                    designers and developers to improve accessibility for people with disabilities. It defines
                    three levels of conformance: Level A, Level AA, and Level AAA.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      BuildDesk is <strong>fully conformant</strong> with WCAG 2.1 Level AA.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Fully conformant means that the content fully conforms to the accessibility standard
                      without any exceptions.
                    </p>
                  </div>
                  <p>
                    Additionally, BuildDesk complies with:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 mt-3">
                    <li><strong>Section 508</strong> of the Rehabilitation Act</li>
                    <li><strong>Americans with Disabilities Act (ADA)</strong> Title III requirements</li>
                    <li><strong>EN 301 549</strong> European accessibility standard</li>
                  </ul>
                  <p className="mt-4">
                    For detailed conformance information, see our{' '}
                    <a
                      href="/docs/VPAT_WCAG_2.1_BuildDesk.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Voluntary Product Accessibility Template (VPAT)
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">(opens in new window)</span>
                    </a>
                  </p>
                </section>

                {/* Accessibility Features */}
                <section aria-labelledby="features-heading">
                  <h2 id="features-heading" className="text-xl font-semibold mb-3">Accessibility Features</h2>
                  <p className="mb-4">
                    BuildDesk includes the following accessibility features:
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Eye className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <h3 className="font-medium">Visual Accessibility</h3>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              <li>High contrast mode</li>
                              <li>Adjustable font sizes (small to large)</li>
                              <li>Outdoor/bright light mode</li>
                              <li>Color-blind friendly palette</li>
                              <li>Minimum 4.5:1 contrast ratios</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Keyboard className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <h3 className="font-medium">Keyboard Navigation</h3>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              <li>Full keyboard accessibility</li>
                              <li>Visible focus indicators</li>
                              <li>Skip navigation links</li>
                              <li>Keyboard shortcuts</li>
                              <li>Logical tab order</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Volume2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <h3 className="font-medium">Screen Reader Support</h3>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              <li>ARIA labels and landmarks</li>
                              <li>Descriptive link text</li>
                              <li>Form field associations</li>
                              <li>Live region announcements</li>
                              <li>Semantic HTML structure</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Smartphone className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <h3 className="font-medium">Mobile Accessibility</h3>
                            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                              <li>Touch-friendly controls</li>
                              <li>Responsive design</li>
                              <li>Orientation flexibility</li>
                              <li>Pinch-to-zoom support</li>
                              <li>VoiceOver/TalkBack compatible</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                {/* Customization */}
                <section aria-labelledby="customization-heading">
                  <h2 id="customization-heading" className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
                    Accessibility Customization
                  </h2>
                  <p className="mb-3">
                    BuildDesk provides a comprehensive accessibility settings panel that allows you to
                    customize your experience:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Contrast modes:</strong> Normal, High Contrast, and Outdoor/Bright Light modes
                    </li>
                    <li>
                      <strong>Font size:</strong> Adjustable from small to large text sizes
                    </li>
                    <li>
                      <strong>Motion preferences:</strong> Reduce or disable animations
                    </li>
                    <li>
                      <strong>Screen reader optimization:</strong> Enhanced descriptions and ARIA support
                    </li>
                    <li>
                      <strong>Keyboard navigation:</strong> Enhanced focus indicators and shortcuts
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/accessibility')}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      Open Accessibility Settings
                    </Button>
                  </div>
                </section>

                {/* Technical Specifications */}
                <section aria-labelledby="technical-heading">
                  <h2 id="technical-heading" className="text-xl font-semibold mb-3">Technical Specifications</h2>
                  <p className="mb-3">
                    BuildDesk's accessibility relies on the following technologies:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>HTML5</li>
                    <li>WAI-ARIA 1.2</li>
                    <li>CSS3</li>
                    <li>JavaScript (ECMAScript 2020+)</li>
                  </ul>
                  <p className="mt-4 mb-3">
                    These technologies are relied upon for conformance with WCAG 2.1 Level AA.
                  </p>
                </section>

                {/* Compatibility */}
                <section aria-labelledby="compatibility-heading">
                  <h2 id="compatibility-heading" className="text-xl font-semibold mb-3">Compatibility</h2>
                  <p className="mb-3">
                    BuildDesk is designed to be compatible with the following assistive technologies:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Screen Readers:</strong> JAWS, NVDA, VoiceOver, TalkBack, Narrator</li>
                    <li><strong>Screen Magnifiers:</strong> ZoomText, Windows Magnifier, macOS Zoom</li>
                    <li><strong>Speech Recognition:</strong> Dragon NaturallySpeaking, Windows Speech Recognition, Voice Control</li>
                    <li><strong>Keyboard Navigation:</strong> All features accessible via keyboard alone</li>
                  </ul>
                  <p className="mt-4 mb-3">
                    <strong>Supported Browsers:</strong>
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Chrome (latest 2 versions)</li>
                    <li>Firefox (latest 2 versions)</li>
                    <li>Safari (latest 2 versions)</li>
                    <li>Edge (latest 2 versions)</li>
                  </ul>
                </section>

                {/* Assessment Methods */}
                <section aria-labelledby="assessment-heading">
                  <h2 id="assessment-heading" className="text-xl font-semibold mb-3">Assessment Methods</h2>
                  <p className="mb-3">
                    BuildDesk assessed the accessibility of this website and application through the following methods:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Automated testing:</strong> Using axe-core, Lighthouse, and WAVE accessibility
                      evaluation tools integrated into our CI/CD pipeline
                    </li>
                    <li>
                      <strong>Manual testing:</strong> Regular testing with screen readers (NVDA, VoiceOver)
                      and keyboard-only navigation
                    </li>
                    <li>
                      <strong>Code review:</strong> All code changes reviewed for accessibility compliance
                      using ESLint accessibility rules
                    </li>
                    <li>
                      <strong>User testing:</strong> Feedback from users with disabilities incorporated
                      into ongoing improvements
                    </li>
                  </ul>
                </section>

                {/* Known Limitations */}
                <section aria-labelledby="limitations-heading">
                  <h2 id="limitations-heading" className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    Known Limitations
                  </h2>
                  <p className="mb-3">
                    While we strive for full accessibility, some limitations may exist:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Third-party content:</strong> Some embedded content from third-party providers
                      (such as certain map widgets or video players) may not be fully accessible. We work
                      with these providers to improve accessibility.
                    </li>
                    <li>
                      <strong>PDF documents:</strong> Some older PDF documents may not be fully accessible.
                      We are actively converting these to accessible formats. Please contact us if you need
                      an accessible version of any document.
                    </li>
                    <li>
                      <strong>Complex data visualizations:</strong> Charts and graphs include alternative
                      text descriptions, but the full data may be better accessed through downloadable
                      data tables.
                    </li>
                  </ul>
                  <p className="mt-3 text-muted-foreground">
                    We are actively working to address these limitations. If you encounter any barriers,
                    please contact us.
                  </p>
                </section>

                {/* Feedback */}
                <section aria-labelledby="feedback-heading">
                  <h2 id="feedback-heading" className="text-xl font-semibold mb-3">Feedback & Contact</h2>
                  <p className="mb-3">
                    We welcome your feedback on the accessibility of BuildDesk. Please let us know if you
                    encounter accessibility barriers:
                  </p>
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                      <div>
                        <strong>Email:</strong>{' '}
                        <a
                          href="mailto:accessibility@builddesk.com"
                          className="text-primary hover:underline"
                        >
                          accessibility@builddesk.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                      <div>
                        <strong>Phone:</strong>{' '}
                        <a
                          href="tel:+1-800-BUILD-DK"
                          className="text-primary hover:underline"
                        >
                          1-800-BUILD-DK (1-800-284-5335)
                        </a>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Response time:</strong> We aim to respond to accessibility feedback within
                        2 business days and resolve issues within 10 business days.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Enforcement */}
                <section aria-labelledby="enforcement-heading">
                  <h2 id="enforcement-heading" className="text-xl font-semibold mb-3">Enforcement Procedures</h2>
                  <p className="mb-3">
                    If you are not satisfied with our response to your accessibility concern, you may
                    escalate your complaint to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>U.S. Department of Justice</strong> - Civil Rights Division
                      <br />
                      <a
                        href="https://www.ada.gov/file-a-complaint/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        File an ADA Complaint
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">(opens in new window)</span>
                      </a>
                    </li>
                    <li>
                      <strong>Web Accessibility Initiative (WAI)</strong>
                      <br />
                      <a
                        href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        WCAG Guidelines
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">(opens in new window)</span>
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Version History */}
                <section aria-labelledby="version-heading">
                  <h2 id="version-heading" className="text-xl font-semibold mb-3">Statement Version</h2>
                  <p>
                    This statement was created on January 12, 2026, using the{' '}
                    <a
                      href="https://www.w3.org/WAI/planning/statements/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      W3C Accessibility Statement Generator Tool
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">(opens in new window)</span>
                    </a>{' '}
                    as a reference.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/accessibility')}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Accessibility Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/privacy-policy')}
                  className="flex items-center gap-2"
                >
                  Privacy Policy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/terms-of-service')}
                  className="flex items-center gap-2"
                >
                  Terms of Service
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <a
                    href="mailto:accessibility@builddesk.com"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Report an Issue
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="border-t mt-8 py-6 bg-card" role="contentinfo">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} BuildDesk Construction Management. All rights reserved.
              <br />
              <span className="text-xs">
                Committed to providing an accessible experience for all users.
              </span>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AccessibilityStatement;
