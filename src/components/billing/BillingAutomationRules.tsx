import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  Zap,
  FileText,
  Mail,
  DollarSign,
  Percent,
  Settings
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  automation_type: string;
  is_active: boolean;
  trigger_conditions: {
    trigger_type: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  actions: {
    action_type: string;
    fee_percentage?: number;
    fee_fixed_amount?: number;
    discount_percentage?: number;
    email_template?: string;
  };
  schedule?: {
    frequency: string;
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
  };
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
}

const AUTOMATION_TYPES = [
  { value: 'invoice_generation', label: 'Invoice Generation', icon: FileText },
  { value: 'payment_reminder', label: 'Payment Reminder', icon: Mail },
  { value: 'late_fee', label: 'Late Fee Application', icon: DollarSign },
  { value: 'discount_application', label: 'Discount Application', icon: Percent },
  { value: 'usage_billing', label: 'Usage Billing', icon: Zap }
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'One Time' }
];

const BillingAutomationRules: React.FC = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    automation_type: '',
    trigger_type: 'schedule',
    frequency: 'daily',
    time: '09:00',
    day_of_week: 1,
    day_of_month: 1,
    action_type: 'send_email',
    fee_percentage: 0,
    fee_fixed_amount: 0,
    discount_percentage: 0
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-automation', {
        body: { action: 'list_rules' }
      });

      if (error) throw error;
      setRules(data.rules || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch automation rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!formData.name || !formData.automation_type) {
      toast({
        title: 'Validation Error',
        description: 'Name and automation type are required',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      const rule = {
        name: formData.name,
        description: formData.description,
        automation_type: formData.automation_type,
        trigger_conditions: {
          trigger_type: formData.trigger_type
        },
        actions: {
          action_type: formData.action_type,
          fee_percentage: formData.fee_percentage,
          fee_fixed_amount: formData.fee_fixed_amount,
          discount_percentage: formData.discount_percentage
        },
        schedule: formData.trigger_type === 'schedule' ? {
          frequency: formData.frequency,
          time: formData.time,
          day_of_week: formData.day_of_week,
          day_of_month: formData.day_of_month
        } : undefined
      };

      const { data, error } = await supabase.functions.invoke('billing-automation', {
        body: {
          action: editingRule ? 'update_rule' : 'create_rule',
          rule_id: editingRule?.id,
          rule
        }
      });

      if (error) throw error;

      toast({
        title: editingRule ? 'Rule Updated' : 'Rule Created',
        description: data.message
      });

      setDialogOpen(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save automation rule',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('billing-automation', {
        body: { action: 'delete_rule', rule_id: ruleId }
      });

      if (error) throw error;

      toast({
        title: 'Rule Deleted',
        description: 'Automation rule has been deleted'
      });

      fetchRules();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive'
      });
    }
  };

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      const { data, error } = await supabase.functions.invoke('billing-automation', {
        body: {
          action: 'update_rule',
          rule_id: rule.id,
          rule: { is_active: !rule.is_active }
        }
      });

      if (error) throw error;

      toast({
        title: rule.is_active ? 'Rule Paused' : 'Rule Activated',
        description: `${rule.name} has been ${rule.is_active ? 'paused' : 'activated'}`
      });

      fetchRules();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      });
    }
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('billing-automation', {
        body: { action: 'execute_rule', rule_id: ruleId }
      });

      if (error) throw error;

      toast({
        title: 'Rule Executed',
        description: data.message
      });

      fetchRules();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute rule',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      automation_type: '',
      trigger_type: 'schedule',
      frequency: 'daily',
      time: '09:00',
      day_of_week: 1,
      day_of_month: 1,
      action_type: 'send_email',
      fee_percentage: 0,
      fee_fixed_amount: 0,
      discount_percentage: 0
    });
  };

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      automation_type: rule.automation_type,
      trigger_type: rule.trigger_conditions?.trigger_type || 'schedule',
      frequency: rule.schedule?.frequency || 'daily',
      time: rule.schedule?.time || '09:00',
      day_of_week: rule.schedule?.day_of_week || 1,
      day_of_month: rule.schedule?.day_of_month || 1,
      action_type: rule.actions?.action_type || 'send_email',
      fee_percentage: rule.actions?.fee_percentage || 0,
      fee_fixed_amount: rule.actions?.fee_fixed_amount || 0,
      discount_percentage: rule.actions?.discount_percentage || 0
    });
    setDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    const config = AUTOMATION_TYPES.find(t => t.value === type);
    if (!config) return <Settings className="w-4 h-4" />;
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  const groupedRules = AUTOMATION_TYPES.reduce((acc, type) => {
    acc[type.value] = rules.filter(r => r.automation_type === type.value);
    return acc;
  }, {} as Record<string, AutomationRule[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Billing Automation</h2>
          <p className="text-muted-foreground">Automate invoicing, reminders, and billing workflows</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingRule(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</DialogTitle>
              <DialogDescription>
                Set up automated billing workflows
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Payment Reminders"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this rule do?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Automation Type</Label>
                <Select
                  value={formData.automation_type}
                  onValueChange={(value) => setFormData({ ...formData, automation_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              {formData.automation_type === 'late_fee' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee Percentage</Label>
                    <Input
                      type="number"
                      value={formData.fee_percentage}
                      onChange={(e) => setFormData({ ...formData, fee_percentage: parseFloat(e.target.value) })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed Fee Amount</Label>
                    <Input
                      type="number"
                      value={formData.fee_fixed_amount}
                      onChange={(e) => setFormData({ ...formData, fee_fixed_amount: parseFloat(e.target.value) })}
                      placeholder="e.g., 25"
                    />
                  </div>
                </div>
              )}

              {formData.automation_type === 'discount_application' && (
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <Input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                    placeholder="e.g., 10"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule} disabled={processing}>
                {processing ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rules.filter(r => r.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.reduce((sum, r) => sum + (r.run_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules by Type */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {AUTOMATION_TYPES.map((type) => {
            const typeRules = groupedRules[type.value] || [];
            if (typeRules.length === 0 && rules.length > 0) return null;

            return (
              <AccordionItem key={type.value} value={type.value} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <type.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {typeRules.length} rule{typeRules.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {typeRules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No rules configured for {type.label.toLowerCase()}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {typeRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            rule.is_active ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => handleToggleRule(rule)}
                            />
                            <div>
                              <div className="font-medium">{rule.name}</div>
                              {rule.description && (
                                <div className="text-sm text-muted-foreground">
                                  {rule.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {rule.schedule?.frequency || 'On demand'}
                                {rule.schedule?.time && ` at ${rule.schedule.time}`}
                                {rule.run_count > 0 && (
                                  <span className="ml-2">
                                    • Ran {rule.run_count} times
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {rule.is_active && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Active
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExecuteRule(rule.id)}
                              title="Run Now"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(rule)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRule(rule.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {rules.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Automation Rules</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation rule to streamline your billing workflows
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingAutomationRules;
