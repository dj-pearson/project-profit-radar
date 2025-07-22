import React from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import SmartLogo from '@/components/ui/smart-logo';
import { 
  Calendar, 
  Calculator, 
  FileText, 
  Users, 
  Mail, 
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';

const ToolsFooter = () => {
  const toolLinks = [
    { name: 'Schedule Builder', href: '/tools/schedule-builder', icon: Calendar },
    { name: 'ROI Calculator', href: '/roi-calculator', icon: Calculator },
    { name: 'All Tools', href: '/tools', icon: FileText }
  ];

  const resourceLinks = [
    { name: 'Construction Resources', href: '/resources' },
    { name: 'Blog Articles', href: '/resources' },
    { name: 'Industry Guides', href: '/resources' },
    { name: 'Best Practices', href: '/resources' }
  ];

  const companyLinks = [
    { name: 'About Build-Desk', href: '/#features' },
    { name: 'All Features', href: '/#features' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'Contact Us', href: '/#contact' }
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-of-service' },
    { name: 'Support', href: '/support' }
  ];

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="py-12">
        <ResponsiveContainer>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand & Description */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <SmartLogo size="md" linkTo="/" className="text-white" />
              </div>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Professional construction management tools and software designed to help contractors 
                plan, schedule, and manage projects more efficiently.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Nationwide Service</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>support@build-desk.com</span>
                </div>
              </div>
            </div>

            {/* Free Tools */}
            <div>
              <h3 className="font-semibold text-white mb-4">Free Construction Tools</h3>
              <ul className="space-y-3">
                {toolLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <li key={link.name}>
                      <Link 
                        to={link.href} 
                        className="text-gray-300 hover:text-construction-orange transition-colors flex items-center text-sm"
                      >
                        <IconComponent className="h-4 w-4 mr-2" />
                        {link.name}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <div className="text-gray-500 text-xs mt-2 italic">
                    More tools coming soon
                  </div>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-white mb-4">Construction Resources</h3>
              <ul className="space-y-3">
                {resourceLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.href} 
                      className="text-gray-300 hover:text-construction-orange transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Build-Desk Platform */}
            <div>
              <h3 className="font-semibold text-white mb-4">Build-Desk Platform</h3>
              <ul className="space-y-3 mb-6">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.href} 
                      className="text-gray-300 hover:text-construction-orange transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* CTA for Full Platform */}
              <div className="bg-construction-orange/10 border border-construction-orange/20 rounded-lg p-4">
                <h4 className="font-medium text-construction-orange mb-2 text-sm">
                  Need More Than Tools?
                </h4>
                <p className="text-gray-300 text-xs mb-3">
                  Get complete project management with real-time tracking, team collaboration, and automated reporting.
                </p>
                <Link 
                  to="/auth" 
                  className="inline-flex items-center text-construction-orange hover:text-white transition-colors text-sm font-medium"
                >
                  Try Build-Desk Free
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 py-6">
        <ResponsiveContainer>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Build-Desk. Professional construction management tools.
            </div>
            <div className="flex flex-wrap items-center space-x-6">
              {legalLinks.map((link) => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </ResponsiveContainer>
      </div>

      {/* SEO Keywords Footer Note */}
      <div className="bg-slate-950 py-4">
        <ResponsiveContainer>
          <div className="text-center text-gray-500 text-xs">
            <p>
              Construction scheduling software • Project timeline builder • Construction project management tools • 
              Gantt chart for construction • Critical path analysis • Construction planning software • 
              Free construction tools • Project scheduling templates • Construction bid estimator
            </p>
          </div>
        </ResponsiveContainer>
      </div>
    </footer>
  );
};

export default ToolsFooter; 