import { useCallback, useEffect, useState } from 'react';
import { Download, CalendarClock, Trash2, FileDown, History, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  REPORT_TEMPLATES,
  EXPORT_FORMATS,
  FREQUENCIES,
  parseRecipients,
  validateSchedule,
  type ExportFormat,
  type ReportTemplateId,
  type ScheduleFrequency,
} from '@/lib/export-center';
import { downloadTable } from '@/lib/export-formats';
import {
  fetchReportData,
  recordExport,
  fetchExportHistory,
  createSchedule,
  fetchSchedules,
  deleteSchedule,
  type ReportFilters,
  type ScheduledReport,
  type ExportHistoryRow,
} from '@/services/exportCenterService';

interface ProjectOption {
  id: string;
  name: string;
}

const ANY_PROJECT = '__all__';
const templateLabel = (id: string) => REPORT_TEMPLATES.find((t) => t.id === id)?.label ?? id;

const ExportCenter = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const companyId = userProfile?.company_id;

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [template, setTemplate] = useState<ReportTemplateId>('project-summary');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [projectId, setProjectId] = useState(ANY_PROJECT);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const [schedule, setSchedule] = useState({ name: '', frequency: '' as ScheduleFrequency | '', recipientsRaw: '', startDate: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [history, setHistory] = useState<ExportHistoryRow[]>([]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to load projects for export center', error);
          return;
        }
        setProjects((data ?? []) as ProjectOption[]);
      });
  }, [companyId]);

  const refreshLists = useCallback(async () => {
    if (!companyId) return;
    try {
      const [s, h] = await Promise.all([fetchSchedules(companyId), fetchExportHistory(companyId)]);
      setSchedules(s);
      setHistory(h);
    } catch (err) {
      logger.error('Failed to load export center lists', err as Error);
    }
  }, [companyId]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const currentFilters = (): ReportFilters => ({
    projectId: projectId === ANY_PROJECT ? null : projectId,
    startDate: startDate || null,
    endDate: endDate || null,
  });

  /** Run a report, download it in the chosen format, and (optionally) record it. */
  const runExport = async (
    tmpl: ReportTemplateId,
    fmt: ExportFormat,
    filters: ReportFilters,
    record: boolean
  ) => {
    if (!companyId) return;
    const table = await fetchReportData(tmpl, filters, companyId);
    const baseName = `${tmpl}-${new Date().toISOString().slice(0, 10)}`;
    downloadTable(fmt, baseName, templateLabel(tmpl), table);
    if (record) {
      await recordExport({ companyId, template: tmpl, format: fmt, filters, rowCount: table.rows.length });
    }
    return table.rows.length;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const count = await runExport(template, format, currentFilters(), true);
      toast({ title: 'Export ready', description: `${templateLabel(template)} (${count ?? 0} rows) downloaded.` });
      await refreshLists();
    } catch (err) {
      logger.error('Export failed', err as Error);
      toast({ variant: 'destructive', title: 'Export failed', description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const handleReDownload = async (row: ExportHistoryRow) => {
    try {
      await runExport(row.template as ReportTemplateId, row.format as ExportFormat, row.filters, false);
    } catch (err) {
      logger.error('Re-download failed', err as Error);
      toast({ variant: 'destructive', title: 'Download failed', description: (err as Error).message });
    }
  };

  const handleCreateSchedule = async () => {
    if (!companyId) return;
    const errors = validateSchedule(schedule);
    if (errors.length) {
      toast({ variant: 'destructive', title: 'Please fix the following', description: errors.join(' ') });
      return;
    }
    setSavingSchedule(true);
    try {
      await createSchedule({
        companyId,
        name: schedule.name.trim(),
        template,
        format,
        filters: currentFilters(),
        frequency: schedule.frequency as ScheduleFrequency,
        recipients: parseRecipients(schedule.recipientsRaw),
        startDate: schedule.startDate,
      });
      toast({ title: 'Schedule created', description: `${schedule.name} will be emailed ${schedule.frequency}.` });
      setSchedule({ name: '', frequency: '', recipientsRaw: '', startDate: '' });
      await refreshLists();
    } catch (err) {
      logger.error('Failed to create schedule', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!companyId || !confirm('Delete this scheduled report?')) return;
    try {
      await deleteSchedule(id, companyId);
      await refreshLists();
    } catch (err) {
      logger.error('Failed to delete schedule', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete schedule.' });
    }
  };

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Export Center">
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileDown className="h-6 w-6" aria-hidden="true" /> Export Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Export reports as PDF, Excel, or CSV — and schedule recurring email delivery to stakeholders.
            </p>
          </div>

          {/* Build / export */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Build a report</CardTitle>
              <CardDescription>Choose a template, format, and filters, then export.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="ec-template">Report template</Label>
                  <Select value={template} onValueChange={(v) => setTemplate(v as ReportTemplateId)}>
                    <SelectTrigger id="ec-template"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORT_TEMPLATES.map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-format">Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <SelectTrigger id="ec-format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPORT_FORMATS.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-project">Project filter</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="ec-project"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_PROJECT}>All projects</SelectItem>
                      {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-start">From date</Label>
                  <Input id="ec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-end">To date</Label>
                  <Input id="ec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleExport} disabled={exporting}>
                <Download className="mr-1 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export now'}
              </Button>
            </CardContent>
          </Card>

          {/* Schedule delivery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> Schedule email delivery
              </CardTitle>
              <CardDescription>Email the report above on a recurring basis. Uses the template, format, and filters selected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="sc-name">Name</Label>
                  <Input id="sc-name" value={schedule.name} onChange={(e) => setSchedule((s) => ({ ...s, name: e.target.value }))} placeholder="Weekly financials" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sc-freq">Frequency</Label>
                  <Select value={schedule.frequency} onValueChange={(v) => setSchedule((s) => ({ ...s, frequency: v as ScheduleFrequency }))}>
                    <SelectTrigger id="sc-freq"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sc-start">Start date</Label>
                  <Input id="sc-start" type="date" value={schedule.startDate} onChange={(e) => setSchedule((s) => ({ ...s, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="sc-emails" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Recipients</Label>
                  <Textarea id="sc-emails" rows={1} value={schedule.recipientsRaw} onChange={(e) => setSchedule((s) => ({ ...s, recipientsRaw: e.target.value }))} placeholder="a@co.com, b@co.com" />
                </div>
              </div>
              <Button variant="outline" onClick={handleCreateSchedule} disabled={savingSchedule}>
                <CalendarClock className="mr-1 h-4 w-4" /> {savingSchedule ? 'Saving…' : 'Schedule delivery'}
              </Button>

              {schedules.length > 0 && (
                <div className="divide-y rounded-md border">
                  {schedules.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm">
                      <div>
                        <span className="font-medium">{s.name}</span>{' '}
                        <Badge variant="secondary">{templateLabel(s.template)}</Badge>{' '}
                        <Badge variant="outline">{s.format.toUpperCase()}</Badge>{' '}
                        <span className="text-muted-foreground">
                          {s.frequency} · {s.recipients.length} recipient{s.recipients.length === 1 ? '' : 's'}
                          {s.next_run_at ? ` · next ${s.next_run_at}` : ''}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(s.id)} aria-label={`Delete schedule ${s.name}`}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" aria-hidden="true" /> Export history
              </CardTitle>
              <CardDescription>Past exports — re-download regenerates the report from the same filters.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">No exports yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="p-2">Report</th>
                        <th className="p-2">Format</th>
                        <th className="p-2">Rows</th>
                        <th className="p-2">When</th>
                        <th className="p-2 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-b">
                          <td className="p-2">{templateLabel(h.template)}</td>
                          <td className="p-2"><Badge variant="outline">{h.format.toUpperCase()}</Badge></td>
                          <td className="p-2">{h.row_count}</td>
                          <td className="p-2 text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => handleReDownload(h)}>
                              <Download className="mr-1 h-3.5 w-3.5" /> Re-download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default ExportCenter;
