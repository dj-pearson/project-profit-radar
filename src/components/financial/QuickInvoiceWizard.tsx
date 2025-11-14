/**
 * Quick Invoice Wizard
 * Streamlined 3-step wizard for creating invoices quickly
 * Optimized for mobile and desktop with smart defaults
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  DollarSign,
  Send,
  Plus,
  Trash2,
  Zap,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuickInvoiceWizardProps {
  projectId?: string;
  onComplete?: (invoice: any) => void;
  onCancel?: () => void;
}

export const QuickInvoiceWizard: React.FC<QuickInvoiceWizardProps> = ({
  projectId,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  // Form state
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 }
  ]);

  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('net_30');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      if (project) {
        setClientName(project.client_name || '');
        setClientEmail(project.client_email || '');
      }
    }
  }, [selectedProject, projects]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, client_email, status')
        .eq('company_id', userProfile.company_id)
        .in('status', ['active', 'in_progress', 'on_hold'])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(item => parseInt(item.id)), 0) + 1).toString();
    setLineItems([...lineItems, { id: newId, description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discountAmount;
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return selectedProject && clientName && clientEmail;
      case 2:
        return lineItems.every(item => item.description && item.quantity > 0 && item.unit_price >= 0);
      case 3:
        return dueDate;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (isStepValid()) {
      setStep(step + 1);
    } else {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const createInvoice = async () => {
    if (!user?.id || !userProfile?.company_id) return;

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = calculateTotal();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: userProfile.company_id,
          project_id: selectedProject,
          client_name: clientName,
          client_email: clientEmail,
          invoice_number: `INV-${Date.now()}`, // Simple invoice numbering
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: tax,
          discount_amount: discountAmount,
          total_amount: total,
          status: 'draft',
          notes: notes,
          payment_terms: paymentTerms,
          created_by: user.id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItemsData = lineItems.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        line_order: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      toast({
        title: '✓ Invoice Created',
        description: `Invoice for ${clientName} has been created successfully`,
      });

      onComplete?.(invoice);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    return (step / 3) * 100;
  };

  const getPaymentTermsLabel = (value: string) => {
    const terms: Record<string, string> = {
      'due_on_receipt': 'Due on Receipt',
      'net_15': 'Net 15',
      'net_30': 'Net 30',
      'net_60': 'Net 60',
      'net_90': 'Net 90'
    };
    return terms[value] || value;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Quick Invoice Wizard</CardTitle>
                <CardDescription>Create invoices in 3 simple steps</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Step {step} of 3
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={getProgressPercentage()} className="h-2" />

          {/* Step indicators */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 1 ? 'bg-blue-600 text-white' : step === 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {step > 1 ? <Check className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Client & Project</span>
            </div>

            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 2 ? 'bg-blue-600 text-white' : step === 2 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {step > 2 ? <Check className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">Line Items</span>
            </div>

            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 3 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                3
              </div>
              <span className="text-sm font-medium">Details & Send</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Client & Project */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Project and Client
            </CardTitle>
            <CardDescription>Choose the project you're invoicing for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project">Project *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
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
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label htmlFor="client-email">Client Email *</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Invoice Items
                </CardTitle>
                <CardDescription>Add the services or products you're billing for</CardDescription>
              </div>
              <Button onClick={addLineItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Item {index + 1}</span>
                  {lineItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label htmlFor={`desc-${item.id}`}>Description *</Label>
                    <Input
                      id={`desc-${item.id}`}
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Service or product description"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`qty-${item.id}`}>Quantity *</Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`price-${item.id}`}>Unit Price *</Label>
                    <Input
                      id={`price-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="mt-2 text-right">
                  <span className="text-sm text-gray-600">Total: </span>
                  <span className="text-lg font-semibold">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {/* Subtotal */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg">
                <span className="font-medium">Subtotal:</span>
                <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Details & Send */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Invoice Details
            </CardTitle>
            <CardDescription>Set payment terms and finalize the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due-date">Due Date *</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="net_90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="discount">Discount ($)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the client..."
                rows={3}
              />
            </div>

            {/* Invoice Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Invoice Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax ({taxRate}%):</span>
                      <span>${calculateTax().toFixed(2)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {step === 1 && onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {step < 3 && (
            <Button onClick={nextStep} disabled={!isStepValid()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={createInvoice} disabled={loading || !isStepValid()}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickInvoiceWizard;
