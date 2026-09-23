import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineTaxSelect } from "@/components/billing/LineTaxSelect";
import type { LineTax, NamedTaxRate } from "@/lib/companyBilling";
import type { LineItem } from "./types";

interface CostCodeOption {
  id: string;
  code: string;
  name: string;
}

interface EstimateLineItemsCardProps {
  lineItems: LineItem[];
  costCodes: CostCodeOption[];
  /** The estimate's tax rate, which a line on "document rate" uses. */
  documentTaxRate: number;
  taxRates: NamedTaxRate[];
  onAdd: () => void;
  onBrowseLibrary: () => void;
  onUpdate: (index: number, field: keyof LineItem, value: string | number) => void;
  onRemove: (index: number) => void;
  onTaxChange: (index: number, tax: LineTax) => void;
}

export function EstimateLineItemsCard({
  lineItems,
  costCodes,
  documentTaxRate,
  taxRates,
  onAdd,
  onBrowseLibrary,
  onUpdate,
  onRemove,
  onTaxChange,
}: EstimateLineItemsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Line Items</CardTitle>
        <div className="flex gap-2">
          <Button type="button" onClick={onBrowseLibrary} size="sm" variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Browse Library
          </Button>
          <Button type="button" onClick={onAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
              <div className="col-span-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  value={item.item_name}
                  onChange={(e) => onUpdate(index, "item_name", e.target.value)}
                  placeholder="Item name"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={item.description}
                  onChange={(e) => onUpdate(index, "description", e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="col-span-2">
                {/* The cost code is what carries this line into the
                    project's budget and, later, into budget vs actual
                    (US-318). It was fetched into state and never shown. */}
                <label className="text-sm font-medium" id={`cost-code-label-${item.id}`}>
                  Cost Code
                </label>
                <Select
                  value={item.cost_code_id}
                  onValueChange={(value) => onUpdate(index, "cost_code_id", value)}
                >
                  <SelectTrigger aria-labelledby={`cost-code-label-${item.id}`}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {costCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.code} {code.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <label className="text-sm font-medium">Qty</label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdate(index, "quantity", parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-medium">Unit</label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => onUpdate(index, "unit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="sq ft">Sq Ft</SelectItem>
                    <SelectItem value="lin ft">Lin Ft</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <label className="text-sm font-medium">Unit Cost</label>
                <Input
                  type="number"
                  value={item.unit_cost}
                  onChange={(e) => onUpdate(index, "unit_cost", parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-medium" htmlFor={`line-tax-${item.id}`}>Tax</label>
                <LineTaxSelect
                  id={`line-tax-${item.id}`}
                  label={`Tax for ${item.item_name || `line ${index + 1}`}`}
                  value={item}
                  documentRate={documentTaxRate}
                  rates={taxRates}
                  onChange={(tax) => onTaxChange(index, tax)}
                />
              </div>
              <div className="col-span-1">
                <label className="text-sm font-medium">Total</label>
                <div className="text-sm font-medium py-2">
                  ${(item.quantity * item.unit_cost).toFixed(2)}
                </div>
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {lineItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No line items added yet. Click "Add Item" to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
