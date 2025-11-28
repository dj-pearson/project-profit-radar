import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Merge, Plus, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DuplicateMatch,
  DuplicateResolution,
  ResolvedDuplicate
} from '@/lib/csv-import/duplicate-detection';
import { CSV_TEMPLATES } from '@/lib/csv-import/templates';

interface DuplicateResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateMatch[];
  dataType: string;
  onResolve: (resolutions: ResolvedDuplicate[]) => void;
}

export const DuplicateResolutionDialog: React.FC<DuplicateResolutionDialogProps> = ({
  isOpen,
  onClose,
  duplicates,
  dataType,
  onResolve,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<number, DuplicateResolution>>(
    new Map()
  );

  const template = CSV_TEMPLATES[dataType];
  const currentDuplicate = duplicates[currentIndex];

  const handleResolutionChange = (resolution: DuplicateResolution) => {
    setResolutions(prev => {
      const newMap = new Map(prev);
      newMap.set(currentDuplicate.importIndex, resolution);
      return newMap;
    });
  };

  const handleApplyToAll = (resolution: DuplicateResolution) => {
    const newMap = new Map<number, DuplicateResolution>();
    duplicates.forEach(d => {
      newMap.set(d.importIndex, resolution);
    });
    setResolutions(newMap);
  };

  const handleNext = () => {
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleConfirm = () => {
    const resolvedDuplicates: ResolvedDuplicate[] = duplicates.map(d => ({
      importIndex: d.importIndex,
      resolution: resolutions.get(d.importIndex) || 'skip',
      existingId: d.existingRecord.id,
    }));
    onResolve(resolvedDuplicates);
  };

  const getResolutionIcon = (resolution: DuplicateResolution) => {
    switch (resolution) {
      case 'merge':
        return <Merge className="h-4 w-4" />;
      case 'create_new':
        return <Plus className="h-4 w-4" />;
      case 'skip':
        return <SkipForward className="h-4 w-4" />;
    }
  };

  const resolvedCount = resolutions.size;
  const allResolved = resolvedCount === duplicates.length;

  if (!currentDuplicate || !template) {
    return null;
  }

  const getFieldDisplayValue = (record: Record<string, any>, fieldName: string) => {
    const value = record[fieldName];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  // Get display fields from template
  const displayFields = template.fields
    .filter(f => !f.dbField.startsWith('_'))
    .slice(0, 8); // Show first 8 fields for comparison

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Duplicate Records Found
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <Badge variant="outline">
            {currentIndex + 1} of {duplicates.length} duplicates
          </Badge>
          <Badge variant="secondary">
            {resolvedCount} of {duplicates.length} resolved
          </Badge>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Match information */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Potential Duplicate Detected</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Match confidence: <strong>{currentDuplicate.matchScore}%</strong> based on{' '}
                {currentDuplicate.matchedFields.join(', ')}
              </p>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Existing Record */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="secondary">Existing Record</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {displayFields.map(field => (
                    <div key={field.dbField} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{field.name}:</span>
                      <span className="font-medium truncate max-w-[180px]">
                        {getFieldDisplayValue(currentDuplicate.existingRecord, field.dbField)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Import Record */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge>Import Record</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {displayFields.map(field => {
                    const importValue = currentDuplicate.importRecord[field.dbField] ||
                      currentDuplicate.importRecord[field.name];
                    return (
                      <div key={field.dbField} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{field.name}:</span>
                        <span className="font-medium truncate max-w-[180px]">
                          {importValue ?? '-'}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Resolution options */}
            <div className="space-y-4">
              <h4 className="font-medium">How would you like to handle this duplicate?</h4>

              <RadioGroup
                value={resolutions.get(currentDuplicate.importIndex) || ''}
                onValueChange={(value) => handleResolutionChange(value as DuplicateResolution)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="merge" id="merge" className="mt-1" />
                  <Label htmlFor="merge" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Merge className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Merge Records</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update the existing record with new data from the import. Existing values will be overwritten where new data is provided.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="create_new" id="create_new" className="mt-1" />
                  <Label htmlFor="create_new" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Create New Record</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Import this as a new separate record, keeping the existing record unchanged.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="skip" id="skip" className="mt-1" />
                  <Label htmlFor="skip" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <SkipForward className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Skip</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Don't import this record. The existing record will remain unchanged.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Apply to all option */}
            {duplicates.length > 1 && (
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Apply action to all duplicates:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyToAll('merge')}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    Merge All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyToAll('create_new')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create All New
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyToAll('skip')}
                  >
                    <SkipForward className="h-3 w-3 mr-1" />
                    Skip All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === duplicates.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!allResolved}>
              {allResolved
                ? 'Continue with Import'
                : `Resolve ${duplicates.length - resolvedCount} Remaining`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
