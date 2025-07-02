import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const companyLinks = [
    { name: "About Us", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Press", href: "#" },
    { name: "Contact", href: "#" }
  ];

  const productLinks = [
    { name: "Features", href: "#" },
    { name: "Pricing", href: "#" },
    { name: "Integrations", href: "#" },
    { name: "API", href: "#" }
  ];

  const resourceLinks = [
    { name: "Help Center", href: "#" },
    { name: "Webinars", href: "#" },
    { name: "Case Studies", href: "#" },
    { name: "Blog", href: "#" }
  ];

  const legalLinks = [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Security", href: "#" },
    { name: "GDPR", href: "#" }
  ];

  return (
    <footer className="bg-construction-dark text-white">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-16">
          {/* Top Section - CTA */}
          <div className="text-center mb-16 pb-16 border-b border-white/20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Transform Your Construction Business?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join 500+ contractors who've increased their profit margins by 23% in the first year
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-construction-dark">
                Schedule Demo
              </Button>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="text-2xl font-bold mb-4">
                Build<span className="text-construction-orange">Track</span>
              </div>
              <p className="text-white/70 mb-6">
                Construction management software built specifically for growing SMB contractors.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Phone className="h-4 w-4" />
                  (555) 123-4567
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Mail className="h-4 w-4" />
                  hello@buildtrack.com
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <MapPin className="h-4 w-4" />
                  Austin, TX
                </div>
              </div>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-white/70 hover:text-construction-orange transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                {productLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-white/70 hover:text-construction-orange transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                {resourceLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-white/70 hover:text-construction-orange transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-white/70 hover:text-construction-orange transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-white/70 text-sm">
              © 2024 BuildTrack. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-white/70">
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