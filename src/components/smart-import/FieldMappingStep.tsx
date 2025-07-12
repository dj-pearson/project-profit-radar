import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FieldMapping {
  id: string;
  source_field: string;
  suggested_target_field: string;
  confidence_score: number;
  data_sample: string[];
}

interface FieldMappingStepProps {
  sessionId: string;
  onComplete: () => void;
}

export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  sessionId,
  onComplete
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFieldMappings();
  }, [sessionId]);

  const loadFieldMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('import_field_suggestions')
        .select('*')
        .eq('import_session_id', sessionId)
        .order('confidence_score', { ascending: false });

      if (error) throw error;

      setMappings(data || []);
      
      // Initialize selected mappings with suggestions
      const initialMappings: Record<string, string> = {};
      data?.forEach(mapping => {
        initialMappings[mapping.source_field] = mapping.suggested_target_field;
      });
      setSelectedMappings(initialMappings);
    } catch (error) {
      console.error('Error loading field mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [sourceField]: targetField
    }));
  };

  const handleSaveAndContinue = async () => {
    try {
      // Save the selected mappings to the import session
      const { error } = await supabase
        .from('import_sessions')
        .update({
          field_mappings: selectedMappings,
          status: 'mapped'
        })
        .eq('id', sessionId);

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <div>Loading field mappings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Field Mapping</h3>
        <p className="text-muted-foreground">
          Review and adjust how your source fields map to our database fields.
        </p>
      </div>

      <div className="space-y-4">
        {mappings.map((mapping) => (
          <Card key={mapping.id}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="space-y-2">
                  <p className="font-medium">{mapping.source_field}</p>
                  <div className="flex flex-wrap gap-1">
                    {mapping.data_sample.slice(0, 3).map((sample, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {sample}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <Select
                    value={selectedMappings[mapping.source_field]}
                    onValueChange={(value) => handleMappingChange(mapping.source_field, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="start_date">Start Date</SelectItem>
                      <SelectItem value="end_date">End Date</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="client_name">Client Name</SelectItem>
                      <SelectItem value="client_email">Client Email</SelectItem>
                      <SelectItem value="client_phone">Client Phone</SelectItem>
                      <SelectItem value="skip">Skip Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <Badge className={getConfidenceColor(mapping.confidence_score)}>
                    {mapping.confidence_score}% match
                  </Badge>
                </div>

                <div className="flex justify-center">
                  <Target className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveAndContinue}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );
};