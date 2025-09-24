import React from 'react';
import { SEOMetaTags } from '../../components/SEOMetaTags';
import { BreadcrumbsNavigation } from '../../components/BreadcrumbsNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Smartphone, Wifi, Camera, MapPin, Clock, Shield, Download, Star } from 'lucide-react';

const ConstructionMobileAppGuide = () => {
  const features = [
    {
      icon: <Camera className="h-6 w-6 text-primary" />,
      title: "Photo Documentation",
      description: "Capture progress photos with automatic project association and GPS tagging"
    },
    {
      icon: <Wifi className="h-6 w-6 text-primary" />,
      title: "Offline Functionality",
      description: "Work without internet connection - data syncs automatically when back online"
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Time Tracking",
      description: "Clock in/out with GPS verification and automatic project code assignment"
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary" />,
      title: "GPS Integration",
      description: "Location tracking for crew accountability and travel time documentation"
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Safety Reporting",
      description: "Submit incident reports and safety observations directly from the field"
    },
    {
      icon: <Star className="h-6 w-6 text-primary" />,
      title: "Quality Control",
      description: "Complete inspection checklists with pass/fail criteria and photo evidence"
    }
  ];

  const benefits = [
    "Reduce administrative time by 75%",
    "Improve project visibility and communication",
    "Ensure accurate time and material tracking",
    "Enhance safety compliance and documentation", 
    "Enable real-time project updates",
    "Eliminate paperwork and manual data entry"
  ];

  const industries = [
    {
      name: "Residential Construction",
      features: ["Daily progress photos", "Client communication", "Change order approvals"]
    },
    {
      name: "Commercial Construction", 
      features: ["Multi-trade coordination", "Safety compliance", "Quality inspections"]
    },
    {
      name: "Specialty Trades",
      features: ["Service call management", "Material tracking", "Customer signatures"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Best Construction Mobile Apps 2025 | Field Management Software"
        description="Discover the top construction mobile apps for field teams. Compare features, pricing, and benefits of leading construction management mobile solutions."
        keywords={[
          'construction mobile app',
          'field management software',
          'construction app offline',
          'mobile construction management',
          'construction field app',
          'building app for contractors',
          'construction project app',
          'mobile construction tools'
        ]}
        canonicalUrl="https://builddesk.com/resources/construction-mobile-app-guide"
      />

      <div className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">Mobile Apps</Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Best Construction Mobile Apps for Field Teams in 2025
            </h1>
            <p className="text-xl text-muted-foreground">
              Transform your field operations with mobile construction management apps. 
              Compare features, benefits, and find the perfect solution for your team.
            </p>
          </div>

          {/* Hero Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">75%</div>
                <p className="text-muted-foreground">Reduction in admin time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">60%</div>
                <p className="text-muted-foreground">Faster project updates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">90%</div>
                <p className="text-muted-foreground">Improved accuracy</p>
              </CardContent>
            </Card>
          </div>

          {/* Key Features */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Essential Mobile App Features for Construction</CardTitle>
              <CardDescription>
                What to look for in a construction mobile app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    {feature.icon}
                    <div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BuildDesk Mobile Features */}
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Smartphone className="h-6 w-6 text-primary" />
                <CardTitle>BuildDesk Mobile App</CardTitle>
              </div>
              <CardDescription>
                Complete field management solution with offline capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Key Benefits</h3>
                  <ul className="space-y-2">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Download Options</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-3 rounded-lg">
                      <Download className="h-5 w-5" />
                      <span>Download for iOS</span>
                    </button>
                    <button className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-3 rounded-lg">
                      <Download className="h-5 w-5" />
                      <span>Download for Android</span>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry Applications */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Mobile Apps by Construction Industry</CardTitle>
              <CardDescription>
                Specialized features for different types of construction work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {industries.map((industry, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-3">{industry.name}</h3>
                    <ul className="space-y-2">
                      {industry.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Mobilize Your Construction Team?</CardTitle>
              <CardDescription>
                See how BuildDesk's mobile app can transform your field operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold">
                  Start Free Trial
                </button>
                <button className="flex-1 border border-border hover:bg-accent text-foreground px-6 py-3 rounded-lg font-semibold">
                  Schedule Demo
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConstructionMobileAppGuide;