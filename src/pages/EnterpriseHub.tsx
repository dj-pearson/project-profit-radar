import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EnterpriseDashboard } from '@/components/enterprise/EnterpriseDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Shield, 
  Link, 
  Brain, 
  Smartphone, 
  DollarSign,
  Award,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const EnterpriseHub = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Predictive analytics, risk assessment, and cost forecasting',
      status: 'active',
      capabilities: [
        'Project risk prediction',
        'Cost overrun forecasting',
        'Quality defect detection',
        'Resource optimization'
      ]
    },
    {
      icon: Zap,
      title: 'Workflow Automation',
      description: 'Intelligent workflows that automate complex business processes',
      status: 'active',
      capabilities: [
        'Budget alert automation',
        'Invoice generation',
        'Safety incident response',
        'Compliance monitoring'
      ]
    },
    {
      icon: Shield,
      title: 'Compliance Management',
      description: 'Automated regulatory and safety compliance monitoring',
      status: 'active',
      capabilities: [
        'OSHA compliance tracking',
        'Permit management',
        'Safety training monitoring',
        'Automated reporting'
      ]
    },
    {
      icon: Link,
      title: 'Integration Ecosystem',
      description: 'Seamless connections to enterprise tools and services',
      status: 'active',
      capabilities: [
        'QuickBooks integration',
        'Microsoft 365 sync',
        'Box cloud storage',
        'Procore connectivity'
      ]
    },
    {
      icon: Smartphone,
      title: 'Advanced Mobile',
      description: 'Voice commands, photo analysis, and offline capabilities',
      status: 'active',
      capabilities: [
        'Voice-to-action commands',
        'AI photo analysis',
        'Offline data sync',
        'GPS automation'
      ]
    },
    {
      icon: DollarSign,
      title: 'Financial Intelligence',
      description: 'Predictive financial analytics and cash flow forecasting',
      status: 'active',
      capabilities: [
        '12-month cash flow forecast',
        'Financial risk assessment',
        'Profitability analysis',
        'Budget optimization'
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'beta': return 'warning';
      case 'coming_soon': return 'default';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout title="Enterprise Hub">
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8 px-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
          <div className="flex items-center justify-center mb-4">
            <Award className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold">Enterprise Command Center</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Advanced AI-powered construction management with enterprise-grade automation, 
            compliance, and integration capabilities
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="success" className="text-sm px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              Production Ready
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              SOC 2 Compliant
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Enterprise Scale
            </Badge>
          </div>
        </div>

        {/* Enterprise Dashboard */}
        <EnterpriseDashboard />

        {/* Feature Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Enterprise Features</h2>
            <Button variant="outline">
              View All Features
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <feature.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge variant={getStatusColor(feature.status)} className="mt-1">
                          {feature.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Key Capabilities:</h4>
                    <ul className="space-y-1">
                      {feature.capabilities.map((capability, capIndex) => (
                        <li key={capIndex} className="flex items-center text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    disabled={feature.status === 'coming_soon'}
                  >
                    {feature.status === 'coming_soon' ? 'Coming Soon' : 'Configure'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>
              Real-time metrics showing the impact of enterprise features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">60%</div>
                <div className="text-sm text-muted-foreground">Faster Load Times</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">94%</div>
                <div className="text-sm text-muted-foreground">Automation Success</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">89%</div>
                <div className="text-sm text-muted-foreground">Compliance Rate</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">98%</div>
                <div className="text-sm text-muted-foreground">Integration Uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EnterpriseHub;
