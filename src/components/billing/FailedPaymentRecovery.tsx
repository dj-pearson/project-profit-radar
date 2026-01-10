import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  AlertTriangle,
  CreditCard,
  Mail,
  Pause,
  Play,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react';

interface PaymentFailure {
  id: string;
  failure_reason: string;
  attempt_count: number;
  max_retries: number;
  next_retry_at: string | null;
  dunning_status: string;
  created_at: string;
  resolved_at: string | null;
  subscriber?: {
    user?: {
      email: string;
      full_name: string;
    };
  };
}

interface RecoveryDashboard {
  summary: {
    total_failures: number;
    active_failures: number;
    suspended_accounts: number;
    recovered_payments: number;
    paused_dunning: number;
    recovery_rate: string;
  };
  failures: PaymentFailure[];
  at_risk: PaymentFailure[];
}

interface RecoverySettings {
  is_enabled: boolean;
  retry_intervals: number[];
  max_retry_attempts: number;
  send_failure_notification: boolean;
  notify_admin_on_failure: boolean;
  auto_pause_subscription_after_attempts: number;
  auto_cancel_subscription_after_days: number;
  grace_period_days: number;
  failure_email_subject: string;
  failure_email_body: string;
  dunning_email_intervals: number[];
  final_warning_days_before_cancel: number;
}

const FailedPaymentRecovery: React.FC = () => {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<RecoveryDashboard | null>(null);
  const [settings, setSettings] = useState<RecoverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchSettings();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'get_dashboard' }
      });

      if (error) throw error;
      setDashboard(data.dashboard);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch recovery dashboard',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'get_settings' }
      });

      if (error) throw error;
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleProcessFailures = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'process_failures' }
      });

      if (error) throw error;

      toast({
        title: 'Processing Complete',
        description: data.message
      });

      fetchDashboard();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment failures',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryPayment = async (failureId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'retry_payment', failure_id: failureId }
      });

      if (error) throw error;

      toast({
        title: data.success ? 'Payment Recovered' : 'Retry Failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });

      fetchDashboard();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry payment',
        variant: 'destructive'
      });
    }
  };

  const handlePauseDunning = async (subscriberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'pause_dunning', subscriber_id: subscriberId }
      });

      if (error) throw error;

      toast({
        title: 'Dunning Paused',
        description: 'Payment recovery paused for this subscriber'
      });

      fetchDashboard();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause dunning',
        variant: 'destructive'
      });
    }
  };

  const handleResumeDunning = async (subscriberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'resume_dunning', subscriber_id: subscriberId }
      });

      if (error) throw error;

      toast({
        title: 'Dunning Resumed',
        description: 'Payment recovery resumed for this subscriber'
      });

      fetchDashboard();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resume dunning',
        variant: 'destructive'
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke('failed-payment-recovery', {
        body: { action: 'update_settings', settings }
      });

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Recovery settings updated successfully'
      });

      setShowSettings(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge className="bg-blue-100 text-blue-800"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Recovered</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Failed Payment Recovery</h2>
          <p className="text-muted-foreground">Automated dunning and payment recovery</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleProcessFailures} disabled={processing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            Process Now
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboard.summary.active_failures}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Suspended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboard.summary.suspended_accounts}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Recovered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard.summary.recovered_payments}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Pause className="w-4 h-4" />
                Paused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboard.summary.paused_dunning}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recovery Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.summary.recovery_rate}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && settings && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Settings</CardTitle>
            <CardDescription>Configure automated payment recovery behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Automated Recovery</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry failed payments and send notifications
                  </p>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, is_enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retry Attempts</Label>
                  <Input
                    type="number"
                    value={settings.max_retry_attempts}
                    onChange={(e) =>
                      setSettings({ ...settings, max_retry_attempts: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={settings.grace_period_days}
                    onChange={(e) =>
                      setSettings({ ...settings, grace_period_days: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Send Failure Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Email customers when payment fails
                  </p>
                </div>
                <Switch
                  checked={settings.send_failure_notification}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, send_failure_notification: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Failure Email Subject</Label>
                <Input
                  value={settings.failure_email_subject}
                  onChange={(e) =>
                    setSettings({ ...settings, failure_email_subject: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Failure Email Body</Label>
                <Textarea
                  value={settings.failure_email_body}
                  onChange={(e) =>
                    setSettings({ ...settings, failure_email_body: e.target.value })
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {'{customer_name}'}, {'{failure_reason}'}, {'{amount}'}, {'{update_payment_link}'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* At Risk Section */}
      {dashboard?.at_risk && dashboard.at_risk.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              At Risk (Multiple Failed Attempts)
            </CardTitle>
            <CardDescription className="text-orange-700">
              These accounts have failed multiple times and need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.at_risk.map((failure) => (
                <div
                  key={failure.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                >
                  <div>
                    <div className="font-medium">
                      {failure.subscriber?.user?.full_name || 'Unknown Customer'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {failure.subscriber?.user?.email}
                    </div>
                    <div className="text-xs text-orange-600">
                      {failure.attempt_count} of {failure.max_retries || 3} attempts
                    </div>
                    <Progress
                      value={(failure.attempt_count / (failure.max_retries || 3)) * 100}
                      className="mt-1 h-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetryPayment(failure.id)}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Send dunning email
                        supabase.functions.invoke('failed-payment-recovery', {
                          body: { action: 'send_dunning_email', failure_id: failure.id }
                        });
                        toast({
                          title: 'Email Sent',
                          description: 'Dunning email sent to customer'
                        });
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Failures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Failures</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.failures && dashboard.failures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.failures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {failure.subscriber?.user?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {failure.subscriber?.user?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {failure.failure_reason}
                    </TableCell>
                    <TableCell>
                      {failure.attempt_count} / {failure.max_retries || 3}
                    </TableCell>
                    <TableCell>
                      {failure.next_retry_at
                        ? new Date(failure.next_retry_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(failure.dunning_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {failure.dunning_status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetryPayment(failure.id)}
                              title="Retry Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePauseDunning(failure.subscriber?.user?.full_name || '')}
                              title="Pause Dunning"
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {failure.dunning_status === 'paused' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResumeDunning(failure.subscriber?.user?.full_name || '')}
                            title="Resume Dunning"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payment failures found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FailedPaymentRecovery;
