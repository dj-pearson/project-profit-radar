import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, DollarSign, BarChart3, AlertTriangle, Clock, ArrowRight } from "lucide-react";

const JobCostingSoftware = () => {
  const features = [
    {
      icon: DollarSign,
      title: "Real-Time Cost Tracking",
      description: "Monitor labor, materials, and equipment costs as they happen with live budget vs. actual comparisons."
    },
    {
      icon: BarChart3,
      title: "Profitability Analysis",
      description: "Identify your most profitable project types and optimize pricing strategies with detailed cost analytics."
    },
    {
      icon: AlertTriangle,
      title: "Budget Variance Alerts",
      description: "Get instant notifications when projects exceed budget thresholds to take corrective action quickly."
    },
    {
      icon: Clock,
      title: "Time & Material Integration",
      description: "Seamlessly integrate time tracking and material purchases into comprehensive job cost reports."
    }
  ];

  return (
    <>
      <SEOMetaTags
        title="Job Costing Software for Construction - Real-Time Cost Tracking | BuildDesk"
        description="Advanced job costing software for construction contractors. Real-time cost tracking, profitability analysis, budget alerts, and comprehensive reporting. 14-day free trial."
        keywords={['job costing software', 'construction job costing', 'project cost tracking', 'construction profitability', 'budget tracking software', 'construction cost management']}
        canonicalUrl="/job-costing-software"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                Job Costing Software for Construction
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Take control of your project profitability with real-time job costing, budget tracking, 
                and variance alerts that help you stay profitable on every project.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="bg-construction-blue hover:bg-construction-blue/90">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/roi-calculator">
                  <Button size="lg" variant="outline">
                    Calculate ROI
                  </Button>
                </Link>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {features.map((feature, index) => (
                <Card key={index} className="border-construction-blue/20 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-construction-blue/10 rounded-lg">
                        <feature.icon className="h-6 w-6 text-construction-blue" />
                      </div>
                      <CardTitle className="text-construction-dark">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg border p-8 mb-16">
              <h2 className="text-3xl font-bold text-construction-dark mb-8 text-center">
                Increase Project Profitability by 23%
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Prevent Cost Overruns</h3>
                  <p className="text-sm text-muted-foreground">
                    Catch budget variances early with real-time alerts and take corrective action before it's too late.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Accurate Bidding</h3>
                  <p className="text-sm text-muted-foreground">
                    Use historical job cost data to create more accurate bids and win more profitable projects.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Data-Driven Decisions</h3>
                  <p className="text-sm text-muted-foreground">
                    Make informed business decisions with comprehensive cost analysis and profitability reports.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Start Tracking Job Costs Like a Pro
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join contractors who have increased their project margins by 23% with better job cost tracking.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default JobCostingSoftware;
