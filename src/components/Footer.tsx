import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import SmartLogo from "@/components/ui/smart-logo";

const Footer = () => {
  const companyLinks = [
    { name: "Solutions", href: "/solutions" },
    { name: "FAQ", href: "/faq" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "mailto:support@build-desk.com" },
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
    { name: "Security", href: "/security-settings" },
    { name: "GDPR", href: "/gdpr-compliance" },
  ];

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
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join 500+ contractors who've increased their profit margins by 23%
              in the first year
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
                  support@build-desk.com
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-4 w-4" />
                  West Des Moines, IA
                </div>
              </div>
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
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-white/80 text-sm">
                © 2025 Build Desk. All rights reserved. | <Link to="/privacy-policy" className="hover:text-construction-orange transition-colors">Privacy Policy</Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-white/80">
                <span>SOC 2 Certified</span>
                <span>GDPR Compliant</span>
                <span>QuickBooks Certified</span>
              </div>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
