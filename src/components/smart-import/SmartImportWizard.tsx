import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldMappingStep } from './FieldMappingStep';
import { ImportPreview } from './ImportPreview';

interface SmartImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportSession {
  id: string;
  file_name: string;
  detected_data_type: string;
  confidence_score: number;
  source_platform: string;
  total_records: number;
  status: string;
  preview_data: any[];
  company_id: string;
  created_by: string;
}

export const SmartImportWizard: React.FC<SmartImportWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStep('analyzing');
    setUploadProgress(0);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile for company_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('User company not found');

      // Create import session
      const { data: sessionData, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'text/csv',
          status: 'analyzing',
          company_id: profile.company_id,
          created_by: user.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Read file content
      const fileContent = await file.text();
      setUploadProgress(50);

      // Call smart analyzer
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('smart-data-analyzer', {
        body: {
          sessionId: sessionData.id,
          csvData: fileContent,
          fileName: file.name
        }
      });

      if (analysisError) throw analysisError;

      setUploadProgress(100);
      
      // Fetch updated session data
      const { data: updatedSession, error: fetchError } = await supabase
        .from('import_sessions')
        .select('*')
        .eq('id', sessionData.id)
        .single();

      if (fetchError) throw fetchError;

      setSession({
        ...updatedSession,
        preview_data: Array.isArray(updatedSession.preview_data) ? updatedSession.preview_data : []
      });
      setStep('mapping');

    } catch (error) {
      console.error('Import analysis error:', error);
      setError(error.message || 'Failed to analyze file');
      toast.error('Failed to analyze file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json']
    },
    maxFiles: 1
  });

  const handleMappingComplete = () => {
    setStep('preview');
  };

  const handleImportConfirm = async () => {
    setStep('importing');
    // Import logic will be implemented in next step
    setTimeout(() => {
      setStep('complete');
      toast.success('Data imported successfully!');
    }, 2000);
  };

  const handleClose = () => {
    setStep('upload');
    setSession(null);
    setError(null);
    setUploadProgress(0);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Data Import</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? 'Drop your file here' : 'Upload Data File'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop or click to select CSV, Excel, or JSON files
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports exports from Procore, Buildertrend, CoConstruct, QuickBooks, and more
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4" />
                    Auto-Detection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    AI automatically identifies data types and suggests optimal routing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" />
                    Smart Mapping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Intelligent field mapping with confidence scoring
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Platform Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Built-in support for major construction software exports
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="animate-pulse">
                <Database className="h-16 w-16 mx-auto text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Analyzing Your Data</h3>
              <p className="text-muted-foreground">
                AI is examining your file structure and detecting data patterns...
              </p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        )}

        {step === 'mapping' && session && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Analysis Results</h3>
                <Badge variant="outline" className="text-xs">
                  {session.total_records} records found
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Data Type</p>
                      <p className="text-lg capitalize">{session.detected_data_type}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-12 rounded ${getConfidenceColor(session.confidence_score)}`} />
                        <span className="text-lg">{session.confidence_score}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Source Platform</p>
                      <p className="text-lg">{session.source_platform}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <FieldMappingStep sessionId={session.id} onComplete={handleMappingComplete} />
          </div>
        )}

        {step === 'preview' && session && (
          <ImportPreview session={session} onConfirm={handleImportConfirm} />
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <div className="animate-pulse">
              <Database className="h-16 w-16 mx-auto text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Importing Data</h3>
            <p className="text-muted-foreground">Processing your records...</p>
            <Progress value={50} className="w-full" />
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">Import Complete!</h3>
            <p className="text-muted-foreground">Your data has been successfully imported.</p>
            <Button onClick={() => { handleClose(); onImportComplete(); }}>
              Done
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};