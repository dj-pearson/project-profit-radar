import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, MapPin, Linkedin, Twitter, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import SmartLogo from "@/components/ui/smart-logo";
import { toast } from "sonner";
import { OPEN_PREFERENCES_EVENT } from "@/lib/consent/consentStore";
import { CONTACT, hasPostalAddress, postalAddressLines } from '@/config/companyContact';

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Thanks for subscribing!");
    setEmail("");
  };
  const companyLinks = [
    { name: "Solutions", href: "/solutions" },
    { name: "FAQ", href: "/faq" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ];

  const productLinks = [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Integrations", href: "/integrations" },
    { name: "Mobile App", href: "/mobile-showcase" },
  ];

  const resourceLinks = [
    { name: "Resources", href: "/resources" },
    { name: "Tools", href: "/tools" },
    { name: "Case Studies", href: "/#case-studies" },
    { name: "API Docs", href: "/admin/developer-portal" },
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-of-service" },
    { name: "Acceptable Use", href: "/acceptable-use-policy" },
    { name: "Refund & Cancellation", href: "/refund-policy" },
    { name: "Cookie Policy", href: "/cookie-policy" },
    { name: "Your Privacy Choices", href: "/do-not-sell" },
    { name: "Email Preferences", href: "/email-preferences" },
    { name: "DMCA", href: "/dmca" },
    { name: "AI Disclosure", href: "/ai-disclosure" },
    { name: "DPA", href: "/dpa" },
    { name: "Subprocessors", href: "/subprocessors" },
    { name: "Security", href: "/legal/security" },
    { name: "SLA", href: "/sla" },
    { name: "Accessibility", href: "/accessibility-statement" },
  ];

  /**
   * Re-open the cookie consent banner so the user can change their choice at
   * any time. We dispatch an event that CookieConsentBanner subscribes to —
   * no page reload needed. We do NOT call resetConsent() here because that
   * would force the user back through Accept/Reject; instead the banner
   * opens with the current choice pre-filled in the customize dialog.
   */
  const reopenCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
  };


  return (
    <footer className="bg-construction-blue">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-16">
          {/* Top Section - CTA */}
          <div className="text-center mb-16 pb-16 border-b border-white/20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">
              Ready to Transform Your Construction Business?
            </h2>
            {/* Hero tag — performance/popularity claims removed pending
                substantiation (FTC §5). Re-introduce specific numbers via
                CLAIMS.* in src/config/claims.ts once verified. */}
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Real-time job costing, scheduling, and field operations — built
              for residential and commercial contractors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" asChild>
                <Link to="/auth?tab=signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-construction-dark"
                asChild
              >
                <a href="/#pricing">
                  View Pricing
                </a>
              </Button>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <SmartLogo
                size="md"
                priority="local"
                className="mb-4"
                textClassName="text-white"
              />
              <p className="text-white/80 mb-6">
                Construction management software built specifically for growing
                SMB contractors.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-white/80">
                  <Mail className="h-4 w-4" />
                  support@brikly.net
                </div>
                {/* Physical mailing address. Rendered only when a real one is
                    configured in src/config/companyContact.ts - the previous
                    hardcoded value was placeholder text, and a fabricated
                    address defeats the CAN-SPAM and privacy-law purpose it was
                    supposed to serve. */}
                {hasPostalAddress() && (
                  <address className="not-italic flex items-start gap-2 text-white/80">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {CONTACT.legalName}
                      {postalAddressLines().map((line) => (
                        <span key={line}>
                          <br />
                          {line}
                        </span>
                      ))}
                    </span>
                  </address>
                )}
              </div>

              {/* Newsletter Signup */}
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 mt-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 text-sm px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-construction-orange"
                />
                <Button type="submit" variant="ghost" size="sm" className="text-white text-sm hover:bg-white/10">
                  Subscribe
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </form>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('mailto:') || link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        className="text-white/80 hover:text-construction-orange transition-colors"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-white/80 hover:text-construction-orange transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('/#') ? (
                      <a
                        href={link.href}
                        className="text-white/80 hover:text-construction-orange transition-colors"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-white/80 hover:text-construction-orange transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="font-semibold mb-4 text-white">Resources</h3>
              <ul className="space-y-2">
                {resourceLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-white/80 hover:text-construction-orange transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-semibold mb-4 text-white">Legal</h3>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-white/80 hover:text-construction-orange transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
                <li>
                  {/* Re-open the consent center so users can change cookie
                      preferences at any time — required by GDPR/ePrivacy and
                      U.S. state privacy laws. */}
                  <button
                    type="button"
                    onClick={reopenCookiePreferences}
                    className="text-white/80 hover:text-construction-orange transition-colors text-left"
                  >
                    Cookie Preferences
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-white/80 text-sm">
                © {new Date().getFullYear()} Brikly. All rights reserved. | <Link to="/privacy-policy" className="hover:text-construction-orange transition-colors">Privacy Policy</Link>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="LinkedIn">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="Twitter">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-white/60 hover:text-white transition-colors" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
                {/*
                  Compliance posture badges. We label these as targets/in-progress
                  rather than completed certifications to avoid deceptive
                  marketing claims (FTC Act §5 / UDAAP). Update language only
                  when an external audit or certification has actually been
                  issued.
                */}
                <div className="flex items-center gap-6 text-sm text-white/80">
                  <span title="Targeting WCAG 2.1 Level AA conformance">WCAG 2.1 AA Target</span>
                  <span title="SOC 2 Type II audit in progress">SOC 2 In Progress</span>
                  <span title="Aligned with GDPR / UK GDPR / U.S. state privacy laws">Privacy Aligned</span>
                  <span title="Integrates with QuickBooks Online">QuickBooks Integration</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
