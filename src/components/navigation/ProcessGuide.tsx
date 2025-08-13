import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle,
  Target,
  Building2,
  FileText
} from 'lucide-react';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  action: string;
  url?: string;
  completed?: boolean;
}

interface ProcessGuideProps {
  onClose?: () => void;
}

export const ProcessGuide: React.FC<ProcessGuideProps> = ({ onClose }) => {
  const location = useLocation();
  const [currentProcess, setCurrentProcess] = useState<ProcessStep[] | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const processGuides = {
    '/crm/opportunities': {
      title: 'Sales Process Guide',
      icon: Target,
      steps: [
        {
          id: 'qualify',
          title: 'Qualify Opportunity',
          description: 'Verify budget, timeline, and decision-making process',
          action: 'Update opportunity stage to "Qualification"',
          completed: false
        },
        {
          id: 'proposal',
          title: 'Create Proposal',
          description: 'Generate detailed estimate and project proposal',
          action: 'Click "Create Estimate" button',
          url: '/estimates',
          completed: false
        },
        {
          id: 'negotiate',
          title: 'Negotiate Terms',
          description: 'Work through contract details and pricing',
          action: 'Update stage to "Negotiation"',
          completed: false
        },
        {
          id: 'close',
          title: 'Close Deal',
          description: 'Win the project and convert to active project',
          action: 'Click "Convert to Project" when won',
          completed: false
        }
      ]
    },
    '/create-project': {
      title: 'Project Creation Guide',
      icon: Building2,
      steps: [
        {
          id: 'basic',
          title: 'Project Basics',
          description: 'Enter project name, type, and client information',
          action: 'Fill out project information form',
          completed: false
        },
        {
          id: 'timeline',
          title: 'Set Timeline',
          description: 'Define start date, end date, and key milestones',
          action: 'Configure project schedule',
          completed: false
        },
        {
          id: 'budget',
          title: 'Budget Setup',
          description: 'Set project budget and cost tracking parameters',
          action: 'Enter budget and estimated hours',
          completed: false
        },
        {
          id: 'team',
          title: 'Assign Team',
          description: 'Select project manager and key team members',
          action: 'Choose project manager',
          completed: false
        }
      ]
    }
  };

  useEffect(() => {
    const guide = processGuides[location.pathname as keyof typeof processGuides];
    if (guide) {
      setCurrentProcess(guide.steps);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [location.pathname]);

  if (!isVisible || !currentProcess) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const currentGuide = processGuides[location.pathname as keyof typeof processGuides];
  const IconComponent = currentGuide.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IconComponent className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">{currentGuide.title}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Follow these steps for best results
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {currentProcess.map((step, index) => (
              <div 
                key={step.id}
                className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mb-1">{step.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {step.action}
                  </Badge>
                </div>
                {step.url && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};