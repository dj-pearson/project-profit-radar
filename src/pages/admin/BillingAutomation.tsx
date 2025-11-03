import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bell
} from 'lucide-react';

interface BillingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  auto_generate: boolean;
  auto_send: boolean;
  is_active: boolean;
  payment_terms_days: number;
}

interface PaymentReminder {
  id: string;
  reminder_type: string;
  sent_at: string;
  status: string;
  delivery_method: string;
}

export function BillingAutomation() {
  const { user } = useAuth();
  const [rules, setRules] = useState<BillingRule[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);

  useEffect(() => {
    loadBillingRules();
    loadPaymentReminders();
  }, [user]);

  const loadBillingRules = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('billing_automation_rules')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const loadPaymentReminders = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('billing_automation_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId);

      if (error) throw error;
      loadBillingRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'upcoming': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'due_today': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'final_notice': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Billing Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated invoicing and payment reminders
          </p>
        </div>
        <DollarSign className="h-12 w-12 text-indigo-600 opacity-50" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.filter(r => r.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reminders Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reminders.filter(r => r.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reminders.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto-Generate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rules.filter(r => r.auto_generate).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="reminders">Payment Reminders</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Automation Rules</CardTitle>
              <CardDescription>
                Configure automated billing triggers and workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No automation rules configured
                  </p>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{rule.rule_name}</p>
                          <Badge variant="outline" className="capitalize">
                            {rule.rule_type.replace('_', ' ')}
                          </Badge>
                          {rule.auto_generate && (
                            <Badge variant="secondary">Auto-Generate</Badge>
                          )}
                          {rule.auto_send && (
                            <Badge variant="secondary">Auto-Send</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Payment terms: Net {rule.payment_terms_days} days
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={rule.is_active ? 'outline' : 'default'}
                        onClick={() => toggleRule(rule.id, rule.is_active)}
                      >
                        {rule.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Reminder Schedule</CardTitle>
              <CardDescription>
                Automated payment reminders and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reminders scheduled
                  </p>
                ) : (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getReminderIcon(reminder.reminder_type)}
                          <p className="font-semibold capitalize">
                            {reminder.reminder_type.replace('_', ' ')}
                          </p>
                          <Badge
                            variant={reminder.status === 'sent' ? 'default' : 'secondary'}
                          >
                            {reminder.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          Via: {reminder.delivery_method}
                        </p>
                      </div>
                      {reminder.sent_at && (
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {new Date(reminder.sent_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reminder.sent_at).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
