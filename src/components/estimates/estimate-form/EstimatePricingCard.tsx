import type { UseFormReturn } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { taxBreakdownLabel, type NamedTaxRate, type TaxTotals } from "@/lib/companyBilling";
import type { EstimateFormData } from "./types";

interface EstimatePricingCardProps {
  form: UseFormReturn<EstimateFormData>;
  subtotal: number;
  markupPercentage: number;
  taxPercentage: number;
  discountAmount: number;
  taxTotals: TaxTotals;
  total: number;
  taxRates: NamedTaxRate[];
}

export function EstimatePricingCard({
  form,
  subtotal,
  markupPercentage,
  taxPercentage,
  discountAmount,
  taxTotals,
  total,
  taxRates,
}: EstimatePricingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing & Terms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FormField
            control={form.control}
            name="markup_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Markup %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...field}
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
                <FormLabel>Discount Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Valid Until</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Total Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span>Markup ({markupPercentage}%):</span>
            <span>${(subtotal * markupPercentage / 100).toFixed(2)}</span>
          </div>
          {taxTotals.byRate.length > 1 ? (
            taxTotals.byRate.map((group) => (
              <div key={group.rate} className="flex justify-between items-center mb-2">
                <span>{taxBreakdownLabel(group, taxRates)}:</span>
                <span>${group.tax.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center mb-2">
              <span>Tax ({taxTotals.byRate[0]?.rate ?? taxPercentage}%):</span>
              <span>${taxTotals.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-2">
            <span>Discount:</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
