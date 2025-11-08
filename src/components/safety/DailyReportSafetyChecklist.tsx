import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle
} from 'lucide-react';

export interface SafetyChecklistData {
  checksCompleted: {
    ppe_worn: boolean;
    hazards_identified: boolean;
    toolbox_talk: boolean;
    emergency_exits_clear: boolean;
    first_aid_accessible: boolean;
    no_incidents: boolean;
  };
  notes: string;
  incidentReport: string;
  hasIncident: boolean;
}

interface DailyReportSafetyChecklistProps {
  value: SafetyChecklistData;
  onChange: (data: SafetyChecklistData) => void;
  required?: boolean;
}

const DEFAULT_SAFETY_DATA: SafetyChecklistData = {
  checksCompleted: {
    ppe_worn: false,
    hazards_identified: false,
    toolbox_talk: false,
    emergency_exits_clear: false,
    first_aid_accessible: false,
    no_incidents: false,
  },
  notes: '',
  incidentReport: '',
  hasIncident: false,
};

export const DailyReportSafetyChecklist = ({
  value = DEFAULT_SAFETY_DATA,
  onChange,
  required = true
}: DailyReportSafetyChecklistProps) => {
  const [showIncidentReport, setShowIncidentReport] = useState(value.hasIncident);

  const safetyChecks = [
    {
      id: 'ppe_worn',
      label: 'All workers wearing required PPE',
      description: 'Hard hats, safety glasses, gloves, steel-toed boots, etc.'
    },
    {
      id: 'hazards_identified',
      label: 'Worksite hazards identified and communicated',
      description: 'Fall hazards, electrical risks, material handling dangers'
    },
    {
      id: 'toolbox_talk',
      label: 'Toolbox talk completed (if scheduled)',
      description: 'Daily safety meeting with crew'
    },
    {
      id: 'emergency_exits_clear',
      label: 'Emergency exits and pathways clear',
      description: 'No obstructions blocking egress routes'
    },
    {
      id: 'first_aid_accessible',
      label: 'First aid kit accessible and stocked',
      description: 'Location known to all crew members'
    },
    {
      id: 'no_incidents',
      label: 'No safety incidents today',
      description: 'No injuries, near-misses, or unsafe conditions'
    }
  ];

  const handleCheckChange = (checkId: string, checked: boolean) => {
    const newChecks = {
      ...value.checksCompleted,
      [checkId]: checked
    };

    // If "no incidents" is unchecked, show incident report
    if (checkId === 'no_incidents' && !checked) {
      setShowIncidentReport(true);
      onChange({
        ...value,
        checksCompleted: newChecks,
        hasIncident: true
      });
    } else if (checkId === 'no_incidents' && checked) {
      setShowIncidentReport(false);
      onChange({
        ...value,
        checksCompleted: newChecks,
        hasIncident: false,
        incidentReport: ''
      });
    } else {
      onChange({
        ...value,
        checksCompleted: newChecks
      });
    }
  };

  const handleNotesChange = (notes: string) => {
    onChange({
      ...value,
      notes
    });
  };

  const handleIncidentReportChange = (incidentReport: string) => {
    onChange({
      ...value,
      incidentReport
    });
  };

  // Calculate completion status
  const totalChecks = Object.keys(value.checksCompleted).length;
  const completedChecks = Object.values(value.checksCompleted).filter(Boolean).length;
  const isComplete = completedChecks === totalChecks;
  const hasIssues = !value.checksCompleted.no_incidents ||
                   Object.entries(value.checksCompleted)
                     .filter(([key, _]) => key !== 'no_incidents')
                     .some(([_, checked]) => !checked);

  return (
    <Card className={`${required && !isComplete ? 'border-orange-500' : 'border-green-500'} ${hasIssues ? 'bg-orange-50 dark:bg-orange-950' : 'bg-green-50 dark:bg-green-950'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${hasIssues ? 'text-orange-600' : 'text-green-600'}`} />
            <CardTitle className="text-lg">
              Daily Safety Checklist
              {required && <span className="text-red-500 ml-1">*</span>}
            </CardTitle>
          </div>
          <Badge variant={isComplete ? (hasIssues ? 'destructive' : 'default') : 'secondary'}>
            {completedChecks}/{totalChecks} Complete
          </Badge>
        </div>
        <CardDescription>
          Required daily safety verification. Complete all checks before submitting report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completion Alert */}
        {required && !isComplete && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete all safety checks before submitting this daily report.
            </AlertDescription>
          </Alert>
        )}

        {/* Safety Checks */}
        <div className="space-y-4">
          {safetyChecks.map((check) => (
            <div key={check.id} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <Checkbox
                id={check.id}
                checked={value.checksCompleted[check.id as keyof typeof value.checksCompleted]}
                onCheckedChange={(checked) => handleCheckChange(check.id, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={check.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {check.label}
                  {check.id === 'no_incidents' && !value.checksCompleted.no_incidents && (
                    <AlertTriangle className="inline h-4 w-4 ml-2 text-orange-500" />
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {check.description}
                </p>
              </div>
              {value.checksCompleted[check.id as keyof typeof value.checksCompleted] && (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Safety Notes */}
        <div className="space-y-2">
          <Label htmlFor="safety-notes" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Additional Safety Notes
          </Label>
          <Textarea
            id="safety-notes"
            placeholder="Any additional safety observations, concerns, or notes..."
            value={value.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
            className="bg-white dark:bg-gray-900"
          />
        </div>

        {/* Incident Report Section */}
        {showIncidentReport && (
          <Alert variant="destructive" className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <div className="font-semibold">Safety Incident Report Required</div>
            </div>
            <AlertDescription className="space-y-2">
              <p>You indicated there was a safety incident today. Please provide details:</p>
              <Textarea
                placeholder="Describe the incident: What happened? Who was involved? What injuries occurred? What immediate actions were taken?"
                value={value.incidentReport}
                onChange={(e) => handleIncidentReportChange(e.target.value)}
                rows={4}
                className="bg-white dark:bg-gray-900"
                required
              />
              <p className="text-xs mt-2">
                <strong>Note:</strong> This incident will be automatically logged to the safety compliance system
                and the safety manager will be notified immediately.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        {!showIncidentReport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowIncidentReport(true);
              onChange({
                ...value,
                checksCompleted: {
                  ...value.checksCompleted,
                  no_incidents: false
                },
                hasIncident: true
              });
            }}
            className="w-full border-red-500 text-red-600 hover:bg-red-50"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Report Safety Incident
          </Button>
        )}

        {/* Compliance Info */}
        <div className="text-xs text-muted-foreground bg-white dark:bg-gray-900 p-3 rounded border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>OSHA Compliance:</strong> Daily safety checklists are automatically logged
              for compliance reporting. Incident reports trigger immediate notifications to safety
              management and are added to your OSHA 300 log if applicable.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
