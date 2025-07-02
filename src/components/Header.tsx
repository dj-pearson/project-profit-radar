import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Industries", href: "#industries" },
    { name: "Resources", href: "#resources" }
  ];

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-construction-dark">
              Build<span className="text-construction-orange">Track</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-construction-dark hover:text-construction-orange transition-colors font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" className="text-construction-dark hover:text-construction-orange">
              Sign In
            </Button>
            <Button variant="hero" size="sm">
              Start Free Trial
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-construction-dark"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-construction-dark hover:text-construction-orange transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="ghost" className="text-construction-dark hover:text-construction-orange justify-start">
                  Sign In
                </Button>
                <Button variant="hero" size="sm">
                  Start Free Trial
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;