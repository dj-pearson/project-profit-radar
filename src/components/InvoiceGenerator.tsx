import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputFormField, SelectFormField, TextareaFormField } from '@/components/forms/FormFields';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  blankInvoiceLine,
  buildInvoiceRequest,
  invoiceFormSchema,
  type InvoiceFormValues,
  type InvoiceLineValues,
} from '@/lib/validations/invoices';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { downloadInvoicePDF } from '@/utils/invoicePDFGenerator';
import { ContactPicker } from '@/components/customers/ContactPicker';
import { LineTaxSelect } from '@/components/billing/LineTaxSelect';
import { useBillingDefaults } from '@/hooks/useBillingDefaults';
import {
  computeTax, newInvoiceDefaults, taxBreakdownLabel, FALLBACK_BILLING_DEFAULTS,
} from '@/lib/companyBilling';

type LineItem = InvoiceLineValues;
const blankLine = blankInvoiceLine;

// Before the company's settings arrive: exactly what this form always started
// with (Net 30, no tax). Replaced by the company's own defaults once loaded.
const initialDefaults = () => newInvoiceDefaults(FALLBACK_BILLING_DEFAULTS);

interface InvoiceGeneratorProps {
  projectId?: string;
  onInvoiceCreated?: (invoice: any) => void;
}

const InvoiceGenerator = ({ projectId, onInvoiceCreated }: InvoiceGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [_costCodes, setCostCodes] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  // US-332: payment terms, tax rate and terms come from Company Settings >
  // Billing and documents rather than a hardcoded 30 days and zero tax.
  const { defaults: billing, loaded: billingLoaded, error: billingError } = useBillingDefaults();
  const appliedBillingDefaults = useRef(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client_id: null,
      client_name: '',
      client_email: '',
      project_id: projectId || '',
      ...initialDefaults(),
      discount_amount: 0,
      notes: '',
      line_items: [blankLine()],
    },
  });
  const invoiceData = form.watch();
  const lineItems = invoiceData.line_items;
  const lineErrors = form.formState.errors.line_items;
  const setLineItems = (next: LineItem[]) =>
    form.setValue('line_items', next, { shouldValidate: form.formState.isSubmitted });
  const setFields = (patch: Partial<InvoiceFormValues>) => {
    for (const [key, value] of Object.entries(patch)) {
      form.setValue(key as keyof InvoiceFormValues, value as never, {
        shouldValidate: form.formState.isSubmitted,
      });
    }
  };

  // Apply the company's defaults once they load, to whichever of the three
  // fields the user has not already changed.
  useEffect(() => {
    if (!billingLoaded || appliedBillingDefaults.current) return;
    appliedBillingDefaults.current = true;
    const initial = initialDefaults();
    const next = newInvoiceDefaults(billing);
    const prev = form.getValues();
    form.setValue('due_date', prev.due_date === initial.due_date ? next.due_date : prev.due_date);
    form.setValue('tax_rate', prev.tax_rate === initial.tax_rate ? next.tax_rate : prev.tax_rate);
    form.setValue('terms', prev.terms === initial.terms ? next.terms : prev.terms);
  }, [billingLoaded, billing, form]);

  useEffect(() => {
    loadProjects();
    loadCostCodes();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id, client_name, client_email')
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
      setFields({
        project_id: projectId,
        // The project knows who the customer is. Copying only the two strings
        // is what left every invoice from this form unlinked (US-326).
        client_id: project.client_id ?? form.getValues('client_id'),
        client_name: project.client_name || '',
        client_email: project.client_email || '',
      });
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, blankLine()]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = <K extends keyof LineItem>(index: number, field: K, value: LineItem[K]) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Per line, rounded per rate: the same arithmetic generate-invoice stores.
  const taxTotals = computeTax(
    lineItems.map(item => ({
      amount: item.quantity * item.unit_price,
      taxRate: item.tax_rate,
      taxable: item.taxable,
    })),
    invoiceData.tax_rate,
  );

  const calculateSubtotal = () => taxTotals.subtotal;

  const calculateTax = () => taxTotals.taxAmount;

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - invoiceData.discount_amount;
  };

  const handleSubmit = async (values: InvoiceFormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: buildInvoiceRequest(values),
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
        form.reset({
          client_id: null,
          client_name: '',
          client_email: '',
          project_id: '',
          ...newInvoiceDefaults(billing),
          discount_amount: 0,
          notes: '',
          line_items: [blankLine()],
        });
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
      // tax_rate and taxable are US-332 columns the generated types predate.
      const lines = invoiceWithDetails.line_items as Array<{
        description: string; quantity: number; unit_price: number; line_total: number | null;
        tax_rate?: number | null; taxable?: boolean;
      }>;
      const breakdown = computeTax(
        lines.map(item => ({
          amount: item.quantity * item.unit_price,
          taxRate: item.tax_rate ?? null,
          taxable: item.taxable,
        })),
        Number(invoiceWithDetails.tax_rate) || 0,
      ).byRate;

      const pdfData = {
        ...invoiceWithDetails,
        project_name: invoiceWithDetails.project?.name || null,
        line_items: lines.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total || item.quantity * item.unit_price,
        })),
        tax_breakdown: breakdown.map(g => ({
          label: taxBreakdownLabel(g, billing.taxRates), tax: g.tax,
        })),
      };

      // Generate and download PDF, with the company's own name and licence
      // line rather than the Brikly placeholder.
      downloadInvoicePDF(pdfData, billing.company ?? undefined, `invoice-${invoiceWithDetails.invoice_number}.pdf`);

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
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6" aria-label="Generate invoice form">
          {billingError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load your billing settings, so the tax rate and terms here are not your
              company defaults. Check them before sending.
            </p>
          )}
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectFormField
              control={form.control}
              name="project_id"
              label="Project (Optional)"
              placeholder="Select a project"
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              onValueChange={handleProjectChange}
            />
            <InputFormField control={form.control} name="due_date" label="Due Date" type="date" aria-required="true" />
          </div>

          {/* Estimates and projects have had a customer picker since US-326;
              invoices did not, so the one document the customer actually
              receives was the only one that could not be linked to them. */}
          <ContactPicker
            value={invoiceData.client_id}
            onChange={(contact) =>
              setFields({
                client_id: contact?.id ?? null,
                client_name: contact ? contact.name : form.getValues('client_name'),
                client_email: contact ? contact.email || '' : form.getValues('client_email'),
              })
            }
            label="Customer"
            hint="Everything for this customer links to one record."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputFormField
              control={form.control}
              name="client_name"
              label="Client Name"
              readOnly={!!invoiceData.client_id}
              aria-required="true"
            />
            <InputFormField
              control={form.control}
              name="client_email"
              label="Client Email"
              type="email"
              readOnly={!!invoiceData.client_id}
              aria-required="true"
            />
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
              {lineItems.map((item, index) => {
                const descError = lineErrors?.[index]?.description?.message;
                const priceError = lineErrors?.[index]?.unit_price?.message;
                const qtyError = lineErrors?.[index]?.quantity?.message;
                return (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 md:col-span-4">
                    <Label htmlFor={`line-description-${index}`}>Description</Label>
                    <Input
                      id={`line-description-${index}`}
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      aria-invalid={descError ? true : undefined}
                      aria-describedby={descError ? `line-description-${index}-error` : undefined}
                    />
                    {descError && (
                      <p id={`line-description-${index}-error`} className="text-sm font-medium text-destructive mt-1">{descError}</p>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label htmlFor={`line-quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`line-quantity-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      aria-invalid={qtyError ? true : undefined}
                      aria-describedby={qtyError ? `line-quantity-${index}-error` : undefined}
                    />
                    {qtyError && (
                      <p id={`line-quantity-${index}-error`} className="text-sm font-medium text-destructive mt-1">{qtyError}</p>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label htmlFor={`line-price-${index}`}>Unit Price</Label>
                    <Input
                      id={`line-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      aria-invalid={priceError ? true : undefined}
                      aria-describedby={priceError ? `line-price-${index}-error` : undefined}
                    />
                    {priceError && (
                      <p id={`line-price-${index}-error`} className="text-sm font-medium text-destructive mt-1">{priceError}</p>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label htmlFor={`line-tax-${index}`}>Tax</Label>
                    <LineTaxSelect
                      id={`line-tax-${index}`}
                      label={`Tax for line ${index + 1}`}
                      value={item}
                      documentRate={invoiceData.tax_rate}
                      rates={billing.taxRates}
                      onChange={(tax) => {
                        const updated = [...lineItems];
                        updated[index] = { ...updated[index], ...tax };
                        setLineItems(updated);
                      }}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Label>Total</Label>
                    <div className="h-9 flex items-center px-2 border rounded bg-muted text-sm">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
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
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totals and Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice tax rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {taxTotals.byRate.length > 1 ? (
                taxTotals.byRate.map(group => (
                  <div key={group.rate} className="flex justify-between">
                    <span>{taxBreakdownLabel(group, billing.taxRates)}:</span>
                    <span>${group.tax.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>Tax ({taxTotals.byRate[0]?.rate ?? invoiceData.tax_rate}%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
              )}
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
            <TextareaFormField control={form.control} name="notes" label="Notes" placeholder="Additional notes for this invoice" rows={3} />
            <TextareaFormField control={form.control} name="terms" label="Terms & Conditions" placeholder="Payment terms and conditions" rows={3} />
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
        </Form>

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