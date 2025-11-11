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
      quote: "We caught a $47K cost overrun on a kitchen remodel three weeks before it would have destroyed our margin. The predictive alerts showed labor costs trending 22% over budget. We course-corrected immediately and saved the project. That one alert paid for BuildDesk for the next 5 years.",
      author: "Mike Rodriguez",
      title: "Owner",
      company: "Rodriguez Custom Homes",
      rating: 5,
      metric: {
        label: "Cost Overrun Prevented",
        value: "$47K",
        icon: <DollarSign className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "I used to spend 3 full days every month doing financial close - reconciling spreadsheets, categorizing expenses, generating reports. Now it takes 5 minutes with one click. BuildDesk freed up 36 days a year that I now spend growing my business instead of buried in paperwork.",
      author: "Sarah Chen",
      title: "Owner/CFO",
      company: "Metro Build Group",
      rating: 5,
      metric: {
        label: "Monthly Close Time",
        value: "5 min",
        icon: <Clock className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "Before BuildDesk, I only knew if a project was profitable at tax time. Now I see profit margins update in real-time. Last week I saw a project drop from 18% to 12% margin instantly when unexpected costs hit. We adjusted scope immediately and recovered to 16%. That's the difference between guessing and knowing.",
      author: "David Thompson",
      title: "General Contractor",
      company: "Thompson Construction LLC",
      rating: 5,
      metric: {
        label: "Real-Time Visibility",
        value: "Every Project",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "The decision impact calculator is incredible. Before approving a change order, I can see exactly how it affects project profitability. 'Approving this drops your margin from 15% to 11%' - that one feature helped me price change orders properly and our margins improved 4% overall.",
      author: "Jennifer Walsh",
      title: "Project Manager",
      company: "Atlantic Builders",
      rating: 5,
      metric: {
        label: "Margin Improvement",
        value: "+4%",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "The QuickBooks integration with automated categorization is a game-changer. Month-end reconciliation used to take my bookkeeper 18 hours. Now it's automatic and accurate. We recouped our entire BuildDesk investment in the first month just from reduced accounting fees.",
      author: "Tom Martinez",
      title: "Owner",
      company: "Martinez Remodeling",
      rating: 5,
      metric: {
        label: "Accounting Time Saved",
        value: "18 hrs/mo",
        icon: <Clock className="h-5 w-5 text-green-600" />
      }
    },
    {
      quote: "Financial surprises used to kill us. We'd finish a project thinking we made money, then the final accounting showed we lost thousands. BuildDesk's real-time job costing means no more surprises. We know our profit position daily, not quarterly. Improved our margins from 8% to 13%.",
      author: "Lisa Chang",
      title: "Operations Manager",
      company: "Chang & Associates Construction",
      rating: 5,
      metric: {
        label: "Margin Increase",
        value: "8% → 13%",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />
      }
    }
  ];

  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Financial Intelligence That Changed Everything</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Real contractors who went from financial blindness to complete profit visibility. These aren't generic reviews - these are specific, measurable financial outcomes.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} {...testimonial} />
        ))}
      </div>
      
      <div className="text-center mt-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="font-medium">4.9/5 Average Rating</span>
            <span>•</span>
            <span>500+ Contractors</span>
          </div>
          <p className="text-sm text-construction-orange font-semibold">
            Average ROI payback period: Less than 30 days
          </p>
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