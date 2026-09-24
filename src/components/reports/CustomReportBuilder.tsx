import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie } from 'recharts';
import { 
  Download, 
  Plus, 
  Save, 
  Eye, 
  Settings,
  Filter,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCustomReportData, REPORT_ROW_LIMIT } from '@/hooks/useCustomReportData';
import { logger } from '@/lib/logger';
import { AVAILABLE_FIELDS, type ReportField } from './customReportSources';

interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: string | number | [string | number, string | number];
}

interface ReportConfig {
  id?: string;
  name: string;
  description: string;
  dataSource: 'projects' | 'job_costs' | 'time_entries' | 'expenses' | 'invoices';
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  chartType?: 'bar' | 'line' | 'pie' | 'table';
  dateRange: {
    start: string;
    end: string;
  };
}

interface CustomReportBuilderProps {
  onSave?: (config: ReportConfig) => void;
  onExecute?: (config: ReportConfig) => void;
  initialConfig?: Partial<ReportConfig>;
}

export const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({
  onSave,
  onExecute,
  initialConfig
}) => {
  const { toast } = useToast();
  const reportQuery = useCustomReportData();

  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    dataSource: 'projects',
    fields: [],
    filters: [],
    sortBy: '',
    sortOrder: 'asc',
    chartType: 'table',
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    ...initialConfig
  });

  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const isGenerating = reportQuery.isPending;
  const [previewMode, setPreviewMode] = useState(false);

  const addField = (field: ReportField) => {
    if (!config.fields.find(f => f.id === field.id)) {
      setConfig(prev => ({
        ...prev,
        fields: [...prev.fields, field]
      }));
    }
  };

  const removeField = (fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const addFilter = () => {
    const availableFields = AVAILABLE_FIELDS[config.dataSource];
    if (availableFields.length > 0) {
      setConfig(prev => ({
        ...prev,
        filters: [...prev.filters, {
          field: availableFields[0].id,
          operator: 'equals',
          value: ''
        }]
      }));
    }
  };

  const removeFilter = (index: number) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const updateFilter = (index: number, filter: Partial<ReportFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map((f, i) => i === index ? { ...f, ...filter } : f)
    }));
  };

  const generateReport = async () => {
    if (config.fields.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one field for your report"
      });
      return;
    }

    try {
      // Throws the PostgREST error; nothing here falls back to invented rows.
      const { rows, truncated } = await reportQuery.mutateAsync(config);
      setReportData(rows);
      setPreviewMode(true);
      
      if (onExecute) {
        onExecute(config);
      }

      toast({
        title: "Success",
        description: truncated
          ? `Showing the first ${REPORT_ROW_LIMIT} rows. Narrow the date range or add a filter to see the rest.`
          : "Report generated successfully"
      });
    } catch (error) {
      // Say which query failed and why. The user has to be able to tell an
      // empty result from a broken one, because the old behaviour - invented
      // rows under a success toast - made those two look identical.
      logger.error('Report generation failed', error);
      toast({
        variant: "destructive",
        title: "Could not generate report",
        description: error instanceof Error ? error.message : 'The query failed. No data was returned.'
      });
      setReportData([]);
      setPreviewMode(false);
    }
  };

  const exportToExcel = async () => {
    if (reportData.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No data to export. Generate a report first."
      });
      return;
    }

    // Lazy load XLSX library only when exporting
    const XLSX = await import('xlsx');

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${config.name || 'Custom_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Success",
      description: "Report exported to Excel successfully"
    });
  };

  const saveReport = () => {
    if (!config.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a report name"
      });
      return;
    }

    if (onSave) {
      onSave(config);
    }

    toast({
      title: "Success",
      description: "Report configuration saved successfully"
    });
  };

  const chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--chart-1))",
    }
  };

  const renderChart = () => {
    if (reportData.length === 0) return null;

    const chartData = reportData.slice(0, 10); // Limit for better visibility

    switch (config.chartType) {
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.fields[0]?.id} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={config.fields[1]?.id} fill="var(--color-value)" />
            </BarChart>
          </ChartContainer>
        );
      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.fields[0]?.id} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey={config.fields[1]?.id} stroke="var(--color-value)" />
            </LineChart>
          </ChartContainer>
        );
      case 'pie':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <PieChart>
              <Pie
                data={chartData.slice(0, 6)}
                dataKey={config.fields[1]?.id}
                nameKey={config.fields[0]?.id}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="var(--color-value)"
                label
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        );
      default:
        return (
          <Table>
            <TableHeader>
              <TableRow>
                {config.fields.map(field => (
                  <TableHead key={field.id}>{field.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.slice(0, 20).map((row, index) => (
                <TableRow key={index}>
                  {config.fields.map(field => (
                    <TableCell key={field.id}>
                      {typeof row[field.id] === 'boolean' 
                        ? (row[field.id] ? 'Yes' : 'No')
                        : field.type === 'number' && field.aggregation
                        ? Number(row[field.id]).toLocaleString()
                        : row[field.id]
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
    }
  };

  return (
    <div className="space-y-6">
      {!previewMode ? (
        <>
          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Configure your custom report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Report Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter report description"
                  />
                </div>
              </div>

              {/* Data Source */}
              <div>
                <Label htmlFor="dataSource">Data Source</Label>
                <Select
                  value={config.dataSource}
                  onValueChange={(value: ReportConfig['dataSource']) => setConfig(prev => ({
                    ...prev,
                    dataSource: value,
                    fields: [],
                    filters: []
                  }))}
                >
                  <SelectTrigger id="dataSource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="job_costs">Job Costs</SelectItem>
                    <SelectItem value="time_entries">Time Entries</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fields Selection */}
              <div>
                <Label>Select Fields</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Available Fields</p>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {AVAILABLE_FIELDS[config.dataSource].map(field => (
                        <button
                          type="button"
                          key={field.id}
                          className="flex w-full items-center justify-between p-2 text-left hover:bg-muted rounded cursor-pointer"
                          onClick={() => addField(field)}
                        >
                          <span className="text-sm">{field.name}</span>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Selected Fields</p>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {config.fields.map(field => (
                        <div key={field.id} className="flex items-center justify-between">
                          <Badge variant="secondary">{field.name}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Filters</Label>
                  <Button variant="outline" size="sm" onClick={addFilter}>
                    <Filter className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </div>
                <div className="space-y-2">
                  {config.filters.map((filter, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(index, { field: value })}
                      >
                        <SelectTrigger className="w-48" aria-label={`Filter ${index + 1} field`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FIELDS[config.dataSource].map(field => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={filter.operator}
                        onValueChange={(value: ReportFilter['operator']) => updateFilter(index, { operator: value })}
                      >
                        <SelectTrigger className="w-32" aria-label={`Filter ${index + 1} operator`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={filter.value as string}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        placeholder="Filter value"
                        aria-label={`Filter ${index + 1} value`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        aria-label={`Remove filter ${index + 1}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Type */}
              <div>
                <Label>Visualization</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { value: 'table', icon: FileSpreadsheet, label: 'Table' },
                    { value: 'bar', icon: BarChart3, label: 'Bar Chart' },
                    { value: 'line', icon: LineChartIcon, label: 'Line Chart' },
                    { value: 'pie', icon: PieChartIcon, label: 'Pie Chart' }
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={config.chartType === value ? 'default' : 'outline'}
                      className="flex-col h-16"
                      onClick={() => setConfig(prev => ({ ...prev, chartType: value as ReportConfig['chartType'] }))}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between">
                <div className="space-x-2">
                  <Button onClick={generateReport} disabled={isGenerating}>
                    <Eye className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Preview Report'}
                  </Button>
                  <Button variant="outline" onClick={saveReport}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Report Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{config.name || 'Custom Report'}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setPreviewMode(false)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={exportToExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};