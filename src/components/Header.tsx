import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import SmartLogo from "@/components/ui/smart-logo";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useGlobalShortcuts();

  const navItems = [
    { name: "Features", href: "#features", isSection: true },
    { name: "Pricing", href: "#pricing", isSection: true },
    { name: "Industries", href: "#industries", isSection: true },
    { name: "Tools", href: "/tools", isSection: false },
    { name: "Resources", href: "/resources", isSection: false },
  ];

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <ResponsiveContainer>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <SmartLogo
            size="md"
            linkTo="/"
            className="transition-opacity hover:opacity-80"
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navItems.map((item) =>
              item.isSection ? (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-construction-dark hover:text-construction-orange transition-colors font-medium whitespace-nowrap"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-construction-dark hover:text-construction-orange transition-colors font-medium whitespace-nowrap"
                >
                  {item.name}
                </Link>
              )
            )}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 shrink-0">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-construction-dark hover:text-construction-orange hidden lg:flex"
              asChild
            >
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">
                <span className="hidden sm:inline">Start Free Trial</span>
                <span className="sm:hidden">Trial</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-construction-dark p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-accordion-down">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) =>
                item.isSection ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-construction-dark hover:text-construction-orange transition-colors font-medium py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-construction-dark hover:text-construction-orange transition-colors font-medium py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              )}
              <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="text-construction-dark hover:text-construction-orange justify-start"
                  asChild
                >
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    Start Free Trial
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </ResponsiveContainer>
    </header>
  );
};

export default Header;
