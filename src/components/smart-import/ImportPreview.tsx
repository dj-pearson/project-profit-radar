import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

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
  onConfirm: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  session,
  onConfirm
}) => {
  const previewData = Array.isArray(session.preview_data) ? session.preview_data : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Preview</h3>
        <p className="text-muted-foreground">
          Review the data that will be imported into your {session.detected_data_type} table.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">{session.total_records}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">0</p>
                <p className="text-sm text-muted-foreground">Validation Errors</p>
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

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview (First 5 Records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <TableHead key={key} className="whitespace-nowrap">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                          {typeof value === 'string' && value.length > 50 
                            ? `${value.substring(0, 50)}...` 
                            : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Ready to import {session.total_records} records
          </Badge>
        </div>
        
        <Button onClick={onConfirm}>
          Confirm Import
        </Button>
      </div>
    </div>
  );
};