import React from 'react';
import { Link } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { 
  Calendar,
  Calculator,
  Clock,
  DollarSign,
  FileText,
  BarChart3,
  Users,
  ArrowRight,
  Wrench,
  Target,
  CheckCircle
} from 'lucide-react';

const Tools = () => {
  const tools = [
    {
      id: 'schedule-builder',
      title: 'Construction Schedule Builder',
      description: 'Create professional project timelines with drag-and-drop simplicity. Choose from 6 project templates and export professional PDFs.',
      icon: Calendar,
      href: '/tools/schedule-builder',
      features: ['6 Project Templates', 'Drag-and-Drop Timeline', 'Critical Path Analysis', 'PDF Export'],
      badge: 'New',
      available: true
    },
    {
      id: 'profit-calculator',
      title: 'Project Profit Calculator',
      description: 'Calculate project profitability, analyze cost breakdowns, and optimize pricing strategies for better margins.',
      icon: Calculator,
      href: '/tools/profit-calculator',
      features: ['Profit Margin Analysis', 'Cost Breakdown', 'Pricing Optimization', 'ROI Calculations'],
      badge: null,
      available: true
    },
    {
      id: 'bid-estimator',
      title: 'Construction Bid Estimator',
      description: 'Generate accurate project estimates with material costs, labor rates, and markup calculations.',
      icon: FileText,
      href: '/tools/bid-estimator',
      features: ['Material Cost Database', 'Labor Rate Calculator', 'Markup Analysis', 'Professional Proposals'],
      badge: 'Coming Soon',
      available: false
    },
    {
      id: 'crew-calculator',
      title: 'Crew Size Calculator',
      description: 'Determine optimal crew sizes for different project types and phases to maximize efficiency.',
      icon: Users,
      href: '/tools/crew-calculator',
      features: ['Efficiency Analysis', 'Phase-Based Calculations', 'Cost Optimization', 'Resource Planning'],
      badge: 'Coming Soon',
      available: false
    }
  ];

  const benefits = [
    {
      icon: Target,
      title: 'Save Time',
      description: 'Stop spending hours on manual calculations and planning'
    },
    {
      icon: DollarSign,
      title: 'Increase Profits',
      description: 'Make data-driven decisions that improve your bottom line'
    },
    {
      icon: CheckCircle,
      title: 'Professional Results',
      description: 'Impress clients with professional-quality deliverables'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Free Construction Tools | Schedule Builder & Profit Calculator | Build-Desk"
        description="Access free construction management tools including project schedule builder, profit calculator, and bid estimator. Professional tools for contractors and project managers."
        keywords={[
          'free construction tools',
          'construction schedule builder',
          'profit calculator construction',
          'construction bid estimator',
          'project management tools',
          'construction planning tools',
          'contractor tools',
          'construction calculator'
        ]}
        canonicalUrl="/tools"
      />
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <Header />
      
      <main id="main-content">
        {/* Hero Section */}
        <section className="py-12 lg:py-20 bg-gradient-to-b from-construction-light to-background">
          <ResponsiveContainer>
            <div className="text-center max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-6">
                <Wrench className="h-12 w-12 text-construction-orange mr-4" />
                <h1 className="text-4xl lg:text-6xl font-bold text-construction-dark">
                  Free Construction Tools
                </h1>
              </div>
              <p className="text-xl lg:text-2xl text-construction-dark/80 mb-8 leading-relaxed">
                Professional-grade construction tools that help you plan, calculate, and optimize your projects—completely free.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-construction-dark/70">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>No signup required</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Instant results</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span>Professional outputs</span>
                </div>
              </div>
            </div>
          </ResponsiveContainer>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-background">
          <ResponsiveContainer>
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-construction-orange/10 rounded-full mb-4">
                    <benefit.icon className="h-8 w-8 text-construction-orange" />
                  </div>
                  <h3 className="text-xl font-bold text-construction-dark mb-2">{benefit.title}</h3>
                  <p className="text-construction-dark/70">{benefit.description}</p>
                </div>
              ))}
            </div>
          </ResponsiveContainer>
        </section>

        {/* Tools Grid */}
        <section className="py-16 bg-muted/30">
          <ResponsiveContainer>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-construction-dark mb-4">
                Choose Your Tool
              </h2>
              <p className="text-lg text-construction-dark/70 max-w-2xl mx-auto">
                Each tool is designed to solve specific construction challenges with professional results.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card key={tool.id} className={`relative overflow-hidden transition-all duration-300 ${
                    tool.available ? 'hover:shadow-lg hover:scale-[1.02]' : 'opacity-75'
                  }`}>
                    {tool.badge && (
                      <Badge 
                        variant={tool.badge === 'New' ? 'default' : 'secondary'} 
                        className="absolute top-4 right-4 z-10"
                      >
                        {tool.badge}
                      </Badge>
                    )}
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-center mb-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-construction-orange/10 rounded-lg mr-4">
                          <IconComponent className="h-6 w-6 text-construction-orange" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-construction-dark">{tool.title}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-base leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="mb-6">
                        <h4 className="font-semibold text-construction-dark mb-3">Features:</h4>
                        <ul className="grid grid-cols-2 gap-2">
                          {tool.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-construction-dark/70">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {tool.available ? (
                        <Button asChild className="w-full" size="lg">
                          <Link to={tool.href} className="inline-flex items-center">
                            Launch Tool
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled className="w-full" size="lg">
                          Coming Soon
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ResponsiveContainer>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-construction-orange">
          <ResponsiveContainer>
            <div className="text-center text-white">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready for More Advanced Features?
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                These free tools are just the beginning. Build-Desk offers comprehensive construction management 
                with advanced scheduling, cost tracking, and team collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" asChild>
                  <Link to="/auth">
                    Start Free Trial
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-construction-orange" asChild>
                  <Link to="/#features">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </ResponsiveContainer>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Tools; 