import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  FileText,
  Calendar,
  Clock,
  Mail,
  Settings,
  Plus,
  Play,
  Pause,
  Trash2,
  FileSpreadsheet,
  File,
} from 'lucide-react';

type ReportTypeId =
  | 'project-summary'
  | 'financial'
  | 'time-tracking'
  | 'equipment'
  | 'aging';

type ExportFormat = 'pdf' | 'xlsx' | 'csv';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

interface ReportType {
  id: ReportTypeId;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface ScheduledReport {
  id: string;
  reportType: ReportTypeId;
  reportName: string;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  recipients: string[];
  nextRun: string;
  enabled: boolean;
}

interface ExportHistoryItem {
  id: string;
  reportName: string;
  exportDate: string;
  format: ExportFormat;
  fileSize: string;
  status: 'completed' | 'failed' | 'processing';
  downloadUrl: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'project-summary',
    name: 'Project Summary',
    description: 'Overview of project status, milestones, and progress',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 'financial',
    name: 'Financial Report',
    description: 'Budget vs actual, expenses, and revenue tracking',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: 'time-tracking',
    name: 'Time Tracking Report',
    description: 'Hours logged by crew, project, and date range',
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: 'equipment',
    name: 'Equipment Utilization',
    description: 'Equipment usage, maintenance, and availability',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 'aging',
    name: 'Aging Report',
    description: 'Outstanding invoices grouped by aging period',
    icon: <Calendar className="h-5 w-5" />,
  },
];

const MOCK_PROJECTS = [
  { id: 'all', name: 'All Projects' },
  { id: 'p1', name: 'Downtown Office Renovation' },
  { id: 'p2', name: 'Riverside Apartments Phase 2' },
  { id: 'p3', name: 'Westfield Commercial Plaza' },
  { id: 'p4', name: 'Harbor Bridge Restoration' },
];

const INITIAL_SCHEDULES: ScheduledReport[] = [
  {
    id: 'sch-1',
    reportType: 'financial',
    reportName: 'Financial Report',
    format: 'pdf',
    frequency: 'weekly',
    recipients: ['cfo@builddesk.com', 'pm@builddesk.com'],
    nextRun: '2026-03-30',
    enabled: true,
  },
  {
    id: 'sch-2',
    reportType: 'time-tracking',
    reportName: 'Time Tracking Report',
    format: 'xlsx',
    frequency: 'daily',
    recipients: ['ops@builddesk.com'],
    nextRun: '2026-03-29',
    enabled: true,
  },
  {
    id: 'sch-3',
    reportType: 'aging',
    reportName: 'Aging Report',
    format: 'pdf',
    frequency: 'monthly',
    recipients: ['accounting@builddesk.com', 'cfo@builddesk.com'],
    nextRun: '2026-04-01',
    enabled: false,
  },
];

const INITIAL_HISTORY: ExportHistoryItem[] = [
  {
    id: 'exp-1',
    reportName: 'Financial Report',
    exportDate: '2026-03-28 09:15',
    format: 'pdf',
    fileSize: '2.4 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-2',
    reportName: 'Project Summary',
    exportDate: '2026-03-27 14:30',
    format: 'xlsx',
    fileSize: '1.8 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-3',
    reportName: 'Time Tracking Report',
    exportDate: '2026-03-27 08:00',
    format: 'csv',
    fileSize: '456 KB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-4',
    reportName: 'Aging Report',
    exportDate: '2026-03-26 16:45',
    format: 'pdf',
    fileSize: '1.1 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-5',
    reportName: 'Equipment Utilization',
    exportDate: '2026-03-26 10:20',
    format: 'xlsx',
    fileSize: '3.2 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-6',
    reportName: 'Financial Report',
    exportDate: '2026-03-25 09:00',
    format: 'pdf',
    fileSize: '2.1 MB',
    status: 'failed',
    downloadUrl: '#',
  },
  {
    id: 'exp-7',
    reportName: 'Project Summary',
    exportDate: '2026-03-24 11:30',
    format: 'pdf',
    fileSize: '1.5 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'exp-8',
    reportName: 'Time Tracking Report',
    exportDate: '2026-03-24 08:00',
    format: 'xlsx',
    fileSize: '890 KB',
    status: 'completed',
    downloadUrl: '#',
  },
];

const formatBadgeVariant = (
  format: ExportFormat
): 'default' | 'secondary' | 'outline' => {
  switch (format) {
    case 'pdf':
      return 'default';
    case 'xlsx':
      return 'secondary';
    case 'csv':
      return 'outline';
  }
};

const statusBadgeVariant = (
  status: ExportHistoryItem['status']
): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'failed':
      return 'destructive';
  }
};

const frequencyLabel = (freq: ScheduleFrequency): string => {
  switch (freq) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
  }
};

const ExportCenter: React.FC = () => {
  const [selectedReportType, setSelectedReportType] =
    useState<ReportTypeId>('project-summary');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-28');
  const [selectedProject, setSelectedProject] = useState('all');

  const [schedules, setSchedules] =
    useState<ScheduledReport[]>(INITIAL_SCHEDULES);
  const [exportHistory, setExportHistory] =
    useState<ExportHistoryItem[]>(INITIAL_HISTORY);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] =
    useState<ScheduleFrequency>('weekly');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState('2026-03-30');

  const handleExport = () => {
    const reportType = REPORT_TYPES.find((r) => r.id === selectedReportType);
    if (!reportType) return;

    const newExport: ExportHistoryItem = {
      id: `exp-${Date.now()}`,
      reportName: reportType.name,
      exportDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      format: selectedFormat,
      fileSize: '-- KB',
      status: 'processing',
      downloadUrl: '#',
    };
    setExportHistory((prev) => [newExport, ...prev]);
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateSchedule = () => {
    const reportType = REPORT_TYPES.find((r) => r.id === selectedReportType);
    if (!reportType || !scheduleRecipients.trim()) return;

    const emails = scheduleRecipients
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const newSchedule: ScheduledReport = {
      id: `sch-${Date.now()}`,
      reportType: selectedReportType,
      reportName: reportType.name,
      format: selectedFormat,
      frequency: scheduleFrequency,
      recipients: emails,
      nextRun: scheduleStartDate,
      enabled: true,
    };
    setSchedules((prev) => [...prev, newSchedule]);
    setScheduleDialogOpen(false);
    setScheduleRecipients('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Export Center</h2>
          <p className="text-muted-foreground">
            Generate, schedule, and manage report exports
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Report Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {REPORT_TYPES.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportType(report.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedReportType === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`${
                        selectedReportType === report.id
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {report.icon}
                    </div>
                    <div>
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.description}
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Export Options */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    Export Format
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {(['pdf', 'xlsx', 'csv'] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        variant={
                          selectedFormat === fmt ? 'default' : 'outline'
                        }
                        onClick={() => setSelectedFormat(fmt)}
                        className="flex-1"
                      >
                        {fmt === 'pdf' && <FileText className="mr-2 h-4 w-4" />}
                        {fmt === 'xlsx' && (
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        {fmt === 'csv' && <File className="mr-2 h-4 w-4" />}
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date-from">From</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-to">To</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-filter">Project</Label>
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                    >
                      <SelectTrigger id="project-filter">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_PROJECTS.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={handleExport} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Delivery
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {schedules.length} scheduled{' '}
              {schedules.length === 1 ? 'report' : 'reports'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Schedule
            </Button>
          </div>

          {schedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No scheduled reports configured
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-full p-2 ${
                          schedule.enabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {schedule.reportName}
                          </span>
                          <Badge variant={formatBadgeVariant(schedule.format)}>
                            {schedule.format.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {frequencyLabel(schedule.frequency)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {schedule.recipients.join(', ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Next: {schedule.nextRun}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleSchedule(schedule.id)}
                        aria-label={
                          schedule.enabled
                            ? 'Pause schedule'
                            : 'Enable schedule'
                        }
                      >
                        {schedule.enabled ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        aria-label="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Export History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.reportName}
                      </TableCell>
                      <TableCell>{item.exportDate}</TableCell>
                      <TableCell>
                        <Badge variant={formatBadgeVariant(item.format)}>
                          {item.format.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.fileSize}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status)}>
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={item.status !== 'completed'}
                          aria-label={`Download ${item.reportName}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Delivery Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-report-type">Report Type</Label>
              <Select
                value={selectedReportType}
                onValueChange={(val) =>
                  setSelectedReportType(val as ReportTypeId)
                }
              >
                <SelectTrigger id="schedule-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-format">Format</Label>
              <Select
                value={selectedFormat}
                onValueChange={(val) => setSelectedFormat(val as ExportFormat)}
              >
                <SelectTrigger id="schedule-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-frequency">Frequency</Label>
              <Select
                value={scheduleFrequency}
                onValueChange={(val) =>
                  setScheduleFrequency(val as ScheduleFrequency)
                }
              >
                <SelectTrigger id="schedule-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-recipients">
                Recipient Emails (comma separated)
              </Label>
              <Input
                id="schedule-recipients"
                type="text"
                placeholder="email@example.com, other@example.com"
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-start-date">Start Date</Label>
              <Input
                id="schedule-start-date"
                type="date"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setScheduleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule}>
                <Mail className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExportCenter;
