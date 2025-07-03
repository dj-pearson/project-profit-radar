import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileSpreadsheet, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Reports = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
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
    
    if (!loading && user && userProfile && !userProfile.company_id) {
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
    } catch (error: any) {
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
        generateExcelReport(projectData);
      } else {
        generatePDFReport(projectData);
      }

      toast({
        title: "Success",
        description: `${format.toUpperCase()} report generated successfully`
      });
    } catch (error: any) {
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

  const generateExcelReport = (projectData: any) => {
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
        projectData.job_costs.map((cost: any) => ({
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
        projectData.change_orders.map((co: any) => ({
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

  const generatePDFReport = (projectData: any) => {
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
      
      (doc as any).autoTable({
        startY: yPosition,
        head: [['Date', 'Description', 'Labor', 'Materials', 'Equipment', 'Total']],
        body: projectData.job_costs.map((cost: any) => [
          cost.date,
          cost.description || '',
          `$${cost.labor_cost || 0}`,
          `$${cost.material_cost || 0}`,
          `$${cost.equipment_cost || 0}`,
          `$${cost.total_cost || 0}`
        ]),
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Change Orders Table
    if (projectData.change_orders?.length > 0) {
      doc.text('Change Orders', 20, yPosition);
      yPosition += 10;
      
      (doc as any).autoTable({
        startY: yPosition,
        head: [['Number', 'Title', 'Amount', 'Status', 'Client Approved']],
        body: projectData.change_orders.map((co: any) => [
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Advanced Reports</h1>
                <p className="text-sm text-muted-foreground">Generate detailed project reports for export</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Project Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Project Report Generator</CardTitle>
            <CardDescription>Generate comprehensive reports with job costs, change orders, and progress data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project">Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <div className="flex space-x-2">
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
            
            <div className="flex space-x-4">
              <Button
                onClick={() => generateProjectReport('excel')}
                disabled={!selectedProject || generating}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Export to Excel'}
              </Button>
              <Button
                onClick={() => generateProjectReport('pdf')}
                disabled={!selectedProject || generating}
                variant="outline"
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Export to PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Project costs and profitability</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Generate Financial Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Tracking</CardTitle>
              <CardDescription>Labor hours and productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Generate Time Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;