import { useState, useEffect } from 'react';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, FileText, Loader2 } from 'lucide-react';

interface LineItem {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number | null;
  selected: boolean;
  editableAmount: number;
}

interface EstimateData {
  id: string;
  estimate_number: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  total_amount: number;
  status: string;
  project_id: string | null;
  company_id: string;
}

interface ConvertToInvoiceDialogProps {
  estimateId: string;
  isOpen: boolean;
  onClose: () => void;
  onConverted: () => void;
}

export function ConvertToInvoiceDialog({
  estimateId,
  isOpen,
  onClose,
  onConverted,
}: ConvertToInvoiceDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [billingPercentage, setBillingPercentage] = useState(100);

  useEffect(() => {
    if (isOpen && estimateId) {
      fetchEstimateData();
    } else {
      setEstimate(null);
      setLineItems([]);
      setBillingPercentage(100);
    }
  }, [isOpen, estimateId]);

  const fetchEstimateData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, estimate_line_items(*)')
        .eq('id', estimateId)
        .single();

      if (error) throw error;

      setEstimate({
        id: data.id,
        estimate_number: data.estimate_number,
        title: data.title,
        client_name: data.client_name,
        client_email: data.client_email,
        total_amount: data.total_amount,
        status: data.status,
        project_id: data.project_id,
        company_id: data.company_id,
      });

      const items = data.estimate_line_items;
      if (items && items.length > 0) {
        setLineItems(
          items.map((item: any) => ({
            id: item.id,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost ?? item.quantity * item.unit_cost,
            selected: true,
            editableAmount: item.total_cost ?? item.quantity * item.unit_cost,
          }))
        );
      } else {
        // Create a mock line item from the estimate total
        setLineItems([
          {
            id: 'mock-1',
            item_name: data.title || 'Estimate Total',
            description: null,
            quantity: 1,
            unit: 'ea',
            unit_cost: data.total_amount,
            total_cost: data.total_amount,
            selected: true,
            editableAmount: data.total_amount,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching estimate:', error);
      toast({
        title: 'Error',
        description: 'Failed to load estimate details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLineItem = (itemId: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItemAmount = (itemId: string, amount: number) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, editableAmount: amount } : item
      )
    );
  };

  const selectedTotal = lineItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.editableAmount, 0);

  const scaledTotal = selectedTotal * (billingPercentage / 100);

  const handleCreateInvoice = async () => {
    if (!estimate || !userProfile?.company_id) return;

    setCreating(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { error } = await supabase.from('invoices').insert({
        company_id: userProfile.company_id,
        invoice_number: invoiceNumber,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        project_id: estimate.project_id,
        subtotal: scaledTotal,
        total_amount: scaledTotal,
        amount_due: scaledTotal,
        status: 'draft',
        issue_date: today,
        due_date: dueDate,
        reference_number: estimate.estimate_number,
        notes: `Converted from Estimate ${estimate.estimate_number} - ${estimate.title}. Billing at ${billingPercentage}%.`,
      });

      if (error) throw error;

      toast({
        title: 'Invoice Created',
        description: `Invoice ${invoiceNumber} created for $${scaledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });

      onConverted();
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Estimate to Invoice"
      description="Create an invoice from this estimate. Select line items and adjust amounts as needed."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateInvoice}
            disabled={creating || !estimate || scaledTotal <= 0}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Invoice
              </>
            )}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : estimate ? (
        <div className="space-y-6">
          {/* Estimate Summary */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
              Estimate Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Estimate #</p>
                <p className="font-medium">{estimate.estimate_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{estimate.client_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  ${estimate.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="default">
                  {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Billing Percentage */}
          <div>
            <Label htmlFor="billing-percentage">
              <DollarSign className="h-3 w-3 inline mr-1" aria-hidden="true" />
              Billing Percentage
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="billing-percentage"
                type="number"
                min={1}
                max={100}
                value={billingPercentage}
                onChange={(e) => setBillingPercentage(Number(e.target.value) || 0)}
                className="w-24"
                aria-label="Billing percentage"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scale all selected amounts by this percentage (e.g., for progress billing).
            </p>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
              Line Items
            </h3>
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                    item.selected ? 'bg-background' : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={item.selected}
                    onCheckedChange={() => toggleLineItem(item.id)}
                    aria-label={`Include ${item.item_name}`}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`item-${item.id}`}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {item.item_name}
                    </label>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit} x ${item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`amount-${item.id}`} className="sr-only">
                      Amount for {item.item_name}
                    </Label>
                    <Input
                      id={`amount-${item.id}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.editableAmount}
                      onChange={(e) =>
                        updateItemAmount(item.id, Number(e.target.value) || 0)
                      }
                      disabled={!item.selected}
                      className="text-right text-sm"
                      aria-label={`Amount for ${item.item_name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Total</p>
              {billingPercentage !== 100 && (
                <p className="text-xs text-muted-foreground">
                  ${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} x {billingPercentage}%
                </p>
              )}
            </div>
            <p className="text-2xl font-bold">
              ${scaledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ) : null}
    </AccessibleModal>
  );
}
