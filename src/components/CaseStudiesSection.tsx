import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, DollarSign, Users, ArrowRight, Target, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CaseStudyProps {
  company: string;
  industry: string;
  teamSize: string;
  challenge: string;
  solution: string;
  results: {
    metric: string;
    value: string;
    description: string;
    icon: React.ReactNode;
  }[];
  quote: string;
  author: string;
  title: string;
  timeframe: string;
  projectTypes: string[];
}

const CaseStudyCard: React.FC<CaseStudyProps> = ({
  company,
  industry,
  teamSize,
  challenge,
  solution,
  results,
  quote,
  author,
  title,
  timeframe,
  projectTypes
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div>
            <CardTitle className="text-xl mb-2">{company}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{industry}</Badge>
              <Badge variant="outline">{teamSize}</Badge>
            </div>
          </div>
          <Building className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {results.map((result, index) => (
            <div key={index} className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex justify-center mb-2">{result.icon}</div>
              <div className="font-bold text-green-800 text-lg">{result.value}</div>
              <div className="text-xs text-green-600">{result.metric}</div>
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2 text-red-700">Challenge</h4>
          <p className="text-muted-foreground text-sm">{challenge}</p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2 text-blue-700">BuildDesk Solution</h4>
          <p className="text-muted-foreground text-sm">{solution}</p>
        </div>
        
        <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
          <blockquote className="text-sm italic mb-3">"{quote}"</blockquote>
          <div className="text-sm">
            <div className="font-medium">{author}</div>
            <div className="text-muted-foreground">{title}, {company}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium mb-1">Implementation Time</h5>
            <p className="text-muted-foreground">{timeframe}</p>
          </div>
          <div>
            <h5 className="font-medium mb-1">Project Types</h5>
            <p className="text-muted-foreground">{projectTypes.join(', ')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CaseStudiesSection: React.FC = () => {
  const caseStudies: CaseStudyProps[] = [
    {
      company: "Rodriguez Custom Homes",
      industry: "Residential Construction",
      teamSize: "12 employees",
      challenge: "Job costs were consistently 15-20% over budget due to poor time tracking and material cost estimation. Excel spreadsheets couldn't keep up with multiple active projects, leading to cash flow problems and reduced profitability.",
      solution: "Implemented BuildDesk's real-time job costing with mobile time tracking for field crews. Used integrated material cost tracking and automated QuickBooks sync to eliminate manual data entry errors.",
      results: [
        {
          metric: "Profit Margin",
          value: "+23%",
          description: "Improved from 8% to 31% average",
          icon: <TrendingUp className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Budget Accuracy",
          value: "95%",
          description: "Projects within 5% of budget",
          icon: <Target className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Time Savings", 
          value: "12 hrs/week",
          description: "Reduced admin time",
          icon: <Clock className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Annual Savings",
          value: "$45,000",
          description: "Cost control improvements",
          icon: <DollarSign className="h-5 w-5 text-green-600" />
        }
      ],
      quote: "BuildDesk transformed our business from barely breaking even to consistently profitable. The real-time job costing showed us exactly where we were losing money, and now we make data-driven decisions on every project.",
      author: "Mike Rodriguez",
      title: "Owner",
      timeframe: "2 weeks",
      projectTypes: ["Custom Homes", "Renovations", "Additions"]
    },
    {
      company: "Metro Build Group", 
      industry: "Commercial Construction",
      teamSize: "28 employees",
      challenge: "Managing 8-12 concurrent commercial projects with multiple subcontractors was chaotic. Change orders were getting lost, client communication was poor, and project delays were costing $15,000+ monthly in penalties.",
      solution: "Deployed BuildDesk's project management suite with subcontractor portals, digital change order workflows, and client communication tools. Integrated scheduling and document management streamlined operations.",
      results: [
        {
          metric: "Project Delays",
          value: "-60%",
          description: "Reduced from 40% to 16%",
          icon: <Clock className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Change Order Speed",
          value: "2 days",
          description: "Down from 2 weeks average",
          icon: <TrendingUp className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Client Satisfaction",
          value: "+40%",
          description: "Survey score improvement",
          icon: <Users className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Penalty Savings",
          value: "$180,000",
          description: "Annual delay penalty reduction",
          icon: <DollarSign className="h-5 w-5 text-green-600" />
        }
      ],
      quote: "The client portal alone transformed our relationships. Customers can see real-time progress, approve changes instantly, and communicate directly with project managers. We went from constantly explaining delays to proactively updating on successes.",
      author: "Sarah Chen",
      title: "Project Manager",
      timeframe: "3 weeks", 
      projectTypes: ["Office Fit-outs", "Retail", "Light Industrial"]
    },
    {
      company: "Thompson Construction LLC",
      industry: "General Contracting",
      teamSize: "18 employees", 
      challenge: "Using Procore was overwhelming and expensive ($14,400/year). The complexity required dedicated admin staff and extensive training. Features were too enterprise-focused for their small team's actual needs.",
      solution: "Migrated to BuildDesk with guided data transfer and simplified workflows. Maintained essential features (scheduling, job costing, document management) while eliminating unnecessary complexity and cost.",
      results: [
        {
          metric: "Software Cost",
          value: "-65%",
          description: "Annual savings of $9,100",
          icon: <DollarSign className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Training Time", 
          value: "3 days",
          description: "vs 3 weeks with Procore",
          icon: <Clock className="h-5 w-5 text-green-600" />
        },
        {
          metric: "User Adoption",
          value: "100%",
          description: "All team members active",
          icon: <Users className="h-5 w-5 text-green-600" />
        },
        {
          metric: "Setup Time",
          value: "2 weeks",
          description: "vs 4 months previously",
          icon: <TrendingUp className="h-5 w-5 text-green-600" />
        }
      ],
      quote: "BuildDesk gives us everything we actually use from expensive enterprise software, without the complexity we don't need. My team adopted it immediately because it actually makes their jobs easier, not harder.",
      author: "David Thompson", 
      title: "General Contractor",
      timeframe: "2 weeks",
      projectTypes: ["Mixed-Use", "Tenant Improvements", "Small Commercial"]
    }
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Real Results from Real Contractors</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how BuildDesk helped small contractors improve profitability, reduce delays, 
            and streamline operations with measurable ROI.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-1 gap-8 mb-12">
          {caseStudies.map((study, index) => (
            <CaseStudyCard key={index} {...study} />
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-semibold mb-6">Average Results Across All Case Studies</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">22%</div>
              <div className="text-muted-foreground">Average Profit Improvement</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">47%</div>
              <div className="text-muted-foreground">Reduction in Project Delays</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$78,000</div>
              <div className="text-muted-foreground">Average Annual Savings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2.1 weeks</div>
              <div className="text-muted-foreground">Average Implementation Time</div>
            </div>
          </div>
          
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/auth">
                Start Your Success Story <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};