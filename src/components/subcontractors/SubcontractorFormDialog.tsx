import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPTY_SUBCONTRACTOR_FORM,
  TRADE_TYPES,
  subcontractorFormSchema,
  type SubcontractorFormValues,
} from '@/lib/subcontractors';

interface SubcontractorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding. */
  initialValues?: SubcontractorFormValues;
  saving: boolean;
  /** Resolves when the row is written; rejects to keep the dialog open. */
  onSubmit: (values: SubcontractorFormValues) => Promise<void>;
}

const Required = () => (
  <span aria-hidden="true" className="text-destructive">
    *
  </span>
);

export const SubcontractorFormDialog: React.FC<SubcontractorFormDialogProps> = ({
  open,
  onOpenChange,
  initialValues,
  saving,
  onSubmit,
}) => {
  const editing = !!initialValues;
  const form = useForm<SubcontractorFormValues>({
    resolver: zodResolver(subcontractorFormSchema),
    defaultValues: initialValues ?? EMPTY_SUBCONTRACTOR_FORM,
  });

  useEffect(() => {
    if (open) form.reset(initialValues ?? EMPTY_SUBCONTRACTOR_FORM);
  }, [open, initialValues, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // The caller has already told the user why; keep what they typed.
    }
  });

  const trades: readonly string[] = TRADE_TYPES;
  const currentTrade = form.watch('trade');

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit subcontractor' : 'Add subcontractor'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Changes are saved to your company subcontractor list.'
              : 'Adds this vendor to your company subcontractor list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Company name <Required />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ABC Electrical" aria-required="true" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Trade <Required />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* A trade saved before this list changed still shows. */}
                      {currentTrade && !trades.includes(currentTrade) && (
                        <SelectItem value={currentTrade}>{currentTrade}</SelectItem>
                      )}
                      {TRADE_TYPES.map((trade) => (
                        <SelectItem key={trade} value={trade}>
                          {trade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact name <Required />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Smith" aria-required="true" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone <Required />
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" aria-required="true" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <Required />
                    </FormLabel>
                    <FormControl>
                      <Input type="email" aria-required="true" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add subcontractor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
