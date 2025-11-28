import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CSV_TEMPLATES, getTemplateFields } from '@/lib/csv-import/templates';

interface FieldMapping {
  id: string;
  source_field: string;
  suggested_target_field: string;
  confidence_score: number;
  data_sample: string[];
}

interface FieldMappingStepProps {
  sessionId: string;
  dataType?: string;
  onComplete: () => void;
}

export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  sessionId,
  dataType = 'projects',
  onComplete
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Get available target fields from template
  const templateFields = getTemplateFields(dataType);
  const targetFieldOptions = [
    ...templateFields.map(f => ({
      value: f.dbField,
      label: f.name,
      required: f.required,
    })),
    { value: 'skip', label: 'Skip Field', required: false },
  ];

  useEffect(() => {
    loadFieldMappings();
  }, [sessionId]);

  const loadFieldMappings = async () => {
    try {
      // Check if sessionId is a UUID (from database) or generated (manual mode)
      const isDbSession = !sessionId.includes('-') || sessionId.length === 36;

      if (isDbSession && sessionId.length === 36) {
        const { data, error } = await supabase
          .from('import_field_suggestions')
          .select('*')
          .eq('import_session_id', sessionId)
          .order('confidence_score', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setMappings(data);

          // Initialize selected mappings with suggestions
          const initialMappings: Record<string, string> = {};
          data.forEach(mapping => {
            initialMappings[mapping.source_field] = mapping.suggested_target_field;
          });
          setSelectedMappings(initialMappings);
        } else {
          // No AI suggestions - create default mappings from template
          createDefaultMappings();
        }
      } else {
        // Manual mode - create default mappings
        createDefaultMappings();
      }
    } catch (error) {
      console.error('Error loading field mappings:', error);
      createDefaultMappings();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultMappings = () => {
    // Create mappings based on template fields
    const defaultMappings: FieldMapping[] = templateFields.map((field, index) => ({
      id: `default-${index}`,
      source_field: field.name,
      suggested_target_field: field.dbField,
      confidence_score: 100,
      data_sample: [field.example],
    }));

    setMappings(defaultMappings);

    const initialMappings: Record<string, string> = {};
    defaultMappings.forEach(mapping => {
      initialMappings[mapping.source_field] = mapping.suggested_target_field;
    });
    setSelectedMappings(initialMappings);
  };

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [sourceField]: targetField
    }));
  };

  const handleSaveAndContinue = async () => {
    try {
      // Check if it's a database session
      const isDbSession = sessionId.length === 36 && !sessionId.includes('-');

      if (isDbSession) {
        // Save the selected mappings to the import session
        const { error } = await supabase
          .from('import_sessions')
          .update({
            field_mappings: selectedMappings,
            status: 'mapped'
          })
          .eq('id', sessionId);

        if (error) throw error;
      }

      onComplete();
    } catch (error) {
      console.error('Error saving mappings:', error);
      // Still proceed even if save fails
      onComplete();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  // Check if all required fields are mapped
  const requiredFields = templateFields.filter(f => f.required);
  const mappedTargets = Object.values(selectedMappings).filter(v => v !== 'skip');
  const missingRequired = requiredFields.filter(
    f => !mappedTargets.includes(f.dbField)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3">Loading field mappings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Field Mapping</h3>
        <p className="text-muted-foreground">
          Review and adjust how your source fields map to our database fields.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm">
            Required fields not mapped: {missingRequired.map(f => f.name).join(', ')}
          </span>
        </div>
      )}

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <Card key={mapping.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr,auto,auto] gap-4 items-center">
                  {/* Source field */}
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{mapping.source_field}</p>
                    <div className="flex flex-wrap gap-1">
                      {mapping.data_sample.slice(0, 2).map((sample, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs truncate max-w-[120px]">
                          {sample || '(empty)'}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Target field selector */}
                  <div>
                    <Select
                      value={selectedMappings[mapping.source_field] || ''}
                      onValueChange={(value) => handleMappingChange(mapping.source_field, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target field" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFieldOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              {option.label}
                              {option.required && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                  Required
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Confidence badge */}
                  <div className="hidden md:flex justify-center">
                    <Badge className={getConfidenceColor(mapping.confidence_score)}>
                      {mapping.confidence_score}%
                    </Badge>
                  </div>

                  {/* Status indicator */}
                  <div className="hidden md:flex justify-center">
                    {selectedMappings[mapping.source_field] &&
                     selectedMappings[mapping.source_field] !== 'skip' && (
                      <Target className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {Object.keys(selectedMappings).length} fields mapped
          {missingRequired.length > 0 && (
            <span className="text-yellow-600 ml-2">
              ({missingRequired.length} required missing)
            </span>
          )}
        </div>
        <Button
          onClick={handleSaveAndContinue}
          disabled={missingRequired.length > 0}
        >
          Continue to Preview
        </Button>
      </div>
    </div>
  );
};
