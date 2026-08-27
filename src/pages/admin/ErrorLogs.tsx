import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Bug, Copy, Check, Download, RefreshCw, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_code: string | null;
  stack_trace: string | null;
  component: string | null;
  component_stack: string | null;
  severity: string | null;
  url: string | null;
  page_route: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  user_action: string | null;
  company_id: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  screen_resolution: string | null;
  viewport_size: string | null;
  user_agent: string | null;
  browser_info: Record<string, unknown> | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  environment: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  timestamp: string | null;
  created_at: string | null;
}

interface Stats {
  total24h: number;
  critical24h: number;
  unique24h: number;
  mostAffectedPage: string | null;
}

const PAGE_SIZE = 25;

export const ErrorLogs: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total24h: 0, critical24h: 0, unique24h: 0, mostAffectedPage: null });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('24h');
  const [errorTypeFilter, setErrorTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('all');

  const getDateThreshold = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default: return null;
    }
  }, [dateRange]);

  const loadStats = useCallback(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      // Total errors in 24h
      const { count: total24h } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);

      // Critical errors in 24h
      const { count: critical24h } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo)
        .eq('severity', 'critical');

      // Unique errors (approximate via fetching distinct messages)
      const { data: uniqueData } = await supabase
        .from('error_logs')
        .select('error_message')
        .gte('created_at', twentyFourHoursAgo);
      const uniqueMessages = new Set(uniqueData?.map(d => d.error_message) || []);

      // Most affected page
      const { data: pageData } = await supabase
        .from('error_logs')
        .select('page_route')
        .gte('created_at', twentyFourHoursAgo)
        .not('page_route', 'is', null);

      let mostAffectedPage: string | null = null;
      if (pageData && pageData.length > 0) {
        const routeCounts: Record<string, number> = {};
        for (const item of pageData) {
          if (item.page_route) {
            routeCounts[item.page_route] = (routeCounts[item.page_route] || 0) + 1;
          }
        }
        const sorted = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]);
        mostAffectedPage = sorted[0]?.[0] || null;
      }

      setStats({
        total24h: total24h || 0,
        critical24h: critical24h || 0,
        unique24h: uniqueMessages.size,
        mostAffectedPage,
      });
    } catch (error) {
      console.error('Failed to load error stats:', error);
    }
  }, []);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      const dateThreshold = getDateThreshold();
      if (dateThreshold) {
        query = query.gte('created_at', dateThreshold);
      }

      if (searchTerm.trim()) {
        query = query.ilike('error_message', `%${searchTerm.trim()}%`);
      }

      if (errorTypeFilter !== 'all') {
        query = query.eq('error_type', errorTypeFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (userEmailFilter.trim()) {
        query = query.ilike('user_email', `%${userEmailFilter.trim()}%`);
      }

      if (resolvedFilter === 'resolved') {
        query = query.eq('resolved', true);
      } else if (resolvedFilter === 'unresolved') {
        query = query.eq('resolved', false);
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        toast({ title: 'Error loading logs', description: error.message, variant: 'destructive' });
        return;
      }

      setErrors((data as unknown as ErrorLog[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load error logs:', error);
      toast({ title: 'Error', description: 'Failed to load error logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, dateRange, errorTypeFilter, severityFilter, userEmailFilter, resolvedFilter, getDateThreshold, toast]);

  useEffect(() => {
    loadErrors();
    loadStats();
  }, [loadErrors, loadStats]);

  const handleRefresh = () => {
    setPage(0);
    loadErrors();
    loadStats();
  };

  const toggleResolved = async (errorLog: ErrorLog) => {
    const newResolved = !errorLog.resolved;
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: newResolved,
          resolved_at: newResolved ? new Date().toISOString() : null,
          resolved_by: newResolved ? user?.id || null : null,
        } as any)
        .eq('id', errorLog.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      setErrors(prev =>
        prev.map(e => e.id === errorLog.id
          ? { ...e, resolved: newResolved, resolved_at: newResolved ? new Date().toISOString() : null, resolved_by: newResolved ? user?.id || null : null }
          : e
        )
      );
      toast({ title: newResolved ? 'Marked as resolved' : 'Marked as unresolved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update error status', variant: 'destructive' });
    }
  };

  const formatErrorReport = (e: ErrorLog): string => {
    return `=== Brikly Error Report ===
Date: ${e.created_at || e.timestamp || 'Unknown'}
Error Type: ${e.error_type} | Severity: ${e.severity || 'unknown'}
Page: ${e.url || 'Unknown'}
Route: ${e.page_route || 'Unknown'}
User: ${e.user_email || 'Anonymous'} (${e.user_role || 'unknown'})
Browser: ${e.browser || 'Unknown'} / ${e.os || 'Unknown'} / ${e.device_type || 'Unknown'}
Screen: ${e.screen_resolution || 'Unknown'} | Viewport: ${e.viewport_size || 'Unknown'}
Session: ${e.session_id || 'Unknown'}

Error Message:
${e.error_message}

Stack Trace:
${e.stack_trace || 'N/A'}

Component Stack:
${e.component_stack || 'N/A'}

Metadata:
${e.metadata ? JSON.stringify(e.metadata, null, 2) : 'N/A'}`;
  };

  const copyErrorDetails = async (errorLog: ErrorLog) => {
    try {
      await navigator.clipboard.writeText(formatErrorReport(errorLog));
      setCopiedId(errorLog.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy to clipboard', variant: 'destructive' });
    }
  };

  const exportCSV = async () => {
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false });

      const dateThreshold = getDateThreshold();
      if (dateThreshold) query = query.gte('created_at', dateThreshold);
      if (searchTerm.trim()) query = query.ilike('error_message', `%${searchTerm.trim()}%`);
      if (errorTypeFilter !== 'all') query = query.eq('error_type', errorTypeFilter);
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
      if (userEmailFilter.trim()) query = query.ilike('user_email', `%${userEmailFilter.trim()}%`);
      if (resolvedFilter === 'resolved') query = query.eq('resolved', true);
      else if (resolvedFilter === 'unresolved') query = query.eq('resolved', false);

      // Limit export to 1000 rows
      query = query.limit(1000);

      const { data, error } = await query;
      if (error) {
        toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
        return;
      }

      if (!data || data.length === 0) {
        toast({ title: 'No data to export' });
        return;
      }

      const headers = [
        'ID', 'Date', 'Error Type', 'Severity', 'Error Message', 'Page Route',
        'User Email', 'User Role', 'Browser', 'OS', 'Device', 'Resolved', 'Component',
        'Session ID', 'URL',
      ];

      const escapeCSV = (val: unknown): string => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = (data as unknown as ErrorLog[]).map(e => [
        e.id,
        e.created_at || e.timestamp,
        e.error_type,
        e.severity,
        e.error_message,
        e.page_route,
        e.user_email,
        e.user_role,
        e.browser,
        e.os,
        e.device_type,
        e.resolved ? 'Yes' : 'No',
        e.component,
        e.session_id,
        e.url,
      ].map(escapeCSV).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'CSV exported', description: `${data.length} rows exported` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="gap-1 bg-orange-600"><AlertCircle className="h-3 w-3" />High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1 bg-yellow-500 text-white"><AlertCircle className="h-3 w-3" />Medium</Badge>;
      case 'low':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Low</Badge>;
      default:
        return <Badge variant="outline">{severity || 'unknown'}</Badge>;
    }
  };

  const getErrorTypeBadge = (type: string) => {
    const colorMap: Record<string, string> = {
      runtime: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      render: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      unhandled_rejection: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      network: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      chunk_load: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return <Badge variant="outline" className={colorMap[type] || ''}>{type.replace(/_/g, ' ')}</Badge>;
  };

  const relativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'unknown';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && errors.length === 0) {
    return (
      <DashboardLayout title="Error Logs">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Bug className="h-8 w-8 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading error logs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Error Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="h-6 w-6" />
              Error Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage application errors across all users
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Errors (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Errors (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.critical24h > 0 ? 'text-destructive' : ''}`}>
                {stats.critical24h}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Errors (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most Affected Page</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono truncate" title={stats.mostAffectedPage || undefined}>
                {stats.mostAffectedPage || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div>
                <Label htmlFor="search" className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Error message..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Date Range</Label>
                <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Error Type</Label>
                <Select value={errorTypeFilter} onValueChange={(v) => { setErrorTypeFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="runtime">Runtime</SelectItem>
                    <SelectItem value="render">Render</SelectItem>
                    <SelectItem value="unhandled_rejection">Unhandled Rejection</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="chunk_load">Chunk Load</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userEmail" className="text-xs">User Email</Label>
                <Input
                  id="userEmail"
                  placeholder="user@..."
                  value={userEmailFilter}
                  onChange={(e) => { setUserEmailFilter(e.target.value); setPage(0); }}
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={resolvedFilter} onValueChange={(v) => { setResolvedFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error List */}
        {(() => {
          const errorLogColumns: TableColumn<ErrorLog>[] = [
            {
              key: 'severity',
              header: 'Severity',
              sortable: true,
              render: (value) => getSeverityBadge(value),
            },
            {
              key: 'error_type',
              header: 'Error Type',
              sortable: true,
              render: (value) => getErrorTypeBadge(value),
            },
            {
              key: 'error_message',
              header: 'Message',
              render: (value) => (
                <span className="text-sm font-mono truncate block max-w-xs" title={value}>
                  {value && value.length > 100 ? value.slice(0, 100) + '...' : value}
                </span>
              ),
            },
            {
              key: 'user_email',
              header: 'User',
              hideOnMobile: true,
              render: (value) => <span className="text-sm">{value || 'Anonymous'}</span>,
            },
            {
              key: 'page_route',
              header: 'Page',
              hideOnMobile: true,
              render: (value, row) => (
                <span className="text-xs font-mono">{value || row.url || 'Unknown'}</span>
              ),
            },
            {
              key: 'created_at',
              header: 'Time',
              sortable: true,
              render: (value, row) => (
                <span className="text-xs text-muted-foreground">
                  {relativeTime(value || row.timestamp)}
                </span>
              ),
            },
            {
              key: 'resolved',
              header: 'Status',
              sortable: true,
              render: (value) => value ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                  Resolved
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                  Open
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              headerRender: () => <span className="sr-only">Actions</span>,
              render: (_, row) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); copyErrorDetails(row); }}
                    aria-label={copiedId === row.id ? 'Copied' : 'Copy error details'}
                  >
                    {copiedId === row.id
                      ? <Check className="h-3 w-3" aria-hidden="true" />
                      : <Copy className="h-3 w-3" aria-hidden="true" />}
                  </Button>
                  <Button
                    variant={row.resolved ? 'outline' : 'default'}
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); toggleResolved(row); }}
                    aria-label={row.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    {row.resolved
                      ? <XCircle className="h-3 w-3" aria-hidden="true" />
                      : <CheckCircle className="h-3 w-3" aria-hidden="true" />}
                  </Button>
                </div>
              ),
            },
          ];

          return (
            <AccessibleTable<ErrorLog>
              caption="Error Logs"
              hideCaption
              columns={errorLogColumns}
              data={errors}
              loading={loading}
              onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
              emptyContent={
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-lg font-semibold">No errors found</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    No errors match your current filters.
                  </p>
                </div>
              }
            />
          );
        })()}

        {/* Expanded Error Detail */}
        {expandedId && errors.find(e => e.id === expandedId) && (() => {
          const errorLog = errors.find(e => e.id === expandedId)!;
          return (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Error Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)} aria-label="Close error details">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">User:</span>{' '}
                    <span>{errorLog.user_email || 'Anonymous'} ({errorLog.user_role || 'unknown'})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Page:</span>{' '}
                    <span className="font-mono">{errorLog.page_route || errorLog.url || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Browser/OS:</span>{' '}
                    <span>{errorLog.browser || 'Unknown'} / {errorLog.os || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Device:</span>{' '}
                    <span>{errorLog.device_type || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Screen:</span>{' '}
                    <span>{errorLog.screen_resolution || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Component:</span>{' '}
                    <span>{errorLog.component || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Error Message</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                    {errorLog.error_message}
                  </pre>
                </div>
                {errorLog.stack_trace && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Stack Trace</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                      {errorLog.stack_trace}
                    </pre>
                  </div>
                )}
                {errorLog.component_stack && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Component Stack</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {errorLog.component_stack}
                    </pre>
                  </div>
                )}
                {errorLog.metadata && Object.keys(errorLog.metadata).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Metadata</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {JSON.stringify(errorLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} errors
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ErrorLogs;
