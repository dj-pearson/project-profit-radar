/**
 * Tax, numbering, payment terms, licence and terms (US-332).
 *
 * None of this existed. No tax_rates table or default_tax_rate column anywhere
 * in src or migrations; invoice numbers from a global sequence with a
 * hardcoded 'INV-' prefix, so two companies interleave and each sees gaps in
 * its own numbering; the licence column present since the CSV import templates
 * were written and no UI to set it; terms and conditions only inside estimate
 * templates, so an invoice had none.
 *
 * Its own card with its own load and save, rather than nine more fields
 * threaded through CompanySettings' single state object - these save against
 * three tables and one of them (numbering) is restricted to admins and
 * accounting.
 *
 * What is saved here is what new documents start from: useBillingDefaults
 * reads it for the invoice and estimate forms, the conversion and billing
 * paths, and the PDF header.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Trash2, FileText, AlertCircle } from 'lucide-react';
import {
  formatDocumentNumber, dueDateFrom, paymentTermsLabel, insuranceExpired,
  billingSettingsSchema, numberFormatSchema, EMPTY_BILLING_SETTINGS,
  DOCUMENT_TYPE_LABELS, type DocumentType, type BillingSettingsValues, type NamedTaxRate,
} from '@/lib/companyBilling';
import { billingDefaultsKey } from '@/hooks/useBillingDefaults';
import { confirmAction } from "@/components/ui/confirm-dialog";

interface NumberSetting {
  doc_type: DocumentType;
  prefix: string;
  include_year: boolean;
  pad_width: number;
  next_number: number;
}

type NumberDraft = Omit<NumberSetting, 'doc_type'>;

const DOC_TYPES: DocumentType[] = ['invoice', 'estimate', 'change_order', 'purchase_order'];

/** Where each document type's numbers live, to check a new format against. */
const NUMBERED: Record<DocumentType, { table: string; column: string }> = {
  invoice: { table: 'invoices', column: 'invoice_number' },
  estimate: { table: 'estimates', column: 'estimate_number' },
  change_order: { table: 'change_orders', column: 'change_order_number' },
  purchase_order: { table: 'purchase_orders', column: 'po_number' },
};

const suggestedPrefix = (docType: DocumentType) =>
  ({ invoice: 'INV-', estimate: 'EST-', change_order: 'CO-', purchase_order: 'PO-' })[docType];

const draftFrom = (docType: DocumentType, row?: NumberSetting): NumberDraft => ({
  prefix: row?.prefix ?? suggestedPrefix(docType),
  include_year: row?.include_year ?? true,
  pad_width: row?.pad_width ?? 4,
  next_number: row?.next_number ?? 1,
});

export function CompanyBillingSettings() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = userProfile?.company_id;

  const form = useForm<BillingSettingsValues>({
    resolver: zodResolver(billingSettingsSchema),
    defaultValues: EMPTY_BILLING_SETTINGS,
  });

  const [taxRates, setTaxRates] = useState<NamedTaxRate[]>([]);
  const [numbering, setNumbering] = useState<NumberSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<DocumentType, NumberDraft>>(
    () => Object.fromEntries(DOC_TYPES.map((t) => [t, draftFrom(t)])) as Record<DocumentType, NumberDraft>
  );
  const [numberErrors, setNumberErrors] = useState<Partial<Record<DocumentType, string>>>({});
  const [loading, setLoading] = useState(true);

  // New documents read these through useBillingDefaults; tell it they moved.
  const refreshDefaults = useCallback(
    () => queryClient.invalidateQueries({ queryKey: billingDefaultsKey(companyId ?? undefined) }),
    [queryClient, companyId]
  );

  const loadedOnce = useRef(false);

  // Also called after a tax rate or numbering change. Those save on their
  // own, so a reload must not flash the skeleton or throw away unsaved edits
  // in the settings form above them.
  const load = useCallback(async () => {
    if (!companyId) return;
    if (!loadedOnce.current) setLoading(true);

    const [settingsRes, taxRes, numberRes] = await Promise.all([
      supabase
        .from('company_settings')
        .select('default_tax_rate, default_payment_terms_days, license_number, insurance_carrier, insurance_policy_number, insurance_expires_on, estimate_terms, invoice_terms, change_order_terms')
        .eq('company_id', companyId)
        .maybeSingle(),
      supabase
        .from('tax_rates')
        .select('id, name, rate, applies_to, is_default, is_active')
        .eq('company_id', companyId)
        .order('name'),
      supabase
        .from('document_number_settings')
        .select('doc_type, prefix, include_year, pad_width, next_number')
        .eq('company_id', companyId),
    ]);

    const failure = [settingsRes, taxRes, numberRes].find((r) => r.error)?.error;
    if (failure) {
      logger.error('Could not load billing settings', failure);
      toast({
        variant: 'destructive',
        title: 'Could not load billing settings',
        description: failure.message,
      });
    }

    if (settingsRes.data && !form.formState.isDirty) {
      const d = settingsRes.data;
      form.reset({
        default_tax_rate: Number(d.default_tax_rate) || 0,
        default_payment_terms_days: Number(d.default_payment_terms_days ?? 30),
        license_number: d.license_number || '',
        insurance_carrier: d.insurance_carrier || '',
        insurance_policy_number: d.insurance_policy_number || '',
        insurance_expires_on: d.insurance_expires_on || '',
        estimate_terms: d.estimate_terms || '',
        invoice_terms: d.invoice_terms || '',
        change_order_terms: d.change_order_terms || '',
      });
    }
    const rows = (numberRes.data || []) as NumberSetting[];
    setTaxRates((taxRes.data || []) as NamedTaxRate[]);
    setNumbering(rows);
    setDrafts(Object.fromEntries(
      DOC_TYPES.map((t) => [t, draftFrom(t, rows.find((r) => r.doc_type === t))])
    ) as Record<DocumentType, NumberDraft>);
    loadedOnce.current = true;
    setLoading(false);
  }, [companyId, toast, form]);

  useEffect(() => { void load(); }, [load]);

  const save = async (values: BillingSettingsValues) => {
    if (!companyId) return;

    const row = {
      company_id: companyId,
      ...values,
      insurance_expires_on: values.insurance_expires_on || null,
    };
    const { error } = await supabase
      .from('company_settings')
      // The generated Insert type has the Row's US-332 columns missing
      // (types.ts predates 20260903210000; US-369). Narrowed to the columns
      // it does know; the billing fields go through at runtime.
      .upsert(row as { company_id: string }, { onConflict: 'company_id' });

    if (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: error.message });
      return;
    }
    form.reset(values);
    void refreshDefaults();
    toast({
      title: 'Billing settings saved',
      description: `New invoices will be ${paymentTermsLabel(values.default_payment_terms_days).toLowerCase()}.`,
    });
  };

  // --- Named tax rates ------------------------------------------------------

  const addTaxRate = async () => {
    if (!companyId) return;
    const { error } = await supabase
      .from('tax_rates')
      .insert({
        company_id: companyId,
        name: `Rate ${taxRates.length + 1}`,
        rate: Number(form.getValues('default_tax_rate')) || 0,
        // Never default-on: the partial unique index refuses a second default,
        // so an added rate must not claim it.
        is_default: false,
      });
    if (error) {
      toast({ variant: 'destructive', title: 'Could not add that rate', description: error.message });
      return;
    }
    void load();
    void refreshDefaults();
  };

  const updateTaxRate = async (id: string, patch: Partial<NamedTaxRate>) => {
    if (patch.name !== undefined && !patch.name.trim()) {
      toast({ variant: 'destructive', title: 'A tax rate needs a name' });
      void load();
      return;
    }
    if (patch.rate !== undefined && !(patch.rate >= 0 && patch.rate <= 100)) {
      toast({ variant: 'destructive', title: 'A tax rate is a percentage between 0 and 100' });
      void load();
      return;
    }

    const previous = taxRates;
    setTaxRates((prev) => prev.map((t) => {
      if (t.id === id) return { ...t, ...patch };
      // One default at a time; the index refuses two.
      return patch.is_default ? { ...t, is_default: false } : t;
    }));

    // Clear the old default first, or the partial unique index refuses the new one.
    if (patch.is_default) {
      const { error: clearError } = await supabase
        .from('tax_rates')
        .update({ is_default: false })
        .eq('company_id', companyId as string)
        .eq('is_default', true)
        .neq('id', id);
      if (clearError) {
        setTaxRates(previous);
        toast({ variant: 'destructive', title: 'Could not change the default rate', description: clearError.message });
        return;
      }
    }

    const { error } = await supabase.from('tax_rates').update(patch).eq('id', id);
    if (error) {
      setTaxRates(previous);
      toast({ variant: 'destructive', title: 'Could not save that rate', description: error.message });
      return;
    }
    void refreshDefaults();
  };

  const removeTaxRate = async (id: string) => {
    if (!(await confirmAction({ title: 'Remove this tax rate?', confirmLabel: 'Remove', destructive: true }))) return;
    const { error } = await supabase.from('tax_rates').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not remove that rate', description: error.message });
      return;
    }
    void load();
    void refreshDefaults();
  };

  // --- Numbering ------------------------------------------------------------

  /**
   * Save one document type's numbering.
   *
   * Refuses a format whose next number is already on one of the company's
   * documents. The old shared sequence minted INV-2026-0001 style numbers, so
   * choosing prefix INV- with the year and starting at 1 would collide with
   * the company's own history on its very first invoice.
   *
   * Sends only the fields that changed on an existing row. Sending the whole
   * row would write back a next_number read before somebody else created an
   * invoice, which the database refuses as a rewind.
   */
  const saveNumbering = async (docType: DocumentType, draft: NumberDraft) => {
    if (!companyId) return;
    const existing = numbering.find((n) => n.doc_type === docType);

    const parsed = numberFormatSchema.safeParse(draft);
    if (!parsed.success) {
      setNumberErrors((e) => ({ ...e, [docType]: parsed.error.issues[0]?.message ?? 'Check this format' }));
      return;
    }
    const next = parsed.data;

    const changed = existing
      ? (Object.keys(next) as Array<keyof NumberDraft>).filter((k) => next[k] !== existing[k])
      : (Object.keys(next) as Array<keyof NumberDraft>);
    if (existing && changed.length === 0) {
      setNumberErrors((e) => ({ ...e, [docType]: undefined }));
      return;
    }

    const preview = formatDocumentNumber(
      { prefix: next.prefix, includeYear: next.include_year, padWidth: next.pad_width },
      next.next_number
    );
    const target = NUMBERED[docType];
    // The table name comes from a fixed map, so the typed client cannot see
    // which table this is; the query itself is the same shape for all four.
    const { data: clash, error: clashError } = await (supabase.from(target.table as 'invoices'))
      .select('id')
      .eq('company_id', companyId)
      .eq(target.column as 'invoice_number', preview)
      .limit(1);
    if (clashError) {
      setNumberErrors((e) => ({ ...e, [docType]: `Could not check ${preview}: ${clashError.message}` }));
      return;
    }
    if (clash && clash.length > 0) {
      setNumberErrors((e) => ({
        ...e,
        [docType]: `${preview} is already on one of your ${DOCUMENT_TYPE_LABELS[docType].toLowerCase()}. Set Next above your highest existing number, or change the prefix.`,
      }));
      return;
    }

    const patch = Object.fromEntries(changed.map((k) => [k, next[k]])) as Partial<NumberDraft>;
    const { error } = existing
      ? await supabase
          .from('document_number_settings')
          .update(patch)
          .eq('company_id', companyId)
          .eq('doc_type', docType)
      : await supabase
          .from('document_number_settings')
          .insert({
            company_id: companyId,
            doc_type: docType,
            prefix: next.prefix,
            include_year: next.include_year,
            pad_width: next.pad_width,
            next_number: next.next_number,
          });

    if (error) {
      // 23514 is the forward-only trigger: the counter cannot go back.
      setNumberErrors((e) => ({
        ...e,
        [docType]: error.code === '23514'
          ? `Numbers up to ${(existing?.next_number ?? 1) - 1} have been issued; Next cannot go below ${existing?.next_number ?? 1}.`
          : error.message,
      }));
      void load();
      return;
    }
    setNumberErrors((e) => ({ ...e, [docType]: undefined }));
    void load();
  };

  const setDraft = (docType: DocumentType, patch: Partial<NumberDraft>) =>
    setDrafts((d) => ({ ...d, [docType]: { ...d[docType], ...patch } }));

  const lapsed = insuranceExpired(form.watch('insurance_expires_on'));
  const termsDays = Number(form.watch('default_payment_terms_days')) || 0;

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Billing and documents</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" aria-hidden="true" />
          Billing and documents
        </CardTitle>
        <CardDescription>
          Tax, payment terms, document numbering and what prints on an estimate or invoice.
          New estimates and invoices start from these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default tax rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step="0.001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Applied to taxable lines that do not set their own rate. A named rate marked
                      default below takes its place.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_payment_terms_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment terms (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      {paymentTermsLabel(termsDays)}. An invoice issued today would be
                      due {dueDateFrom(new Date(), termsDays)}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">Tax rates</h3>
                  <p className="text-xs text-muted-foreground">
                    For a job across a county line, or where labour is taxed differently. Each
                    line on an estimate or invoice can pick one.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addTaxRate}>
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  Add a rate
                </Button>
              </div>

              {taxRates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">
                  No named rates. The default above is used everywhere.
                </p>
              ) : (
                <div className="space-y-2">
                  {taxRates.map((rate) => (
                    <div key={rate.id} className="flex flex-wrap items-end gap-3 border rounded-md p-3">
                      <div className="flex-1 min-w-[10rem]">
                        <Label htmlFor={`tax-name-${rate.id}`}>Name</Label>
                        <Input
                          id={`tax-name-${rate.id}`}
                          value={rate.name}
                          maxLength={100}
                          onChange={(e) => setTaxRates((prev) =>
                            prev.map((t) => (t.id === rate.id ? { ...t, name: e.target.value } : t)))}
                          onBlur={(e) => updateTaxRate(rate.id, { name: e.target.value.trim() })}
                        />
                      </div>
                      <div className="w-28">
                        <Label htmlFor={`tax-rate-${rate.id}`}>Rate (%)</Label>
                        <Input
                          id={`tax-rate-${rate.id}`} type="number" min={0} max={100} step="0.001"
                          value={rate.rate}
                          onChange={(e) => setTaxRates((prev) =>
                            prev.map((t) => (t.id === rate.id ? { ...t, rate: Number(e.target.value) } : t)))}
                          onBlur={(e) => updateTaxRate(rate.id, { rate: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <Switch
                          id={`tax-default-${rate.id}`}
                          checked={rate.is_default}
                          onCheckedChange={(checked) => updateTaxRate(rate.id, { is_default: checked })}
                        />
                        <Label htmlFor={`tax-default-${rate.id}`}>Default</Label>
                      </div>
                      <Button
                        type="button" variant="ghost" size="sm"
                        aria-label={`Remove the ${rate.name} rate`}
                        onClick={() => removeTaxRate(rate.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-1">Document numbering</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Your own prefix and sequence, counted per company with no gaps. Until you set one
                up, numbers keep coming from the shared sequence they always have.
              </p>

              <div className="space-y-3">
                {DOC_TYPES.map((docType) => {
                  const setting = numbering.find((n) => n.doc_type === docType);
                  const draft = drafts[docType];
                  const preview = formatDocumentNumber(
                    { prefix: draft.prefix, includeYear: draft.include_year, padWidth: draft.pad_width },
                    Number(draft.next_number) || 1
                  );
                  const errorId = `numbering-error-${docType}`;
                  return (
                    <div key={docType} className="border rounded-md p-3 space-y-2">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-40">
                          <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[docType]}</p>
                          <p className="text-xs text-muted-foreground mt-2" aria-live="polite">
                            {setting ? `Next: ${preview}` : `Shared sequence (would be ${preview})`}
                          </p>
                        </div>
                        <div className="w-28">
                          <Label htmlFor={`prefix-${docType}`}>Prefix</Label>
                          <Input
                            id={`prefix-${docType}`}
                            value={draft.prefix}
                            maxLength={20}
                            aria-describedby={numberErrors[docType] ? errorId : undefined}
                            onChange={(e) => setDraft(docType, { prefix: e.target.value })}
                            onBlur={() => { if (setting) void saveNumbering(docType, drafts[docType]); }}
                          />
                        </div>
                        <div className="w-24">
                          <Label htmlFor={`next-${docType}`}>Next</Label>
                          <Input
                            id={`next-${docType}`} type="number" min={setting?.next_number ?? 1} step="1"
                            value={draft.next_number}
                            aria-describedby={numberErrors[docType] ? errorId : undefined}
                            onChange={(e) => setDraft(docType, { next_number: Number(e.target.value) })}
                            onBlur={() => { if (setting) void saveNumbering(docType, drafts[docType]); }}
                          />
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                          <Switch
                            id={`year-${docType}`}
                            checked={draft.include_year}
                            onCheckedChange={(checked) => {
                              setDraft(docType, { include_year: checked });
                              if (setting) void saveNumbering(docType, { ...drafts[docType], include_year: checked });
                            }}
                          />
                          <Label htmlFor={`year-${docType}`}>Year</Label>
                        </div>
                        {!setting && (
                          // Unconfigured rows are a draft until this is pressed,
                          // so tabbing through them never switches a company off
                          // the shared sequence by accident.
                          <Button
                            type="button" variant="outline" size="sm" className="mb-0.5"
                            onClick={() => saveNumbering(docType, drafts[docType])}
                          >
                            Use this numbering
                          </Button>
                        )}
                      </div>
                      {numberErrors[docType] && (
                        <p id={errorId} role="alert" className="text-sm text-destructive">
                          {numberErrors[docType]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ['license_number', 'Licence number', 'text'],
                ['insurance_carrier', 'Insurance carrier', 'text'],
                ['insurance_policy_number', 'Policy number', 'text'],
                ['insurance_expires_on', 'Insurance expires', 'date'],
              ] as const).map(([name, label, type]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input type={type} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              Printed under your company name on estimates and invoices.
            </p>

            {lapsed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  The insurance on file expired on {form.watch('insurance_expires_on')}. It still
                  prints on your documents until you update it.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Terms and conditions</h3>
              {([
                ['estimate_terms', 'On estimates'],
                ['invoice_terms', 'On invoices'],
                ['change_order_terms', 'On change orders'],
              ] as const).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/document-templates')}>
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Document templates
              </Button>
              <div className="flex items-center gap-3">
                {taxRates.some((t) => t.is_default) && (
                  <Badge variant="outline">
                    Default rate: {taxRates.find((t) => t.is_default)?.rate}%
                  </Badge>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save billing settings'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default CompanyBillingSettings;
