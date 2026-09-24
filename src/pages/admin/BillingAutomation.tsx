import { toast } from 'sonner';
import { useBillingAutomation } from '@/hooks/useBillingAutomation';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Clock, AlertTriangle, FileText, Bell } from 'lucide-react';

export function BillingAutomation() {
  const billing = useBillingAutomation();
  const rules = billing.data?.rules ?? [];
  const reminders = billing.data?.reminders ?? [];
  // Figures only from a read that came back; loading or failed shows '--'.
  const shown = (n: number) => (billing.data && !billing.error ? n : '--');

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await billing.setActive(ruleId, !isActive);
    } catch (error) {
      toast.error('Could not change the rule', {
        description: error instanceof Error ? error.message : undefined,
      });
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
          <h1 className="text-3xl font-bold text-foreground">
            Billing Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated invoicing and payment reminders
          </p>
        </div>
        <DollarSign className="h-12 w-12 text-indigo-600 opacity-50" />
      </div>

      {billing.error && (
        <ErrorState
          inline
          title="Billing automation could not be loaded"
          error={billing.error}
          onRetry={() => { void billing.refetch(); }}
        />
      )}
      {billing.data && !billing.data.tenantId && (
        <p className="text-sm text-muted-foreground">
          Your profile is not linked to a tenant, so there are no billing rules or reminders to show.
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shown(rules.filter(r => r.is_active).length)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reminders Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shown(billing.data?.sentCount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {shown(billing.data?.pendingCount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto-Generate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {shown(rules.filter(r => r.auto_generate).length)}
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
                {billing.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {billing.error ? 'Could not be loaded; see the error above.' : 'No automation rules configured'}
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
                {billing.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : reminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {billing.error ? 'Could not be loaded; see the error above.' : 'No reminders scheduled'}
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

export default BillingAutomation;
