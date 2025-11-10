/**
 * Daily Report Template Selector
 * Select template and auto-populate daily report
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Users,
  CheckSquare,
  Cloud,
  Package,
  Wrench,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useDailyReportTemplates } from '@/hooks/useDailyReportTemplates';

interface DailyReportTemplateSelectorProps {
  projectId: string;
  date: string;
  dailyReportId?: string;
  onAutoPopulated?: (result: any) => void;
  compact?: boolean;
}

const DailyReportTemplateSelector = ({
  projectId,
  date,
  dailyReportId,
  onAutoPopulated,
  compact = false,
}: DailyReportTemplateSelectorProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const {
    templates,
    loadingTemplates,
    autoPopulating,
    autoPopulateReport,
  } = useDailyReportTemplates();

  const handleAutoPopulate = () => {
    if (!selectedTemplateId || !dailyReportId) return;

    autoPopulateReport(
      {
        dailyReportId,
        templateId: selectedTemplateId,
        projectId,
        date,
      },
      {
        onSuccess: (result) => {
          onAutoPopulated?.(result);
        },
      }
    );
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const getAutofillBadges = () => {
    if (!selectedTemplate) return [];

    const badges = [];
    if (selectedTemplate.auto_populate_crew) badges.push({ icon: Users, label: 'Crew' });
    if (selectedTemplate.auto_populate_tasks) badges.push({ icon: CheckSquare, label: 'Tasks' });
    if (selectedTemplate.auto_populate_weather) badges.push({ icon: Cloud, label: 'Weather' });
    if (selectedTemplate.auto_populate_materials) badges.push({ icon: Package, label: 'Materials' });
    if (selectedTemplate.auto_populate_equipment) badges.push({ icon: Wrench, label: 'Equipment' });

    return badges;
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No templates available.{' '}
          <a href="/daily-report-templates" className="underline">
            Create a template
          </a>{' '}
          to enable auto-population.
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Use template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTemplateId && dailyReportId && (
          <Button
            onClick={handleAutoPopulate}
            disabled={autoPopulating}
            size="sm"
            className="bg-construction-orange"
          >
            {autoPopulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Auto-filling...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-fill
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-construction-orange" />
        <h3 className="font-semibold">Use Template to Auto-fill</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="template-select">Select Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{template.name}</span>
                    {template.project_type && (
                      <Badge variant="secondary" className="ml-2">
                        {template.project_type}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="space-y-2">
            {selectedTemplate.description && (
              <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
            )}

            <div>
              <Label className="text-sm text-muted-foreground">Will auto-fill:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getAutofillBadges().map(({ icon: Icon, label }) => (
                  <Badge key={label} variant="secondary" className="gap-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </Badge>
                ))}
                {getAutofillBadges().length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No auto-fill enabled for this template
                  </span>
                )}
              </div>
            </div>

            {!dailyReportId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Save the daily report first to enable auto-population.
                </AlertDescription>
              </Alert>
            )}

            {dailyReportId && (
              <Button
                onClick={handleAutoPopulate}
                disabled={autoPopulating}
                className="w-full bg-construction-orange"
              >
                {autoPopulating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auto-filling Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-fill Report with {selectedTemplate.name}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedTemplate && selectedTemplate.use_count > 0 && (
        <div className="text-xs text-muted-foreground">
          This template has been used {selectedTemplate.use_count} times
        </div>
      )}
    </div>
  );
};

export default DailyReportTemplateSelector;
