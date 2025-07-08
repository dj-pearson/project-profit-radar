import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">Terms of Service</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none dark:prose-invert">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using BuildDesk Construction Management platform ("Service"), 
                  you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                <p className="mb-3">
                  BuildDesk provides a comprehensive construction management platform that includes:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Project management and tracking</li>
                  <li>Financial management and job costing</li>
                  <li>Document management and storage</li>
                  <li>Team collaboration tools</li>
                  <li>Reporting and analytics</li>
                  <li>Third-party integrations (QuickBooks, Stripe, etc.)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
                <p className="mb-3">To use our Service, you must:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be at least 18 years old or have parental consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Subscription and Payment</h2>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">4.1 Subscription Plans</h3>
                  <p>We offer various subscription plans with different features and limitations.</p>
                  
                  <h3 className="text-lg font-medium">4.2 Payment Terms</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                    <li>All fees are non-refundable except as required by law</li>
                    <li>We may change pricing with 30 days' notice</li>
                    <li>Failure to pay may result in service suspension</li>
                  </ul>
                  
                  <h3 className="text-lg font-medium">4.3 Free Trials</h3>
                  <p>Free trials may be offered with limitations and will convert to paid subscriptions unless cancelled.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
                <p className="mb-3">You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious software or spam</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with the Service's operation</li>
                  <li>Share your account with unauthorized users</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Data and Privacy</h2>
                <p className="mb-3">
                  Your use of the Service is also governed by our Privacy Policy. Key points include:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You retain ownership of your data</li>
                  <li>We implement industry-standard security measures</li>
                  <li>You can export your data at any time</li>
                  <li>We may use aggregated, anonymized data for improvements</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">7.1 Our Property</h3>
                  <p>The Service, including all content, features, and functionality, is owned by us and protected by copyright and other laws.</p>
                  
                  <h3 className="text-lg font-medium">7.2 Your Content</h3>
                  <p>You retain ownership of content you upload but grant us a license to use it to provide the Service.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
                <p className="mb-3">We strive to provide reliable service but cannot guarantee:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>100% uptime or availability</li>
                  <li>Uninterrupted access during maintenance</li>
                  <li>Compatibility with all devices or browsers</li>
                  <li>Error-free operation</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">9.1 By You</h3>
                  <p>You may cancel your subscription at any time through your account settings.</p>
                  
                  <h3 className="text-lg font-medium">9.2 By Us</h3>
                  <p>We may suspend or terminate your account for violations of these terms or non-payment.</p>
                  
                  <h3 className="text-lg font-medium">9.3 Data Retention</h3>
                  <p>After termination, we will retain your data for 30 days before deletion, unless required by law to retain longer.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by law, we shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages, including loss of profits, 
                  data, or business interruption.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
                <p>
                  You agree to indemnify and hold us harmless from any claims, damages, or expenses 
                  arising from your use of the Service or violation of these terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
                <p>
                  These terms are governed by the laws of [Your Jurisdiction] without regard to 
                  conflict of law principles.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
                <p>
                  We may modify these terms at any time. Significant changes will be communicated 
                  via email or platform notification. Continued use after changes constitutes acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">14. Contact Information</h2>
                <p>
                  For questions about these Terms of Service, please contact us at:
                </p>
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <p><strong>Email:</strong> support@builddesk.com</p>
                  <p><strong>Legal:</strong> legal@builddesk.com</p>
                  <p><strong>Address:</strong> BuildDesk Construction Management</p>
                  <p>123 Construction Way, Suite 100</p>
                  <p>Builder City, BC 12345</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">15. Severability</h2>
                <p>
                  If any provision of these terms is found to be unenforceable, the remaining 
                  provisions will continue in full force and effect.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;