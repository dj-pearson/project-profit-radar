import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ValidationResult, ImportError } from '@/lib/csv-import/import-executor';

interface ImportSession {
  id: string;
  file_name: string;
  detected_data_type: string;
  confidence_score: number;
  source_platform: string;
  total_records: number;
  status: string;
  preview_data: any[];
}

interface ImportPreviewProps {
  session: ImportSession;
  validationResult?: ValidationResult | null;
  onConfirm: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  session,
  validationResult,
  onConfirm
}) => {
  const [showErrors, setShowErrors] = useState(false);

  const previewData = Array.isArray(session.preview_data) ? session.preview_data : [];
  const validRecords = validationResult?.validatedData.length || session.total_records;
  const errorCount = validationResult?.errors.length || 0;
  const hasErrors = errorCount > 0;

  // Group errors by row
  const errorsByRow = validationResult?.errors.reduce((acc, error) => {
    const key = error.rowIndex;
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<number, ImportError[]>) || {};

  const uniqueRowsWithErrors = Object.keys(errorsByRow).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Preview</h3>
        <p className="text-muted-foreground">
          Review the data that will be imported into your {session.detected_data_type} table.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">{validRecords}</p>
                <p className="text-sm text-muted-foreground">Valid Records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={hasErrors ? 'border-yellow-500' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {hasErrors ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="font-medium">{errorCount}</p>
                <p className="text-sm text-muted-foreground">
                  {hasErrors ? `Errors (${uniqueRowsWithErrors} rows)` : 'Validation Errors'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium capitalize">{session.detected_data_type}</p>
                <p className="text-sm text-muted-foreground">Data Type</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation errors section */}
      {hasErrors && (
        <Collapsible open={showErrors} onOpenChange={setShowErrors}>
          <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {errorCount} validation error(s) found in {uniqueRowsWithErrors} row(s).
                These rows will be skipped during import.
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showErrors ? (
                    <>Hide Details <ChevronUp className="ml-1 h-4 w-4" /></>
                  ) : (
                    <>Show Details <ChevronDown className="ml-1 h-4 w-4" /></>
                  )}
                </Button>
              </CollapsibleTrigger>
            </AlertDescription>
          </Alert>

          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {Object.entries(errorsByRow).slice(0, 20).map(([rowIndex, errors]) => (
                      <div
                        key={rowIndex}
                        className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm"
                      >
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Row {parseInt(rowIndex) + 2}:</span>
                          <ul className="list-disc list-inside ml-2">
                            {errors.map((error, idx) => (
                              <li key={idx}>
                                {error.field ? (
                                  <><span className="font-medium">{error.field}</span>: {error.message}</>
                                ) : (
                                  error.message
                                )}
                                {error.value && (
                                  <span className="text-muted-foreground ml-1">
                                    (value: "{String(error.value).substring(0, 30)}")
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                    {Object.keys(errorsByRow).length > 20 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        ...and {Object.keys(errorsByRow).length - 20} more rows with errors
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Data preview table */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Preview (First 5 Records)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewData[0] || {}).slice(0, 6).map((key) => (
                        <TableHead key={key} className="whitespace-nowrap">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableHead>
                      ))}
                      {Object.keys(previewData[0] || {}).length > 6 && (
                        <TableHead className="whitespace-nowrap text-muted-foreground">
                          +{Object.keys(previewData[0]).length - 6} more
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).slice(0, 6).map((value: any, cellIndex) => (
                          <TableCell key={cellIndex} className="whitespace-nowrap max-w-[200px] truncate">
                            {value === null || value === undefined
                              ? <span className="text-muted-foreground">-</span>
                              : typeof value === 'string' && value.length > 40
                                ? `${value.substring(0, 40)}...`
                                : String(value)}
                          </TableCell>
                        ))}
                        {Object.keys(row).length > 6 && (
                          <TableCell className="text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import summary */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {validRecords} records ready to import
            </Badge>
            {hasErrors && (
              <Badge variant="secondary" className="font-normal">
                {uniqueRowsWithErrors} rows will be skipped
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {hasErrors
              ? 'Records with validation errors will be skipped. You can fix and re-import them later.'
              : 'All records passed validation and are ready to import.'}
          </p>
        </div>

        <Button
          onClick={onConfirm}
          disabled={validRecords === 0}
          size="lg"
        >
          {validRecords === 0
            ? 'No Valid Records'
            : `Import ${validRecords} Record${validRecords !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
};
