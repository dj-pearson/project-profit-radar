import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Tesseract from 'tesseract.js';
import { 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  ArrowRight,
  Loader2 
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
}

interface AIClassification {
  document_type: string;
  vendor_name?: string;
  amount?: number;
  project_references?: string[];
  suggested_project_id?: string;
  suggested_cost_center?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface DocumentOCRProcessorProps {
  file: File;
  projects: Project[];
  onProcessingComplete: (result: {
    ocrText: string;
    aiClassification: AIClassification;
    suggestedProjectId?: string;
    suggestedCostCenter?: string;
  }) => void;
  onCancel: () => void;
}

const DocumentOCRProcessor: React.FC<DocumentOCRProcessorProps> = ({
  file,
  projects,
  onProcessingComplete,
  onCancel
}) => {
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState<string>('');
  const [aiClassification, setAiClassification] = useState<AIClassification | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'ocr' | 'ai' | 'review' | 'complete'>('ocr');
  const [manualOverrides, setManualOverrides] = useState({
    projectId: '',
    costCenter: '',
    documentType: ''
  });

  React.useEffect(() => {
    if (file) {
      processDocument();
    }
  }, [file]);

  const processDocument = async () => {
    setProcessing(true);
    setCurrentStep('ocr');
    
    try {
      // Step 1: OCR Processing
      console.log('Starting OCR processing...');
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      setOcrText(text);
      console.log('OCR completed, extracted text length:', text.length);
      
      // Step 2: AI Classification
      setCurrentStep('ai');
      console.log('Starting AI classification...');
      
      const aiResult = await classifyDocument(text);
      setAiClassification(aiResult);
      
      setCurrentStep('review');
    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "Failed to process document. Please try again."
      });
    } finally {
      setProcessing(false);
    }
  };

  const classifyDocument = async (text: string): Promise<AIClassification> => {
    try {
      const { data, error } = await supabase.functions.invoke('document-classifier', {
        body: { 
          text: text.substring(0, 4000), // Limit text to reduce tokens
          projects: projects.map(p => ({ id: p.id, name: p.name, client: p.client_name }))
        }
      });

      if (error) throw error;
      return data.classification;
    } catch (error) {
      console.error('AI classification error:', error);
      // Fallback classification
      return {
        document_type: 'unknown',
        confidence: 'low' as const,
        reasoning: 'AI classification failed, manual review required'
      };
    }
  };

  const handleConfirmProcessing = () => {
    const finalProjectId = manualOverrides.projectId || aiClassification?.suggested_project_id;
    const finalCostCenter = manualOverrides.costCenter || aiClassification?.suggested_cost_center;
    const finalDocumentType = manualOverrides.documentType || aiClassification?.document_type;

    onProcessingComplete({
      ocrText,
      aiClassification: {
        ...aiClassification!,
        document_type: finalDocumentType,
        suggested_project_id: finalProjectId,
        suggested_cost_center: finalCostCenter
      },
      suggestedProjectId: finalProjectId,
      suggestedCostCenter: finalCostCenter
    });
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['ocr', 'ai', 'review', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return processing ? 'processing' : 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Smart Document Processing</span>
          </CardTitle>
          <CardDescription>
            Processing {file.name} with OCR and AI classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {[
              { key: 'ocr', label: 'Text Extraction', icon: FileText },
              { key: 'ai', label: 'AI Analysis', icon: Brain },
              { key: 'review', label: 'Review & Confirm', icon: Eye }
            ].map(({ key, label, icon: Icon }, index) => {
              const status = getStepStatus(key);
              return (
                <div key={key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    status === 'complete' ? 'bg-green-500 border-green-500 text-white' :
                    status === 'current' || status === 'processing' ? 'bg-primary border-primary text-white' :
                    'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'complete' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm ${
                    status === 'complete' || status === 'current' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {label}
                  </span>
                  {index < 2 && (
                    <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
          
          {currentStep === 'ocr' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting text from document...</span>
                <span>{ocrProgress}%</span>
              </div>
              <Progress value={ocrProgress} />
            </div>
          )}
          
          {currentStep === 'ai' && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is analyzing the document...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Results */}
      {ocrText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Extracted Text</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={ocrText}
              readOnly
              className="min-h-[100px] text-sm"
              placeholder="Extracted text will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* AI Classification Results */}
      {aiClassification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Analysis Results</span>
              <Badge className={getConfidenceColor(aiClassification.confidence)}>
                {aiClassification.confidence} confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Document Type</Label>
                <Select
                  value={manualOverrides.documentType || aiClassification.document_type}
                  onValueChange={(value) => setManualOverrides(prev => ({ ...prev, documentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Material Invoice</SelectItem>
                    <SelectItem value="receipt">Equipment Receipt</SelectItem>
                    <SelectItem value="timesheet">Labor Timesheet</SelectItem>
                    <SelectItem value="contract">Contract/Agreement</SelectItem>
                    <SelectItem value="permit">Permit/License</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Suggested Project</Label>
                <Select
                  value={manualOverrides.projectId || aiClassification.suggested_project_id || ''}
                  onValueChange={(value) => setManualOverrides(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {aiClassification.vendor_name && (
              <div>
                <Label>Vendor</Label>
                <div className="text-sm bg-muted p-2 rounded">
                  {aiClassification.vendor_name}
                </div>
              </div>
            )}

            {aiClassification.amount && (
              <div>
                <Label>Amount</Label>
                <div className="text-sm bg-muted p-2 rounded">
                  ${aiClassification.amount.toLocaleString()}
                </div>
              </div>
            )}

            <div>
              <Label>AI Reasoning</Label>
              <div className="text-sm bg-muted p-2 rounded">
                {aiClassification.reasoning}
              </div>
            </div>

            {aiClassification.confidence === 'low' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Low confidence classification. Please review and adjust the selections above.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {currentStep === 'review' && (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirmProcessing}>
            Confirm & Upload Document
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentOCRProcessor;