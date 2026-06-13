import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
const CustomReportBuilder = React.lazy(() => import('@/components/reports/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })));
const ExecutiveDashboard = React.lazy(() => import('@/components/analytics/ExecutiveDashboard'));
import { FileSpreadsheet, FileText, Download, BarChart3, Settings } from 'lucide-react';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { MobilePageWrapper, mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';

interface ReportProject {
  id: string;
  name: string;
}

interface JobCost {
  date: string;
  description: string | null;
  cost_codes: { code: string; name: string } | null;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  total_cost: number | null;
  labor_hours: number | null;
}

interface ChangeOrder {
  change_order_number: string;
  title: string;
  amount: number;
  status: string;
  client_approved: boolean;
  internal_approved: boolean;
  created_at: string;
}

interface ProjectReportData {
  name: string;
  description: string | null;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number | null;
  site_address: string | null;
  job_costs: JobCost[];
  change_orders: ChangeOrder[];
  daily_reports: Record<string, unknown>[];
  time_entries: Record<string, unknown>[];
}

interface AutoTableDoc {
  autoTable: (options: Record<string, unknown>) => void;
  lastAutoTable: { finalY: number };
}

const Reports = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadProjects();
    }
  }, [user, userProfile, loading, navigate]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: unknown) {
      console.error('Error loading projects:', error);
    }
  };

  const generateProjectReport = async (format: 'excel' | 'pdf') => {
    try {
      setGenerating(true);
      
      // Load comprehensive project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          job_costs(*, cost_codes(code, name)),
          change_orders(*),
          daily_reports(*),
          time_entries(*, user_profiles(first_name, last_name))
        `)
        .eq('id', selectedProject)
        .single();

      if (projectError) throw projectError;

      if (format === 'excel') {
        await generateExcelReport(projectData);
      } else {
        await generatePDFReport(projectData);
      }

      toast({
        title: "Success",
        description: `${format.toUpperCase()} report generated successfully`
      });
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateExcelReport = async (projectData: ProjectReportData) => {
    // Lazy load XLSX library only when exporting
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    // Project Overview Sheet
    const projectSheet = XLSX.utils.json_to_sheet([{
      'Project Name': projectData.name,
      'Description': projectData.description,
      'Status': projectData.status,
      'Budget': projectData.budget,
      'Start Date': projectData.start_date,
      'End Date': projectData.end_date,
      'Completion %': projectData.completion_percentage,
      'Site Address': projectData.site_address
    }]);
    XLSX.utils.book_append_sheet(wb, projectSheet, 'Project Overview');

    // Job Costs Sheet
    if (projectData.job_costs?.length > 0) {
      const jobCostsSheet = XLSX.utils.json_to_sheet(
        projectData.job_costs.map((cost: JobCost) => ({
          'Date': cost.date,
          'Description': cost.description,
          'Cost Code': cost.cost_codes?.code,
          'Labor Cost': cost.labor_cost,
          'Material Cost': cost.material_cost,
          'Equipment Cost': cost.equipment_cost,
          'Total Cost': cost.total_cost,
          'Labor Hours': cost.labor_hours
        }))
      );
      XLSX.utils.book_append_sheet(wb, jobCostsSheet, 'Job Costs');
    }

    // Change Orders Sheet
    if (projectData.change_orders?.length > 0) {
      const changeOrdersSheet = XLSX.utils.json_to_sheet(
        projectData.change_orders.map((co: ChangeOrder) => ({
          'Number': co.change_order_number,
          'Title': co.title,
          'Amount': co.amount,
          'Status': co.status,
          'Client Approved': co.client_approved ? 'Yes' : 'No',
          'Internal Approved': co.internal_approved ? 'Yes' : 'No',
          'Created Date': co.created_at
        }))
      );
      XLSX.utils.book_append_sheet(wb, changeOrdersSheet, 'Change Orders');
    }

    // Save file
    XLSX.writeFile(wb, `${projectData.name}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generatePDFReport = async (projectData: ProjectReportData) => {
    // Lazy load jsPDF library only when exporting
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Project Report', 20, 20);
    
    // Project Info
    doc.setFontSize(12);
    doc.text(`Project: ${projectData.name}`, 20, 40);
    doc.text(`Status: ${projectData.status}`, 20, 50);
    doc.text(`Budget: $${projectData.budget?.toLocaleString() || 0}`, 20, 60);
    doc.text(`Progress: ${projectData.completion_percentage || 0}%`, 20, 70);

    let yPosition = 90;

    // Job Costs Table
    if (projectData.job_costs?.length > 0) {
      doc.text('Job Costs', 20, yPosition);
      yPosition += 10;
      
      (doc as unknown as AutoTableDoc).autoTable({
        startY: yPosition,
        head: [['Date', 'Description', 'Labor', 'Materials', 'Equipment', 'Total']],
        body: projectData.job_costs.map((cost: JobCost) => [
          cost.date,
          cost.description || '',
          `$${cost.labor_cost || 0}`,
          `$${cost.material_cost || 0}`,
          `$${cost.equipment_cost || 0}`,
          `$${cost.total_cost || 0}`
        ]),
      });
      
      yPosition = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 20;
    }

    // Change Orders Table
    if (projectData.change_orders?.length > 0) {
      doc.text('Change Orders', 20, yPosition);
      yPosition += 10;
      
      (doc as unknown as AutoTableDoc).autoTable({
        startY: yPosition,
        head: [['Number', 'Title', 'Amount', 'Status', 'Client Approved']],
        body: projectData.change_orders.map((co: ChangeOrder) => [
          co.change_order_number,
          co.title,
          `$${co.amount}`,
          co.status,
          co.client_approved ? 'Yes' : 'No'
        ]),
      });
    }

    // Save PDF
    doc.save(`${projectData.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <AccessiblePageWrapper pageTitle="Reports">
      <DashboardLayout title="Reports & Analytics" hasAccessibleWrapper>
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading content">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
            </div>
            <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
          </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Reports">
    <DashboardLayout title="Reports & Analytics" hasAccessibleWrapper>
      <MobilePageWrapper title="Reports & Analytics">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
            <TabsTrigger value="dashboard" className={mobileTextClasses.body}>
              <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Executive Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="builder" className={mobileTextClasses.body}>
              <Settings className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Custom Reports</span>
              <span className="sm:hidden">Custom</span>
            </TabsTrigger>
            <TabsTrigger value="exports" className={mobileTextClasses.body}>
              <Download className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Export Center</span>
              <span className="sm:hidden">Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
              <ExecutiveDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="builder">
            <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
              <CustomReportBuilder
                onSave={(config) => {
                  toast({
                    title: "Success",
                    description: "Report configuration saved successfully"
                  });
                }}
                onExecute={(config) => {
                }}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="exports" className="space-y-6">
            <Card className={mobileCardClasses.container}>
              <CardHeader className={mobileCardClasses.header}>
                <CardTitle className={mobileTextClasses.cardTitle}>Project Report Generator</CardTitle>
                <CardDescription className={mobileTextClasses.muted}>Generate comprehensive reports with job costs, change orders, and progress data</CardDescription>
              </CardHeader>
              <CardContent className={mobileCardClasses.content}>
                <div className={mobileFilterClasses.container}>
                  <div>
                    <Label htmlFor="project">Select Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project: ReportProject) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date-range">Date Range</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      />
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={mobileFilterClasses.buttonGroup}>
                  <Button
                    onClick={() => generateProjectReport('excel')}
                    disabled={!selectedProject || generating}
                    className={mobileButtonClasses.primary}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">{generating ? 'Generating...' : 'Export to Excel'}</span>
                    <span className="sm:hidden">Excel</span>
                  </Button>
                  <Button
                    onClick={() => generateProjectReport('pdf')}
                    disabled={!selectedProject || generating}
                    variant="outline"
                    className={mobileButtonClasses.secondary}
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">{generating ? 'Generating...' : 'Export to PDF'}</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className={mobileGridClasses.twoColumn}>
              <Card className={mobileCardClasses.container}>
                <CardHeader className={mobileCardClasses.header}>
                  <CardTitle className={mobileTextClasses.cardTitle}>Financial Summary</CardTitle>
                  <CardDescription className={mobileTextClasses.muted}>Project costs and profitability</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className={mobileButtonClasses.primary} variant="outline">
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">Generate Financial Report</span>
                    <span className="sm:hidden">Financial</span>
                  </Button>
                </CardContent>
              </Card>

              <Card className={mobileCardClasses.container}>
                <CardHeader className={mobileCardClasses.header}>
                  <CardTitle className={mobileTextClasses.cardTitle}>Time Tracking</CardTitle>
                  <CardDescription className={mobileTextClasses.muted}>Labor hours and productivity</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className={mobileButtonClasses.primary} variant="outline">
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">Generate Time Report</span>
                    <span className="sm:hidden">Time</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </MobilePageWrapper>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default Reports;