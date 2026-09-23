import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadEstimatePDF } from "@/utils/estimatePDFGenerator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { ContactPicker } from "@/components/customers/ContactPicker";
import { useToast } from "@/hooks/use-toast";
import { EstimateTemplatesLibrary } from "./EstimateTemplatesLibrary";
import { LineItemLibraryBrowser } from "./LineItemLibraryBrowser";
import { EstimateVersionHistory } from "@/components/estimates/EstimateVersionHistory";
import { createEstimateVersion } from "@/services/estimateVersions";
import { History } from "lucide-react";
import { useBillingDefaults } from "@/hooks/useBillingDefaults";
import { computeTax, taxBreakdownLabel } from "@/lib/companyBilling";
import {
  estimateSchema,
  type EstimateFormData,
  type LineItem,
  type LineTaxColumns,
} from "./estimate-form/types";
import { EstimateTemplateBanner } from "./estimate-form/EstimateTemplateBanner";
import { EstimateBasicInfoCard } from "./estimate-form/EstimateBasicInfoCard";
import { EstimateLineItemsCard } from "./estimate-form/EstimateLineItemsCard";
import { EstimatePricingCard } from "./estimate-form/EstimatePricingCard";
import { EstimateNotesCard } from "./estimate-form/EstimateNotesCard";
import { EstimateCreatedPanel } from "./estimate-form/EstimateCreatedPanel";

interface EstimateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  estimateId?: string;
}

export function EstimateForm({ onSuccess, onCancel, estimateId }: EstimateFormProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [costCodes, setCostCodes] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [createdEstimate, setCreatedEstimate] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLineItemLibrary, setShowLineItemLibrary] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | undefined>();
  // US-332: tax rate and terms from Company Settings > Billing and documents.
  const { defaults: billing, loaded: billingLoaded, error: billingError } = useBillingDefaults();
  const appliedBillingDefaults = useRef(false);

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      markup_percentage: 20,
      tax_percentage: 0,
      discount_amount: 0,
    },
  });

  // A new estimate starts from the company's tax rate and estimate terms,
  // unless the user or a template has already filled them in.
  useEffect(() => {
    if (estimateId || !billingLoaded || appliedBillingDefaults.current) return;
    appliedBillingDefaults.current = true;
    if (!form.getFieldState("tax_percentage").isDirty && !form.getValues("tax_percentage")) {
      form.setValue("tax_percentage", billing.taxRate);
    }
    if (!form.getValues("terms_and_conditions") && billing.terms.estimate) {
      form.setValue("terms_and_conditions", billing.terms.estimate);
    }
  }, [estimateId, billingLoaded, billing, form]);

  useEffect(() => {
    fetchProjects();
    fetchCostCodes();
    fetchCompanyId();
    if (estimateId) {
      fetchEstimate();
    }
  }, [estimateId]);

  const fetchCompanyId = async () => {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (userProfile?.company_id) {
      setCompanyId(userProfile.company_id);
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, client_name")
      .eq("status", "active")
      .order("name");
    
    if (data) setProjects(data);
  };

  const fetchCostCodes = async () => {
    const { data } = await supabase
      .from("cost_codes")
      .select("*")
      .eq("is_active", true)
      .order("code");
    
    if (data) setCostCodes(data);
  };

  const fetchEstimate = async () => {
    if (!estimateId) return;

    const { data: estimate } = await supabase
      .from("estimates")
      .select("*, estimate_line_items(*)")
      .eq("id", estimateId)
      .single();

    if (estimate) {
      form.reset({
        title: estimate.title,
        description: estimate.description || "",
        client_name: estimate.client_name || "",
        client_email: estimate.client_email || "",
        client_phone: estimate.client_phone || "",
        site_address: estimate.site_address || "",
        project_id: estimate.project_id || "",
        markup_percentage: estimate.markup_percentage || 20,
        tax_percentage: estimate.tax_percentage || 0,
        discount_amount: estimate.discount_amount || 0,
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        notes: estimate.notes || "",
        terms_and_conditions: estimate.terms_and_conditions || "",
      });

      // Restore the linked customer so editing does not silently unlink them.
      setClientId(estimate.client_id || null);

      if (estimate.estimate_line_items) {
        setLineItems(estimate.estimate_line_items.map((item: any) => ({
          id: item.id,
          item_name: item.item_name,
          description: item.description || "",
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          category: item.category || "",
          cost_code_id: item.cost_code_id || defaultCostCodeFor(item.category || ""),
          tax_rate: (item as LineTaxColumns).tax_rate ?? null,
          taxable: (item as LineTaxColumns).taxable !== false,
        })));
      }
    }
  };

  /**
   * Best-effort cost code for a line, so an existing estimate opened for edit
   * arrives with something sensible selected rather than blank. It matches the
   * line's free-text category against the company's cost codes (the seeded
   * list from US-317 uses these category names), then falls back to the
   * General code. The choice is always visible in the row, so the user sees
   * and can correct it before saving - a silent mis-assignment would land in
   * the project budget and be much harder to spot later.
   */
  const defaultCostCodeFor = (category: string): string => {
    if (!category || costCodes.length === 0) return "";
    const wanted = category.trim().toLowerCase();
    const byCategory = costCodes.find(
      (c) => (c.category || "").trim().toLowerCase() === wanted,
    );
    if (byCategory) return byCategory.id;
    const byName = costCodes.find(
      (c) => (c.name || "").trim().toLowerCase() === wanted,
    );
    if (byName) return byName.id;
    const general = costCodes.find((c) => c.code === "01-100");
    return general?.id || "";
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      item_name: "",
      description: "",
      quantity: 1,
      unit: "each",
      unit_cost: 0,
      category: "",
      cost_code_id: "",
      tax_rate: null,
      taxable: true,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleTemplateSelect = (template: any) => {
    // Apply template to form
    form.setValue('title', template.default_title || '');
    form.setValue('markup_percentage', template.default_markup_percentage || 20);
    // A template without its own tax rate or terms keeps the company's.
    form.setValue('tax_percentage', template.default_tax_percentage ?? billing.taxRate);
    form.setValue('terms_and_conditions', template.default_terms_and_conditions || billing.terms.estimate || '');

    // Set valid_until date based on template valid_days
    if (template.valid_days) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + template.valid_days);
      form.setValue('valid_until', validUntil);
    }

    // Add template line items
    if (template.line_items && template.line_items.length > 0) {
      const newItems = template.line_items.map((item: any) => ({
        id: `template-${Date.now()}-${Math.random()}`,
        item_name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        category: item.category || '',
        cost_code_id: item.cost_code_id || defaultCostCodeFor(item.category || ''),
        tax_rate: null,
        taxable: true,
      }));
      setLineItems(newItems);
    }

    setAppliedTemplate(template.name);
    toast({
      title: 'Template Applied',
      description: `${template.name} with ${template.line_items?.length || 0} line items`
    });
  };

  const handleAddLibraryItems = (items: any[]) => {
    const newItems = items.map(item => ({
      id: `library-${Date.now()}-${Math.random()}`,
      item_name: item.item_name,
      description: item.description || '',
      quantity: item.default_quantity,
      unit: item.default_unit,
      unit_cost: item.default_unit_cost,
      category: item.category || '',
      cost_code_id: item.cost_code_id || defaultCostCodeFor(item.category || ''),
      tax_rate: null,
      taxable: true,
    }));
    setLineItems([...lineItems, ...newItems]);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  /**
   * Tax per line on the marked-up amount, rounded per rate (US-332). Same
   * base as before - subtotal plus markup, discount taken after - so an
   * estimate with no per-line rates totals exactly what it did.
   */
  const calculateTaxTotals = () => {
    const markupFactor = 1 + (form.watch("markup_percentage") || 0) / 100;
    return computeTax(
      lineItems.map((item) => ({
        amount: item.quantity * item.unit_cost * markupFactor,
        taxRate: item.tax_rate,
        taxable: item.taxable,
      })),
      form.watch("tax_percentage") || 0,
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const markup = subtotal * (form.watch("markup_percentage") || 0) / 100;
    const tax = calculateTaxTotals().taxAmount;
    const discount = form.watch("discount_amount") || 0;
    return subtotal + markup + tax - discount;
  };

  const onSubmit = async (data: EstimateFormData, isDraft = true) => {
    // A line without a cost code cannot become a budget line: cost_code_id is
    // NOT NULL on project_budgets. Catching it here, where the user can see
    // which line is missing one, beats discovering it at conversion (US-318).
    const uncoded = lineItems.filter((item) => !item.cost_code_id);
    if (uncoded.length > 0 && costCodes.length > 0) {
      toast({
        variant: "destructive",
        title: "Every line needs a cost code",
        description:
          `${uncoded.length} line${uncoded.length === 1 ? "" : "s"} still need one. ` +
          "The cost code is what carries this estimate into the project's budget.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get user's company ID from user profile
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error("User company not found");
      }

      // Create or update estimate
      const estimateData = {
        title: data.title,
        description: data.description,
        client_id: clientId || null,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        site_address: data.site_address,
        project_id: data.project_id || null,
        company_id: userProfile.company_id,
        status: isDraft ? "draft" : "sent",
        total_amount: calculateTotal(),
        markup_percentage: data.markup_percentage,
        tax_percentage: data.tax_percentage,
        discount_amount: data.discount_amount,
        sent_date: isDraft ? null : new Date().toISOString().split('T')[0],
        valid_until: data.valid_until?.toISOString().split('T')[0] || null,
        notes: data.notes,
        terms_and_conditions: data.terms_and_conditions,
      };

      // Stored so the PDF prints the tax the form showed rather than
      // recomputing it on a different base. estimates.tax_amount is a US-332
      // column the generated types predate, hence the cast back to the known
      // shape.
      const estimateWrite = {
        ...estimateData,
        tax_amount: calculateTaxTotals().taxAmount,
      } as typeof estimateData;

      let estimateResult;
      if (estimateId) {
        estimateResult = await supabase
          .from("estimates")
          .update(estimateWrite)
          .eq("id", estimateId)
          .select()
          .single();
      } else {
        estimateResult = await supabase
          .from("estimates")
          .insert({
            ...estimateWrite,
            estimate_number: '', // Will be auto-generated by trigger
          })
          .select()
          .single();
      }

      if (estimateResult.error) throw estimateResult.error;

      const estimate = estimateResult.data;

      // Handle line items
      if (estimateId) {
        // Delete existing line items. The insert below runs regardless, so a
        // silently failed delete leaves the old rows in place alongside the new
        // ones and the estimate total doubles - on a document the customer
        // sees. supabase-js returns this error rather than throwing it, so it
        // has to be read (US-300).
        const { error: deleteError } = await supabase
          .from("estimate_line_items")
          .delete()
          .eq("estimate_id", estimateId);
        if (deleteError) {
          throw new Error(
            `Could not clear the previous line items (${deleteError.message}). ` +
              `Nothing was saved - saving now would duplicate every line and double the total.`,
          );
        }
      }

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsData = lineItems.map((item, index) => ({
          estimate_id: estimate.id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          category: item.category,
          cost_code_id: item.cost_code_id || null,
          sort_order: index,
        }));
        // tax_rate and taxable are US-332 columns the generated types predate.
        const lineItemsWithTax = lineItems.map((item, index) => ({
          ...lineItemsData[index],
          tax_rate: item.tax_rate,
          taxable: item.taxable,
        })) as typeof lineItemsData;

        const { error: lineItemsError } = await supabase
          .from("estimate_line_items")
          .insert(lineItemsWithTax);

        if (lineItemsError) throw lineItemsError;
      }

      // US-096: capture an immutable version snapshot of this save.
      {
        const { data: authData } = await supabase.auth.getUser();
        await createEstimateVersion({
          estimateId: estimate.id,
          companyId: estimate.company_id ?? userProfile.company_id,
          userId: authData.user?.id,
          snapshot: {
            title: data.title,
            status: estimateData.status,
            markup_percentage: data.markup_percentage,
            tax_percentage: data.tax_percentage,
            discount_amount: data.discount_amount,
            notes: data.notes,
            lineItems: lineItems.map((it) => ({
              id: it.id,
              item_name: it.item_name,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unit_cost: it.unit_cost,
              category: it.category,
            })),
          },
        });
      }

      toast({
        title: isDraft ? "Estimate Saved" : "Estimate Sent",
        description: isDraft
          ? "Estimate has been saved as draft. You can now download the PDF."
          : "Estimate has been sent to client. You can now download the PDF.",
      });

      // Store created estimate for PDF generation
      setCreatedEstimate(estimate);
    } catch (error) {
      console.error("Error saving estimate:", error);
      toast({
        title: "Error",
        description: "Failed to save estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!createdEstimate) return;

    setGeneratingPDF(true);
    try {
      // Fetch complete estimate with line items
      const { data: estimateWithDetails, error } = await supabase
        .from('estimates')
        .select(`
          *,
          line_items:estimate_line_items(*),
          project:projects(name)
        `)
        .eq('id', createdEstimate.id)
        .single();

      if (error) throw error;

      // Prepare data for PDF generator
      const detailLines = estimateWithDetails.line_items as Array<
        { quantity: number; unit_cost: number } & LineTaxColumns
      >;
      const savedMarkup = 1 + (Number(estimateWithDetails.markup_percentage) || 0) / 100;
      const byRate = computeTax(
        detailLines.map((item) => ({
          amount: item.quantity * item.unit_cost * savedMarkup,
          taxRate: item.tax_rate ?? null,
          taxable: item.taxable,
        })),
        Number(estimateWithDetails.tax_percentage) || 0,
      ).byRate;

      const pdfData = {
        ...estimateWithDetails,
        tax_amount: (estimateWithDetails as { tax_amount?: number | null }).tax_amount ?? null,
        tax_breakdown: byRate.map((g) => ({ label: taxBreakdownLabel(g, billing.taxRates), tax: g.tax })),
        project_name: estimateWithDetails.project?.name || null,
        line_items: estimateWithDetails.line_items.map((item: any) => ({
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost || item.quantity * item.unit_cost,
          category: item.category,
          labor_cost: item.labor_cost,
          material_cost: item.material_cost,
          equipment_cost: item.equipment_cost,
        })),
      };

      // Generate and download PDF
      downloadEstimatePDF(pdfData, billing.company ?? undefined, `estimate-${estimateWithDetails.estimate_number}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: `Estimate ${estimateWithDetails.estimate_number} PDF has been downloaded successfully.`,
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

  const handleClose = () => {
    setCreatedEstimate(null);
    onSuccess();
  };

  // Watched once per render for the line tax selects and the totals.
  const markupPercentage = form.watch("markup_percentage") || 0;
  const taxPercentage = form.watch("tax_percentage") || 0;
  const discountAmount = form.watch("discount_amount") || 0;
  const taxTotals = calculateTaxTotals();

  return (
    <Form {...form}>
      <form className="space-y-6">
        {billingError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load your billing settings, so the tax rate and terms here are not your
            company defaults. Check them before sending.
          </p>
        )}
        {/* US-096: version history (editing an existing estimate) */}
        {estimateId && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
              <History className="mr-1 h-4 w-4" aria-hidden="true" /> Version History
            </Button>
          </div>
        )}
        {estimateId && (
          <EstimateVersionHistory
            estimateId={estimateId}
            companyId={companyId}
            open={showVersionHistory}
            onOpenChange={setShowVersionHistory}
          />
        )}

        {/* Template Selector */}
        <EstimateTemplateBanner
          appliedTemplate={appliedTemplate}
          onChooseTemplate={() => setShowTemplates(true)}
        />

        {/* Basic Information */}
        <EstimateBasicInfoCard form={form} projects={projects} />

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* US-326: pick the customer, do not retype them. The three text
                fields below are still saved for one release because iOS reads
                them, but the id is what links this estimate to the project,
                the invoice and the portal enrolment for the same person. */}
            <ContactPicker
              value={clientId}
              onChange={(contact) => {
                setClientId(contact?.id ?? null);
                if (contact) {
                  form.setValue('client_name', contact.name, { shouldValidate: true });
                  form.setValue('client_email', contact.email || '', { shouldValidate: true });
                  form.setValue('client_phone', contact.phone || '');
                }
              }}
              label="Customer"
              hint="Everything for this customer links to one record."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" readOnly={!!clientId} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <EstimateLineItemsCard
          lineItems={lineItems}
          costCodes={costCodes}
          documentTaxRate={taxPercentage}
          taxRates={billing.taxRates}
          onAdd={addLineItem}
          onBrowseLibrary={() => setShowLineItemLibrary(true)}
          onUpdate={updateLineItem}
          onRemove={removeLineItem}
          onTaxChange={(index, tax) => {
            const updatedItems = [...lineItems];
            updatedItems[index] = { ...updatedItems[index], ...tax };
            setLineItems(updatedItems);
          }}
        />

        {/* Pricing */}
        <EstimatePricingCard
          form={form}
          subtotal={calculateSubtotal()}
          markupPercentage={markupPercentage}
          taxPercentage={taxPercentage}
          discountAmount={discountAmount}
          taxTotals={taxTotals}
          total={calculateTotal()}
          taxRates={billing.taxRates}
        />

        {/* Notes */}
        <EstimateNotesCard form={form} />

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
            disabled={isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit((data) => onSubmit(data, false))}
            disabled={isLoading}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send Estimate
          </Button>
        </div>
      </form>

      {/* PDF Download Section - Shows after estimate creation */}
      {createdEstimate && (
        <EstimateCreatedPanel
          estimateNumber={createdEstimate.estimate_number}
          generatingPDF={generatingPDF}
          onDownloadPDF={handleGeneratePDF}
          onClose={handleClose}
        />
      )}

      {/* Template Library Modal */}
      <EstimateTemplatesLibrary
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onSelectTemplate={handleTemplateSelect}
        companyId={companyId}
      />

      {/* Line Item Library Modal */}
      <LineItemLibraryBrowser
        open={showLineItemLibrary}
        onOpenChange={setShowLineItemLibrary}
        onAddItems={handleAddLibraryItems}
        companyId={companyId}
      />
    </Form>
  );
}