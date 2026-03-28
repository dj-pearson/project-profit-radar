import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Repeat, Plus, Pause, Play, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface RecurringInvoiceConfig {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  endDate: string;
  occurrences: number;
  templateLineItems: string;
  status: 'active' | 'paused';
  nextInvoiceDate: string;
  generatedCount: number;
}

const getNextDate = (startDate: string, frequency: string): string => {
  const start = new Date(startDate);
  const now = new Date();
  let next = start;
  while (next <= now) {
    if (frequency === 'weekly') next = addWeeks(next, 1);
    else if (frequency === 'biweekly') next = addWeeks(next, 2);
    else next = addMonths(next, 1);
  }
  return format(next, 'yyyy-MM-dd');
};

const initialConfigs: RecurringInvoiceConfig[] = [
  {
    id: '1',
    clientName: 'Acme Construction',
    description: 'Monthly site maintenance',
    amount: 2500,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: '',
    occurrences: 12,
    templateLineItems: 'Site inspection\nPreventive maintenance\nReport generation',
    status: 'active',
    nextInvoiceDate: '2026-04-01',
    generatedCount: 3,
  },
  {
    id: '2',
    clientName: 'Summit Builders',
    description: 'Biweekly equipment rental',
    amount: 1200,
    frequency: 'biweekly',
    startDate: '2026-02-01',
    endDate: '2026-08-01',
    occurrences: 0,
    templateLineItems: 'Excavator rental\nOperator fee',
    status: 'paused',
    nextInvoiceDate: '2026-04-05',
    generatedCount: 4,
  },
];

const emptyForm = {
  clientName: '',
  description: '',
  amount: 0,
  frequency: 'monthly' as const,
  startDate: '',
  endDate: '',
  occurrences: 0,
  templateLineItems: '',
};

const RecurringInvoiceManager: React.FC = () => {
  const [configs, setConfigs] = useState<RecurringInvoiceConfig[]>(initialConfigs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (config: RecurringInvoiceConfig) => {
    setEditingId(config.id);
    setForm({
      clientName: config.clientName,
      description: config.description,
      amount: config.amount,
      frequency: config.frequency,
      startDate: config.startDate,
      endDate: config.endDate,
      occurrences: config.occurrences,
      templateLineItems: config.templateLineItems,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.clientName || !form.description || !form.amount || !form.startDate) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    if (editingId) {
      setConfigs(prev =>
        prev.map(c =>
          c.id === editingId
            ? {
                ...c,
                clientName: form.clientName,
                description: form.description,
                amount: form.amount,
                frequency: form.frequency,
                startDate: form.startDate,
                endDate: form.endDate,
                occurrences: form.occurrences,
                templateLineItems: form.templateLineItems,
                nextInvoiceDate: getNextDate(form.startDate, form.frequency),
              }
            : c
        )
      );
      toast({ title: 'Updated', description: 'Recurring invoice configuration updated.' });
    } else {
      const newConfig: RecurringInvoiceConfig = {
        id: Date.now().toString(),
        ...form,
        status: 'active',
        nextInvoiceDate: getNextDate(form.startDate, form.frequency),
        generatedCount: 0,
      };
      setConfigs(prev => [...prev, newConfig]);
      toast({ title: 'Created', description: 'Recurring invoice configuration created.' });
    }

    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleStatus = (id: string) => {
    setConfigs(prev =>
      prev.map(c =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c
      )
    );
    const config = configs.find(c => c.id === id);
    toast({
      title: config?.status === 'active' ? 'Paused' : 'Resumed',
      description: `Recurring invoice "${config?.description}" has been ${config?.status === 'active' ? 'paused' : 'resumed'}.`,
    });
  };

  const handleDelete = (id: string) => {
    const config = configs.find(c => c.id === id);
    setConfigs(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Deleted', description: `Recurring invoice "${config?.description}" has been deleted.` });
  };

  const frequencyLabel = (f: string) => {
    switch (f) {
      case 'weekly': return 'Weekly';
      case 'biweekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      default: return f;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-construction-orange" aria-hidden="true" />
            Recurring Invoices
          </CardTitle>
          <Button onClick={openCreate} className="bg-construction-orange hover:bg-construction-orange/90">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Recurring Invoice
          </Button>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recurring invoices configured. Click "Create Recurring Invoice" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Frequency</th>
                    <th className="pb-2 font-medium">Next Invoice</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Generated</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map(config => (
                    <tr key={config.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{config.description}</td>
                      <td className="py-3">{config.clientName}</td>
                      <td className="py-3">${config.amount.toLocaleString()}</td>
                      <td className="py-3">{frequencyLabel(config.frequency)}</td>
                      <td className="py-3">{config.nextInvoiceDate}</td>
                      <td className="py-3">
                        <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                          {config.status === 'active' ? 'Active' : 'Paused'}
                        </Badge>
                      </td>
                      <td className="py-3">{config.generatedCount}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(config.id)}
                            aria-label={config.status === 'active' ? 'Pause' : 'Resume'}
                          >
                            {config.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(config)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config.id)}
                            aria-label="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Recurring Invoice' : 'Create Recurring Invoice'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ri-client">Client Name</Label>
              <Input
                id="ri-client"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="ri-description">Description</Label>
              <Input
                id="ri-description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Monthly maintenance billing"
              />
            </div>
            <div>
              <Label htmlFor="ri-amount">Amount ($)</Label>
              <Input
                id="ri-amount"
                type="number"
                value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="ri-frequency">Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(val: 'weekly' | 'biweekly' | 'monthly') => setForm(f => ({ ...f, frequency: val }))}
              >
                <SelectTrigger id="ri-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ri-start">Start Date</Label>
                <Input
                  id="ri-start"
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="ri-end">End Date (optional)</Label>
                <Input
                  id="ri-end"
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ri-occurrences">Number of Occurrences (0 = unlimited)</Label>
              <Input
                id="ri-occurrences"
                type="number"
                value={form.occurrences || ''}
                onChange={e => setForm(f => ({ ...f, occurrences: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="ri-lineitems">Template Line Items</Label>
              <Textarea
                id="ri-lineitems"
                value={form.templateLineItems}
                onChange={e => setForm(f => ({ ...f, templateLineItems: e.target.value }))}
                placeholder="Enter line item descriptions (one per line)"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-construction-orange hover:bg-construction-orange/90">
              {editingId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringInvoiceManager;
