import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface TestimonialProps {
  quote: string;
  author: string;
  title: string;
  company: string;
  rating: number;
  metric?: {
    label: string;
    value: string;
    icon: React.ReactNode;
  };
  verified?: boolean;
}

export const TestimonialCard: React.FC<TestimonialProps> = ({
  quote,
  author,
  title,
  company,
  rating,
  metric,
  verified = true
}) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
              />
            ))}
            {verified && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Verified User
              </Badge>
            )}
          </div>
          <Quote className="h-6 w-6 text-muted-foreground opacity-50" />
        </div>
        
        {metric && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mb-4">
            {metric.icon}
            <div>
              <div className="font-semibold text-green-800">{metric.value}</div>
              <div className="text-sm text-green-600">{metric.label}</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <blockquote className="text-muted-foreground mb-4 leading-relaxed">
          "{quote}"
        </blockquote>
        
        <div className="border-t pt-4">
          <div className="font-medium">{author}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-sm text-muted-foreground font-medium">{company}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TestimonialsSection: React.FC = () => {
  const testimonials: TestimonialProps[] = [
    {
      quote: "BuildDesk transformed our job costing accuracy. We used to estimate projects by gut feeling and constantly went over budget. Now we track every hour and material cost in real-time. Our profit margins improved 23% in the first year.",
      author: "Mike Rodriguez",
      title: "Owner",
      company: "Rodriguez Custom Homes",
      rating: 5,
      metric: {
        label: "Profit Margin Improvement",
        value: "+23%",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "The mobile app is a game changer. My crews can log time, take photos, and update job progress even when cell service is spotty. No more end-of-week guessing about where we spent our time. Client communication improved dramatically too.",
      author: "Sarah Chen",
      title: "Project Manager", 
      company: "Metro Build Group",
      rating: 5,
      metric: {
        label: "Time Tracking Accuracy",
        value: "95%+",
        icon: <Clock className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "We switched from Procore and immediately saved $8,400 annually on software costs alone. BuildDesk has all the features we actually use, without the enterprise complexity we don't need. Setup took 2 weeks instead of 3 months.",
      author: "David Thompson",
      title: "General Contractor",
      company: "Thompson Construction LLC",
      rating: 5, 
      metric: {
        label: "Annual Savings",
        value: "$8,400",
        icon: <DollarSign className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "OSHA compliance used to be a nightmare of paperwork and missed forms. BuildDesk's safety module keeps us compliant automatically. Digital safety meetings, incident tracking, and automated reminders have eliminated violations.",
      author: "Jennifer Walsh",
      title: "Safety Coordinator",
      company: "Atlantic Builders",
      rating: 5,
      metric: {
        label: "OSHA Violations",
        value: "Zero",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "The QuickBooks integration is seamless. Job costs, invoices, and payments sync automatically. No more double data entry or reconciliation headaches. Our bookkeeper loves how clean the financial data is now.",
      author: "Tom Martinez",
      title: "Owner",
      company: "Martinez Remodeling",
      rating: 5,
      metric: {
        label: "Data Entry Reduction", 
        value: "80%",
        icon: <Clock className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "Client communication went from chaotic to professional overnight. The homeowner portal lets clients see progress photos, approve change orders, and track project timeline. We've had zero payment disputes since implementing BuildDesk.",
      author: "Lisa Chang",
      title: "Operations Manager",
      company: "Chang & Associates Construction",
      rating: 5,
      metric: {
        label: "Payment Disputes",
        value: "Zero",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    }
  ];

  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">What Contractors Say About BuildDesk</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Real feedback from construction professionals who transformed their business operations with BuildDesk.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} {...testimonial} />
        ))}
      </div>
      
      <div className="text-center mt-8">
        <div className="flex items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
            ))}
          </div>
          <span className="font-medium">4.8/5 Average Rating</span>
          <span>•</span>
          <span>247+ Reviews</span>
        </div>
      </div>
    </section>
  );
};

interface ClientLogoProps {
  name: string;
  logo: string;
  industry: string;
}

export const ClientLogosSection: React.FC = () => {
  const clients: ClientLogoProps[] = [
    { name: "ABC Custom Homes", logo: "/logos/abc-homes.png", industry: "Residential" },
    { name: "Metro Build Group", logo: "/logos/metro-build.png", industry: "Commercial" },
    { name: "Rodriguez Construction", logo: "/logos/rodriguez.png", industry: "General Contractor" },
    { name: "Atlantic Builders", logo: "/logos/atlantic.png", industry: "Multi-Family" },
    { name: "Thompson Construction", logo: "/logos/thompson.png", industry: "Remodeling" },
    { name: "Chang & Associates", logo: "/logos/chang.png", industry: "Commercial" }
  ];

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold mb-2">Trusted by 300+ Contractors</h3>
          <p className="text-muted-foreground">From small residential builders to mid-size commercial contractors</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-60">
          {clients.map((client, index) => (
            <div key={index} className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-2 h-16 flex items-center justify-center">
                <span className="font-semibold text-sm text-gray-600">{client.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{client.industry}</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};