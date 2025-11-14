/**
 * Mobile Expense Capture
 * Quick expense entry with camera and OCR for receipt scanning
 * Optimized for field workers on mobile devices
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Camera,
  Upload,
  Check,
  AlertTriangle,
  DollarSign,
  FileText,
  MapPin,
  Loader2,
  X,
  ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGeofencing } from '@/hooks/useGeofencing';
import { supabase } from '@/integrations/supabase/client';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createWorker } from 'tesseract.js';

interface MobileExpenseCaptureProps {
  projectId?: string;
  onExpenseSaved?: (expense: any) => void;
  onCancel?: () => void;
}

export const MobileExpenseCapture: React.FC<MobileExpenseCaptureProps> = ({
  projectId,
  onExpenseSaved,
  onCancel
}) => {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const {
    currentLocation,
    permissionStatus,
    startTracking
  } = useGeofencing({ autoStart: false });

  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Form fields
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('company_card');

  const [projects, setProjects] = useState<any[]>([]);
  const [costCodes, setCostCodes] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadCostCodes();
    startTracking();
  }, []);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'in_progress'])
        .order('name')
        .limit(50);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadCostCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setCostCodes(data || []);
    } catch (error) {
      console.error('Error loading cost codes:', error);
    }
  };

  const captureReceipt = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920
      });

      if (image.base64String) {
        setReceiptImage(image.base64String);
        processReceiptOCR(image.base64String);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera',
        variant: 'destructive'
      });
    }
  };

  const processReceiptOCR = async (base64Image: string) => {
    setIsProcessing(true);
    setOcrConfidence(null);

    try {
      const worker = await createWorker('eng');
      const imageData = `data:image/jpeg;base64,${base64Image}`;

      const { data: { text, confidence } } = await worker.recognize(imageData);
      await worker.terminate();

      // Extract potential information from OCR text
      const extractedData = extractReceiptData(text);

      // Auto-fill form with extracted data
      if (extractedData.amount) {
        setAmount(extractedData.amount);
      }
      if (extractedData.vendor) {
        setVendor(extractedData.vendor);
      }
      if (extractedData.date) {
        setExpenseDate(extractedData.date);
      }

      setOcrConfidence(confidence);

      toast({
        title: 'Receipt Scanned',
        description: `Extracted data with ${Math.round(confidence)}% confidence. Please verify the information.`,
      });
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: 'OCR Failed',
        description: 'Could not extract text from receipt. Please enter details manually.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const extractReceiptData = (text: string): { amount?: string; vendor?: string; date?: string } => {
    const result: { amount?: string; vendor?: string; date?: string } = {};

    // Extract amount (simple regex for dollar amounts)
    const amountMatch = text.match(/\$?\s*(\d+[.,]\d{2})/);
    if (amountMatch) {
      result.amount = amountMatch[1].replace(',', '.');
    }

    // Extract date (MM/DD/YYYY or similar)
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
      try {
        const dateParts = dateMatch[1].split(/[\/\-]/);
        if (dateParts.length === 3) {
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
          result.date = `${year}-${month}-${day}`;
        }
      } catch (e) {
        // Invalid date format
      }
    }

    // Extract vendor (first line of text, often the business name)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      result.vendor = lines[0].trim();
    }

    return result;
  };

  const saveExpense = async () => {
    if (!selectedProject || !amount || !category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in project, amount, and category',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      let receiptUrl = null;

      // Upload receipt image if available
      if (receiptImage) {
        const fileName = `${user?.id}/${Date.now()}_receipt.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, Buffer.from(receiptImage, 'base64'), {
            contentType: 'image/jpeg'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptUrl = publicUrl;
      }

      // Create expense record
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          company_id: userProfile?.company_id,
          project_id: selectedProject,
          user_id: user?.id,
          amount: parseFloat(amount),
          vendor: vendor,
          category: category,
          description: description,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          receipt_url: receiptUrl,
          gps_latitude: currentLocation?.latitude,
          gps_longitude: currentLocation?.longitude,
          ocr_confidence: ocrConfidence,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '✓ Expense Saved',
        description: 'Expense has been recorded successfully',
      });

      onExpenseSaved?.(expense);

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save expense',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setReceiptImage(null);
    setAmount('');
    setVendor('');
    setCategory('');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('company_card');
    setOcrConfidence(null);
  };

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Quick Expense
              </CardTitle>
              <CardDescription>Snap a photo of your receipt to get started</CardDescription>
            </div>
            {permissionStatus === 'granted' && currentLocation && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                GPS Active
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Receipt Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receipt Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!receiptImage ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-4">
                Take a photo of your receipt for automatic data extraction
              </p>
              <Button onClick={captureReceipt} className="w-full sm:w-auto">
                <Camera className="h-4 w-4 mr-2" />
                Capture Receipt
              </Button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={`data:image/jpeg;base64,${receiptImage}`}
                alt="Receipt"
                className="w-full rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setReceiptImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>

              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Processing receipt...</p>
                  </div>
                </div>
              )}

              {ocrConfidence !== null && (
                <Badge
                  variant={ocrConfidence > 70 ? "default" : "secondary"}
                  className="absolute bottom-2 right-2"
                >
                  {Math.round(ocrConfidence)}% confidence
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Vendor name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map(code => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_card">Company Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="personal">Personal (Reimbursement)</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes about this expense..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          onClick={saveExpense}
          disabled={isSaving || !selectedProject || !amount || !category}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Expense
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MobileExpenseCapture;
