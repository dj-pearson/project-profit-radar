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
 */
import { useCallback, useEffect, useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Trash2, FileText, AlertCircle } from 'lucide-react';
import {
  formatDocumentNumber, dueDateFrom, paymentTermsLabel, insuranceExpired,
  DOCUMENT_TYPE_LABELS, type DocumentType,
} from '@/lib/companyBilling';

interface BillingSettings {
  default_tax_rate: number;
  default_payment_terms_days: number;
  license_number: string;
  insurance_carrier: string;
  insurance_policy_number: string;
  insurance_expires_on: string;
  estimate_terms: string;
  invoice_terms: string;
  change_order_terms: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  applies_to: string;
  is_default: boolean;
  is_active: boolean;
}

interface NumberSetting {
  doc_type: DocumentType;
  prefix: string;
  include_year: boolean;
  pad_width: number;
  next_number: number;
}

const EMPTY: BillingSettings = {
  default_tax_rate: 0,
  default_payment_terms_days: 30,
  license_number: '',
  insurance_carrier: '',
  insurance_policy_number: '',
  insurance_expires_on: '',
  estimate_terms: '',
  invoice_terms: '',
  change_order_terms: '',
};

const DOC_TYPES: DocumentType[] = ['invoice', 'estimate', 'change_order', 'purchase_order'];

export function CompanyBillingSettings() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<BillingSettings>(EMPTY);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [numbering, setNumbering] = useState<NumberSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userProfile?.company_id) return;
    setLoading(true);

    const [settingsRes, taxRes, numberRes] = await Promise.all([
      supabase
        .from('company_settings')
        .select('default_tax_rate, default_payment_terms_days, license_number, insurance_carrier, insurance_policy_number, insurance_expires_on, estimate_terms, invoice_terms, change_order_terms')
        .eq('company_id', userProfile.company_id)
        .maybeSingle(),
      supabase
        .from('tax_rates')
        .select('id, name, rate, applies_to, is_default, is_active')
        .eq('company_id', userProfile.company_id)
        .order('name'),
      supabase
        .from('document_number_settings')
        .select('doc_type, prefix, include_year, pad_width, next_number')
        .eq('company_id', userProfile.company_id),
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

    if (settingsRes.data) {
      const d = settingsRes.data as Partial<BillingSettings>;
      setSettings({
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
    setTaxRates((taxRes.data || []) as TaxRate[]);
    setNumbering((numberRes.data || []) as NumberSetting[]);
    setLoading(false);
  }, [userProfile?.company_id, toast]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!userProfile?.company_id) return;
    setSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        company_id: userProfile.company_id,
        ...settings,
        insurance_expires_on: settings.insurance_expires_on || null,
      } as never, { onConflict: 'company_id' });

    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: error.message });
      return;
    }
    toast({
      title: 'Billing settings saved',
      description: `New invoices will be ${paymentTermsLabel(settings.default_payment_terms_days).toLowerCase()}.`,
    });
  };

  const addTaxRate = async () => {
    if (!userProfile?.company_id) return;
    const { error } = await supabase
      .from('tax_rates')
      .insert({
        company_id: userProfile.company_id,
        name: `Rate ${taxRates.length + 1}`,
        rate: settings.default_tax_rate || 0,
        // Never default-on: the partial unique index refuses a second default,
        // so an added rate must not claim it.
        is_default: false,
      } as never);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not add that rate', description: error.message });
      return;
    }
    void load();
  };

  const updateTaxRate = async (id: string, patch: Partial<TaxRate>) => {
    const previous = taxRates;
    setTaxRates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('tax_rates').update(patch as never).eq('id', id);
    if (error) {
      setTaxRates(previous);
      toast({ variant: 'destructive', title: 'Could not save that rate', description: error.message });
    }
  };

  const removeTaxRate = async (id: string) => {
    const { error } = await supabase.from('tax_rates').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not remove that rate', description: error.message });
      return;
    }
    void load();
  };

  const setNumberFormat = async (docType: DocumentType, patch: Partial<NumberSetting>) => {
    if (!userProfile?.company_id) return;
    const existing = numbering.find((n) => n.doc_type === docType);
    const row: NumberSetting = {
      doc_type: docType,
      prefix: existing?.prefix ?? `${docType.slice(0, 3).toUpperCase()}-`,
      include_year: existing?.include_year ?? true,
      pad_width: existing?.pad_width ?? 4,
      next_number: existing?.next_number ?? 1,
      ...patch,
    };
    setNumbering((prev) => {
      const others = prev.filter((n) => n.doc_type !== docType);
      return [...others, row];
    });

    const { error } = await supabase
      .from('document_number_settings')
      .upsert({ company_id: userProfile.company_id, ...row } as never,
        { onConflict: 'company_id,doc_type' });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save the numbering',
        description: error.message,
      });
      void load();
    }
  };

  const lapsed = insuranceExpired(settings.insurance_expires_on);

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
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="default-tax-rate">Default tax rate (%)</Label>
            <Input
              id="default-tax-rate" type="number" min={0} max={100} step="0.001"
              value={settings.default_tax_rate}
              onChange={(e) => setSettings((s) => ({ ...s, default_tax_rate: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Applied to taxable lines that do not set their own rate.
            </p>
          </div>
          <div>
            <Label htmlFor="payment-terms">Payment terms (days)</Label>
            <Input
              id="payment-terms" type="number" min={0} step="1"
              value={settings.default_payment_terms_days}
              onChange={(e) => setSettings((s) => ({ ...s, default_payment_terms_days: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {paymentTermsLabel(settings.default_payment_terms_days)}. An invoice issued today
              would be due {dueDateFrom(new Date(), settings.default_payment_terms_days)}.
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-medium">Tax rates</h3>
              <p className="text-xs text-muted-foreground">
                For a job across a county line, or where labour is taxed differently.
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
                      onChange={(e) => setTaxRates((prev) =>
                        prev.map((t) => (t.id === rate.id ? { ...t, name: e.target.value } : t)))}
                      onBlur={(e) => updateTaxRate(rate.id, { name: e.target.value })}
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
            Your own prefix and sequence, counted per company. Until you set one, numbers keep
            coming from the shared sequence they always have.
          </p>

          <div className="space-y-3">
            {DOC_TYPES.map((docType) => {
              const setting = numbering.find((n) => n.doc_type === docType);
              const format = {
                prefix: setting?.prefix ?? '',
                includeYear: setting?.include_year ?? true,
                padWidth: setting?.pad_width ?? 4,
              };
              return (
                <div key={docType} className="flex flex-wrap items-end gap-3 border rounded-md p-3">
                  <div className="w-40">
                    <Label>{DOCUMENT_TYPE_LABELS[docType]}</Label>
                    <p className="text-xs text-muted-foreground mt-2">
                      {setting
                        ? formatDocumentNumber(format, setting.next_number)
                        : 'shared sequence'}
                    </p>
                  </div>
                  <div className="w-28">
                    <Label htmlFor={`prefix-${docType}`}>Prefix</Label>
                    <Input
                      id={`prefix-${docType}`}
                      value={format.prefix}
                      placeholder={`${docType.slice(0, 3).toUpperCase()}-`}
                      onChange={(e) => setNumbering((prev) => prev.map((n) =>
                        n.doc_type === docType ? { ...n, prefix: e.target.value } : n))}
                      onBlur={(e) => setNumberFormat(docType, { prefix: e.target.value })}
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`next-${docType}`}>Next</Label>
                    <Input
                      id={`next-${docType}`} type="number" min={1} step="1"
                      value={setting?.next_number ?? 1}
                      onChange={(e) => setNumbering((prev) => prev.map((n) =>
                        n.doc_type === docType ? { ...n, next_number: Number(e.target.value) } : n))}
                      onBlur={(e) => setNumberFormat(docType, { next_number: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      id={`year-${docType}`}
                      checked={format.includeYear}
                      onCheckedChange={(checked) => setNumberFormat(docType, { include_year: checked })}
                    />
                    <Label htmlFor={`year-${docType}`}>Year</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="license-number">Licence number</Label>
            <Input
              id="license-number" value={settings.license_number}
              onChange={(e) => setSettings((s) => ({ ...s, license_number: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="insurance-carrier">Insurance carrier</Label>
            <Input
              id="insurance-carrier" value={settings.insurance_carrier}
              onChange={(e) => setSettings((s) => ({ ...s, insurance_carrier: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="insurance-policy">Policy number</Label>
            <Input
              id="insurance-policy" value={settings.insurance_policy_number}
              onChange={(e) => setSettings((s) => ({ ...s, insurance_policy_number: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="insurance-expires">Insurance expires</Label>
            <Input
              id="insurance-expires" type="date" value={settings.insurance_expires_on}
              onChange={(e) => setSettings((s) => ({ ...s, insurance_expires_on: e.target.value }))}
            />
          </div>
        </div>

        {lapsed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              The insurance on file expired on {settings.insurance_expires_on}. It still prints
              on your documents until you update it.
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
          ] as const).map(([field, label]) => (
            <div key={field}>
              <Label htmlFor={field}>{label}</Label>
              <Textarea
                id={field} rows={3} value={settings[field]}
                onChange={(e) => setSettings((s) => ({ ...s, [field]: e.target.value }))}
              />
            </div>
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
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save billing settings'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompanyBillingSettings;
