import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileText, Download, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { downloadInvoicePDF } from '@/utils/invoicePDFGenerator';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  cost_code_id?: string;
  project_phase_id?: string;
}

interface InvoiceGeneratorProps {
  projectId?: string;
  onInvoiceCreated?: (invoice: any) => void;
}

const InvoiceGenerator = ({ projectId, onInvoiceCreated }: InvoiceGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [costCodes, setCostCodes] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const [invoiceData, setInvoiceData] = useState({
    client_name: '',
    client_email: '',
    project_id: projectId || '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    tax_rate: 0,
    discount_amount: 0,
    notes: '',
    terms: 'Payment is due within 30 days of invoice date.'
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => {
    loadProjects();
    loadCostCodes();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, client_email')
        .order('created_at', { ascending: false });

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
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setCostCodes(data || []);
    } catch (error) {
      console.error('Error loading cost codes:', error);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setInvoiceData(prev => ({
        ...prev,
        project_id: projectId,
        client_name: project.client_name || '',
        client_email: project.client_email || ''
      }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (invoiceData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - invoiceData.discount_amount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Validate required fields
      if (!invoiceData.client_name || !invoiceData.client_email) {
        throw new Error('Client name and email are required');
      }

      if (lineItems.some(item => !item.description || item.unit_price <= 0)) {
        throw new Error('All line items must have description and positive unit price');
      }

      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          ...invoiceData,
          line_items: lineItems.filter(item => item.description.trim() !== '')
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Invoice Generated",
          description: `Invoice ${data.invoice.invoice_number} has been created successfully. You can now download the PDF.`,
        });

        // Store the created invoice for PDF generation
        setLastCreatedInvoice(data.invoice);

        onInvoiceCreated?.(data.invoice);

        // Reset form
        setInvoiceData({
          client_name: '',
          client_email: '',
          project_id: '',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax_rate: 0,
          discount_amount: 0,
          notes: '',
          terms: 'Payment is due within 30 days of invoice date.'
        });
        setLineItems([{ description: '', quantity: 1, unit_price: 0 }]);
      }

    } catch (error) {
      console.error('Invoice generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!lastCreatedInvoice) return;

    setGeneratingPDF(true);
    try {
      // Fetch complete invoice with line items and project info
      const { data: invoiceWithDetails, error } = await supabase
        .from('invoices')
        .select(`
          *,
          line_items:invoice_line_items(*),
          project:projects(name)
        `)
        .eq('id', lastCreatedInvoice.id)
        .single();

      if (error) throw error;

      // Prepare data for PDF generator
      const pdfData = {
        ...invoiceWithDetails,
        project_name: invoiceWithDetails.project?.name || null,
        line_items: invoiceWithDetails.line_items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total || item.quantity * item.unit_price,
        })),
      };

      // Generate and download PDF
      downloadInvoicePDF(pdfData, undefined, `invoice-${invoiceWithDetails.invoice_number}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoiceWithDetails.invoice_number} PDF has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF",
        variant: "destructive"
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-construction-orange" />
          Generate Invoice
        </CardTitle>
        <CardDescription>
          Create a new invoice for your clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project">Project (Optional)</Label>
              <Select 
                value={invoiceData.project_id} 
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
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
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={invoiceData.due_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={invoiceData.client_name}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, client_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="client_email">Client Email</Label>
              <Input
                id="client_email"
                type="email"
                value={invoiceData.client_email}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, client_email: e.target.value }))}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button type="button" onClick={addLineItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Total</Label>
                    <div className="h-9 flex items-center px-3 border rounded bg-muted">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals and Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={invoiceData.tax_rate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="discount_amount">Discount Amount ($)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceData.discount_amount}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({invoiceData.tax_rate}%):</span>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-${invoiceData.discount_amount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this invoice"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={invoiceData.terms}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                placeholder="Payment terms and conditions"
                rows={3}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || calculateTotal() <= 0}
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
            size="lg"
          >
            <FileText className="mr-2 h-5 w-5" />
            {loading ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </form>

        {/* PDF Download Section - Shows after invoice creation */}
        {lastCreatedInvoice && (
          <div className="mt-6 pt-6 border-t">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Invoice Created Successfully!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Invoice #{lastCreatedInvoice.invoice_number} has been created.
                    Download the PDF or create a new invoice.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                  onClick={handleGeneratePDF}
                  disabled={generatingPDF}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
                </Button>

                <Button
                  onClick={() => setLastCreatedInvoice(null)}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Another Invoice
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceGenerator;