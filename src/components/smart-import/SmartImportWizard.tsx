import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, Download, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FieldMappingStep } from './FieldMappingStep';
import { ImportPreview } from './ImportPreview';
import { DuplicateResolutionDialog } from './DuplicateResolutionDialog';
import {
  CSV_TEMPLATES,
  downloadCSVTemplate,
  getAvailableTemplates,
} from '@/lib/csv-import/templates';
import {
  checkForDuplicates,
  applyResolutions,
  DuplicateCheckResult,
  ResolvedDuplicate,
} from '@/lib/csv-import/duplicate-detection';
import {
  validateImportData,
  executeImport,
  resolveLookupFields,
  parseCSV,
  ImportResult,
  ValidationResult,
} from '@/lib/csv-import/import-executor';

interface SmartImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  defaultDataType?: string;
  aiImportEnabled?: boolean;
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
  field_mappings?: Record<string, string>;
}

type ImportStep = 'upload' | 'analyzing' | 'mapping' | 'preview' | 'duplicates' | 'importing' | 'complete';

export const SmartImportWizard: React.FC<SmartImportWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  defaultDataType,
  aiImportEnabled = true
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(aiImportEnabled);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

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
      setUserId(user.id);

      // Get user profile for company_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('User company not found');
      setCompanyId(profile.company_id);

      // Read file content
      const fileContent = await file.text();
      setUploadProgress(30);

      // Parse CSV data
      const parsedData = parseCSV(fileContent);
      setRawData(parsedData);
      setUploadProgress(50);

      if (useAI) {
        // Create import session for AI analysis
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
          preview_data: Array.isArray(updatedSession.preview_data) ? updatedSession.preview_data : parsedData.slice(0, 5)
        });
        setStep('mapping');
      } else {
        // Manual mode - use default data type or prompt user
        const dataType = defaultDataType || 'projects';
        const template = CSV_TEMPLATES[dataType];

        // Create a simple session object for manual mode
        setSession({
          id: crypto.randomUUID(),
          file_name: file.name,
          detected_data_type: dataType,
          confidence_score: 100,
          source_platform: 'Manual Import',
          total_records: parsedData.length,
          status: 'analyzed',
          preview_data: parsedData.slice(0, 5),
          company_id: profile.company_id,
          created_by: user.id,
        });

        setUploadProgress(100);
        setStep('mapping');
      }

    } catch (error) {
      console.error('Import analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze file');
      toast.error('Failed to analyze file');
      setStep('upload');
    }
  }, [useAI, defaultDataType]);

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

  const handleMappingComplete = async () => {
    if (!session) return;

    try {
      // Fetch the updated field mappings from the session
      const { data: updatedSession } = await supabase
        .from('import_sessions')
        .select('field_mappings')
        .eq('id', session.id)
        .single();

      const fieldMappings = updatedSession?.field_mappings || {};

      // Validate the data
      const validation = validateImportData(
        session.detected_data_type,
        rawData,
        fieldMappings
      );

      setValidationResult(validation);

      // Update session with validation results
      setSession({
        ...session,
        field_mappings: fieldMappings,
        preview_data: validation.validatedData.slice(0, 5),
        total_records: validation.validatedData.length,
      });

      setStep('preview');
    } catch (error) {
      console.error('Mapping completion error:', error);
      toast.error('Failed to process field mappings');
    }
  };

  const handleImportConfirm = async () => {
    if (!session || !validationResult) return;

    try {
      setStep('importing');
      setUploadProgress(0);

      // Resolve lookup fields (like project_name to project_id)
      const resolvedData = await resolveLookupFields(
        session.detected_data_type,
        validationResult.validatedData,
        companyId
      );

      setUploadProgress(30);

      // Check for duplicates
      const duplicates = await checkForDuplicates(
        session.detected_data_type,
        resolvedData,
        companyId
      );

      setDuplicateResult(duplicates);
      setUploadProgress(50);

      if (duplicates.duplicates.length > 0) {
        // Show duplicate resolution dialog
        setShowDuplicateDialog(true);
        setStep('duplicates');
      } else {
        // No duplicates, proceed with import
        await performImport(duplicates, []);
      }
    } catch (error) {
      console.error('Import confirmation error:', error);
      setError(error instanceof Error ? error.message : 'Import failed');
      toast.error('Import failed');
      setStep('preview');
    }
  };

  const handleDuplicateResolution = async (resolutions: ResolvedDuplicate[]) => {
    if (!duplicateResult || !session) return;

    setShowDuplicateDialog(false);
    setStep('importing');

    await performImport(duplicateResult, resolutions);
  };

  const performImport = async (
    duplicates: DuplicateCheckResult,
    resolutions: ResolvedDuplicate[]
  ) => {
    if (!session) return;

    try {
      setUploadProgress(60);

      const template = CSV_TEMPLATES[session.detected_data_type];
      if (!template) throw new Error('Unknown data type');

      // Apply resolutions to get final insert/update lists
      const { toInsert, toUpdate, skipped } = applyResolutions(
        duplicates,
        resolutions,
        template
      );

      setUploadProgress(70);

      // Execute the import
      const result = await executeImport(
        session.detected_data_type,
        toInsert,
        toUpdate,
        companyId,
        userId
      );

      result.skipped = skipped;
      setImportResult(result);

      // Update import session status
      if (session.id && !session.id.includes('-')) {
        await supabase
          .from('import_sessions')
          .update({
            status: result.success ? 'completed' : 'completed_with_errors',
            total_records: result.inserted + result.updated + result.skipped,
          })
          .eq('id', session.id);
      }

      setUploadProgress(100);
      setStep('complete');

      if (result.success) {
        toast.success(`Successfully imported ${result.inserted + result.updated} records!`);
      } else {
        toast.warning(`Import completed with ${result.errors.length} errors`);
      }
    } catch (error) {
      console.error('Import execution error:', error);
      setError(error instanceof Error ? error.message : 'Import failed');
      toast.error('Import failed');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setSession(null);
    setError(null);
    setUploadProgress(0);
    setRawData([]);
    setValidationResult(null);
    setDuplicateResult(null);
    setImportResult(null);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const availableTemplates = getAvailableTemplates();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {useAI && <Sparkles className="h-5 w-5 text-primary" />}
            Smart Data Import
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* AI Toggle */}
            {aiImportEnabled && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Sparkles className={`h-5 w-5 ${useAI ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">AI-Powered Import</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect data types and map fields
                    </p>
                  </div>
                </div>
                <Button
                  variant={useAI ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseAI(!useAI)}
                >
                  {useAI ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            )}

            {/* Drop zone */}
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

            {/* Template Downloads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Import Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Download a template with the correct headers for your data type
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableTemplates.map(template => (
                    <Button
                      key={template.key}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => downloadCSVTemplate(template.key)}
                    >
                      <FileSpreadsheet className="h-3 w-3 mr-2" />
                      {template.displayName}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature cards */}
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
                    Duplicate Handling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Smart duplicate detection with merge or create options
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
              <h3 className="text-lg font-semibold">
                {useAI ? 'AI is Analyzing Your Data' : 'Processing Your File'}
              </h3>
              <p className="text-muted-foreground">
                {useAI
                  ? 'Examining file structure and detecting data patterns...'
                  : 'Parsing and validating your data...'}
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

            <FieldMappingStep
              sessionId={session.id}
              dataType={session.detected_data_type}
              onComplete={handleMappingComplete}
            />
          </div>
        )}

        {step === 'preview' && session && (
          <ImportPreview
            session={session}
            validationResult={validationResult}
            onConfirm={handleImportConfirm}
          />
        )}

        {step === 'duplicates' && duplicateResult && session && (
          <DuplicateResolutionDialog
            isOpen={showDuplicateDialog}
            onClose={() => {
              setShowDuplicateDialog(false);
              setStep('preview');
            }}
            duplicates={duplicateResult.duplicates}
            dataType={session.detected_data_type}
            onResolve={handleDuplicateResolution}
          />
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <div className="animate-pulse">
              <Database className="h-16 w-16 mx-auto text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Importing Data</h3>
            <p className="text-muted-foreground">Processing your records...</p>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="space-y-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">Import Complete!</h3>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </CardContent>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.errors.length} error(s) occurred during import.
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <div key={i} className="text-sm mt-1">
                      Row {err.rowIndex + 1}: {err.message}
                    </div>
                  ))}
                  {importResult.errors.length > 3 && (
                    <div className="text-sm mt-1">
                      ...and {importResult.errors.length - 3} more
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={() => { handleClose(); onImportComplete(); }}>
              Done
            </Button>
          </div>
        )}

        {error && step !== 'complete' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};
