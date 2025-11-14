/**
 * Feature Tour
 * Interactive guided tour that highlights key features
 * Uses spotlights and tooltips to walk users through the app
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Optional action to perform when step is shown
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
}

interface FeatureTourProps {
  tour: Tour;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const FeatureTour: React.FC<FeatureTourProps> = ({
  tour,
  onComplete,
  onSkip
}) => {
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStep = tour.steps[currentStepIndex];
  const isLastStep = currentStepIndex === tour.steps.length - 1;

  useEffect(() => {
    if (isActive && currentStep.targetSelector) {
      const element = document.querySelector(currentStep.targetSelector) as HTMLElement;
      setTargetElement(element);

      if (element) {
        calculateTooltipPosition(element);
        // Execute step action if defined
        currentStep.action?.();
      }
    }

    return () => {
      setTargetElement(null);
    };
  }, [currentStepIndex, isActive, currentStep]);

  useEffect(() => {
    const handleResize = () => {
      if (targetElement) {
        calculateTooltipPosition(targetElement);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetElement]);

  const calculateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const position = currentStep.position || 'bottom';

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 150; // Tooltip height + margin
        left = rect.left + rect.width / 2 - 200; // Half tooltip width
        break;
      case 'bottom':
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2 - 200;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - 75; // Half tooltip height
        left = rect.left - 416; // Tooltip width + margin
        break;
      case 'right':
        top = rect.top + rect.height / 2 - 75;
        left = rect.right + 16;
        break;
    }

    // Keep tooltip within viewport
    const maxLeft = window.innerWidth - 416; // Tooltip width
    const maxTop = window.innerHeight - 200; // Approx tooltip height

    setTooltipPosition({
      top: Math.max(16, Math.min(top, maxTop)),
      left: Math.max(16, Math.min(left, maxLeft))
    });
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = async () => {
    setIsActive(false);
    await markTourAsSkipped();
    onSkip?.();
  };

  const handleComplete = async () => {
    setIsActive(false);
    await markTourAsCompleted();
    onComplete?.();
  };

  const markTourAsCompleted = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_tour_progress')
        .upsert({
          user_id: user.id,
          tour_id: tour.id,
          completed: true,
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  };

  const markTourAsSkipped = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_tour_progress')
        .upsert({
          user_id: user.id,
          tour_id: tour.id,
          skipped: true,
          skipped_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error marking tour as skipped:', error);
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />

      {/* Spotlight on target element */}
      {targetElement && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* Tooltip/Guide Card */}
      <div
        className="fixed z-50 w-96 animate-in fade-in slide-in-from-bottom-4"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transition: 'all 0.3s ease'
        }}
      >
        <Card className="shadow-2xl border-2 border-blue-500">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <Badge variant="outline">
                  {currentStepIndex + 1} of {tour.steps.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip Tour
                </Button>
                <Button size="sm" onClick={handleNext}>
                  {isLastStep ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Predefined tours for common flows
export const DASHBOARD_TOUR: Tour = {
  id: 'dashboard_tour',
  name: 'Dashboard Tour',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Your Dashboard',
      description: 'Your dashboard gives you an overview of all your projects, budgets, and team activity in one place.',
      targetSelector: '[data-tour="dashboard-overview"]',
      position: 'bottom'
    },
    {
      id: 'projects',
      title: 'Active Projects',
      description: 'View and manage all your active construction projects. Click on any project to see detailed information.',
      targetSelector: '[data-tour="projects-list"]',
      position: 'right'
    },
    {
      id: 'budget',
      title: 'Budget Tracking',
      description: 'Track your budget vs actual spending in real-time. Get alerts when projects are approaching budget limits.',
      targetSelector: '[data-tour="budget-overview"]',
      position: 'left'
    },
    {
      id: 'team',
      title: 'Team Activity',
      description: 'See what your team is working on and track time entries across all projects.',
      targetSelector: '[data-tour="team-activity"]',
      position: 'top'
    }
  ]
};

export const PROJECT_TOUR: Tour = {
  id: 'project_tour',
  name: 'Project Management Tour',
  steps: [
    {
      id: 'project_details',
      title: 'Project Details',
      description: 'View project timeline, budget, and current status at a glance.',
      targetSelector: '[data-tour="project-details"]',
      position: 'bottom'
    },
    {
      id: 'tasks',
      title: 'Tasks & Milestones',
      description: 'Track project tasks and milestones. Assign work to team members and set deadlines.',
      targetSelector: '[data-tour="tasks"]',
      position: 'right'
    },
    {
      id: 'documents',
      title: 'Project Documents',
      description: 'Upload and organize all project documents, plans, and photos in one place.',
      targetSelector: '[data-tour="documents"]',
      position: 'left'
    }
  ]
};

export const MOBILE_TOUR: Tour = {
  id: 'mobile_tour',
  name: 'Mobile Features Tour',
  steps: [
    {
      id: 'time_clock',
      title: 'Mobile Time Clock',
      description: 'Clock in and out from the job site. GPS tracking ensures accurate location verification.',
      targetSelector: '[data-tour="mobile-time-clock"]',
      position: 'bottom'
    },
    {
      id: 'expenses',
      title: 'Expense Capture',
      description: 'Take a photo of receipts and let OCR automatically extract the details. No more manual entry!',
      targetSelector: '[data-tour="mobile-expenses"]',
      position: 'bottom'
    },
    {
      id: 'daily_reports',
      title: 'Daily Reports',
      description: 'Submit daily reports with photos, voice notes, and site conditions right from your phone.',
      targetSelector: '[data-tour="daily-reports"]',
      position: 'bottom'
    }
  ]
};

export default FeatureTour;
