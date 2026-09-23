import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Globe, Ban, TrendingUp, RefreshCw, Plus, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/common/ErrorState';
import { useRateLimiting, type RateLimitStats } from '@/hooks/useRateLimiting';
import { format } from 'date-fns';

const EMPTY_STATS: RateLimitStats = {
  totalRules: 0,
  activeBlocks: 0,
  violationsToday: 0,
  ddosAttacks: 0,
  topBlockedIps: 0
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const RateLimitingDashboard = () => {
  const rateLimiting = useRateLimiting();
  const stats = rateLimiting.data?.stats ?? EMPTY_STATS;
  const rules = rateLimiting.data?.rules ?? [];
  const violations = rateLimiting.data?.violations ?? [];
  const ipControls = rateLimiting.data?.ipControls ?? [];
  const loading = rateLimiting.isLoading;
  const [refreshing, setRefreshing] = useState(false);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [showNewIPForm, setShowNewIPForm] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    endpoint_pattern: '',
    method: 'ALL',
    max_requests: 100,
    time_window_seconds: 60,
    block_duration_seconds: 300,
    rule_type: 'standard',
    priority: 1
  });
  const [newIP, setNewIP] = useState({
    ip_address: '',
    access_type: 'blacklist',
    reason: ''
  });
  const { toast } = useToast();

  const handleCreateRule = async () => {
    if (!newRule.rule_name || !newRule.endpoint_pattern) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await rateLimiting.createRule(newRule);

      toast({
        title: "Rule Created",
        description: "Rate limiting rule has been created successfully",
      });

      setShowNewRuleForm(false);
      setNewRule({
        rule_name: '',
        endpoint_pattern: '',
        method: 'ALL',
        max_requests: 100,
        time_window_seconds: 60,
        block_duration_seconds: 300,
        rule_type: 'standard',
        priority: 1
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create rate limiting rule: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const handleCreateIPControl = async () => {
    if (!newIP.ip_address) {
      toast({
        title: "Validation Error",
        description: "Please enter an IP address",
        variant: "destructive"
      });
      return;
    }

    try {
      await rateLimiting.createIPControl(newIP);

      toast({
        title: "IP Control Added",
        description: `IP ${newIP.ip_address} has been added to ${newIP.access_type}`,
      });

      setShowNewIPForm(false);
      setNewIP({
        ip_address: '',
        access_type: 'blacklist',
        reason: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add IP control: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await rateLimiting.refetch();
    setRefreshing(false);
    if (result.error) {
      toast({
        title: "Refresh failed",
        description: message(result.error),
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Refreshed",
      description: "Rate limiting data has been updated",
    });
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      await rateLimiting.setRuleActive(ruleId, !currentStatus);

      toast({
        title: "Rule Updated",
        description: `Rule has been ${!currentStatus ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update rule status: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'strict':
        return <Badge variant="destructive">Strict</Badge>;
      case 'standard':
        return <Badge variant="default">Standard</Badge>;
      case 'custom':
        return <Badge variant="secondary">Custom</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'throttled':
        return <Badge variant="default">Throttled</Badge>;
      case 'logged_only':
        return <Badge variant="secondary">Logged</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (rateLimiting.error) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          title="Rate limiting data could not be loaded"
          error={rateLimiting.error}
          onRetry={() => { void rateLimiting.refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-construction-dark">Rate Limiting & DDoS Protection</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage API rate limits, DDoS protection, and IP access controls
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowNewRuleForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRules}</div>
            <p className="text-xs text-muted-foreground">Rate limit rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
            <Ban className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBlocks}</div>
            <p className="text-xs text-muted-foreground">Currently blocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violations Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.violationsToday}</div>
            <p className="text-xs text-muted-foreground">Rate limit violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DDoS Attacks</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ddosAttacks}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Globe className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topBlockedIps}</div>
            <p className="text-xs text-muted-foreground">IP access controls</p>
          </CardContent>
        </Card>
      </div>

      {/* New Rule Form */}
      {showNewRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Rate Limiting Rule</CardTitle>
            <CardDescription>Define a new rate limiting rule for API endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule_name">Rule Name *</Label>
                <Input
                  id="rule_name"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({...newRule, rule_name: e.target.value})}
                  placeholder="Login Protection"
                />
              </div>
              <div>
                <Label htmlFor="endpoint_pattern">Endpoint Pattern *</Label>
                <Input
                  id="endpoint_pattern"
                  value={newRule.endpoint_pattern}
                  onChange={(e) => setNewRule({...newRule, endpoint_pattern: e.target.value})}
                  placeholder="/api/auth/*"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={newRule.method} onValueChange={(value) => setNewRule({...newRule, method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="max_requests">Max Requests</Label>
                <Input
                  id="max_requests"
                  type="number"
                  value={newRule.max_requests}
                  onChange={(e) => setNewRule({...newRule, max_requests: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="time_window">Time Window (seconds)</Label>
                <Input
                  id="time_window"
                  type="number"
                  value={newRule.time_window_seconds}
                  onChange={(e) => setNewRule({...newRule, time_window_seconds: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="block_duration">Block Duration (seconds)</Label>
                <Input
                  id="block_duration"
                  type="number"
                  value={newRule.block_duration_seconds}
                  onChange={(e) => setNewRule({...newRule, block_duration_seconds: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="rule_type">Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={(value) => setNewRule({...newRule, rule_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateRule}>Create Rule</Button>
              <Button variant="outline" onClick={() => setShowNewRuleForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New IP Form */}
      {showNewIPForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add IP Access Control</CardTitle>
            <CardDescription>Block or whitelist specific IP addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ip_address">IP Address *</Label>
                <Input
                  id="ip_address"
                  value={newIP.ip_address}
                  onChange={(e) => setNewIP({...newIP, ip_address: e.target.value})}
                  placeholder="192.168.1.1 or 192.168.1.0/24"
                />
              </div>
              <div>
                <Label htmlFor="access_type">Access Type</Label>
                <Select value={newIP.access_type} onValueChange={(value) => setNewIP({...newIP, access_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blacklist">Blacklist (Block)</SelectItem>
                    <SelectItem value="whitelist">Whitelist (Allow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={newIP.reason}
                onChange={(e) => setNewIP({...newIP, reason: e.target.value})}
                placeholder="Reason for blocking/allowing this IP"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateIPControl}>Add IP Control</Button>
              <Button variant="outline" onClick={() => setShowNewIPForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Rate Limit Rules</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="ip-control">IP Access Control</TabsTrigger>
          <TabsTrigger value="ddos">DDoS Protection</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Rules</CardTitle>
              <CardDescription>
                Manage API rate limiting rules and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="mx-auto h-12 w-12 mb-4" />
                    <p>No rate limiting rules configured yet</p>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {rule.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{rule.rule_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {rule.endpoint_pattern} • {rule.method} • {rule.max_requests} req/{rule.time_window_seconds}s
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Block for {rule.block_duration_seconds}s • Priority: {rule.priority}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          {getRuleTypeBadge(rule.rule_type)}
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                        >
                          {rule.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limit Violations</CardTitle>
              <CardDescription>
                Recent rate limit violations and enforcement actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {violations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                    <p>No rate limit violations recorded yet</p>
                  </div>
                ) : (
                  violations.slice(0, 20).map((violation) => (
                    <div key={violation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="font-medium">
                            {violation.endpoint} ({violation.method})
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {violation.identifier} • {violation.requests_made} requests (+{violation.limit_exceeded_by} over limit)
                          </div>
                          {violation.ip_address && (
                            <div className="text-xs text-muted-foreground">
                              IP: {violation.ip_address}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {getActionBadge(violation.action_taken)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(violation.created_at), 'MMM d, HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip-control" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>IP Access Control</CardTitle>
                  <CardDescription>
                    Manage IP blacklists and whitelists for enhanced security
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewIPForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add IP Control
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ipControls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="mx-auto h-12 w-12 mb-4" />
                    <p>No IP access controls configured yet</p>
                  </div>
                ) : (
                  ipControls.map((control) => (
                    <div key={control.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {control.access_type === 'blacklist' ? (
                          <Ban className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">{control.ip_address}</div>
                          <div className="text-sm text-muted-foreground">
                            {control.reason || 'No reason provided'}
                          </div>
                          {control.auto_generated && (
                            <div className="text-xs text-muted-foreground">
                              Auto-generated by DDoS protection
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={control.access_type === 'blacklist' ? "destructive" : "default"}>
                          {control.access_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(control.created_at), 'MMM d, HH:mm')}
                        </div>
                        {control.expires_at && (
                          <div className="text-xs text-muted-foreground">
                            Expires: {format(new Date(control.expires_at), 'MMM d, HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ddos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DDoS Protection Status</CardTitle>
              <CardDescription>
                Advanced DDoS detection and mitigation system status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4" />
                <p>Advanced DDoS protection monitoring coming soon</p>
                <p className="text-sm">Real-time attack detection and automated mitigation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RateLimitingDashboard;