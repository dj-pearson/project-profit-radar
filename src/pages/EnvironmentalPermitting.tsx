import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Search, AlertTriangle, Calendar, CheckCircle, Clock, FileText, Building2, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function EnvironmentalPermitting() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("permits");
  const [editingPermit, setEditingPermit] = useState<any>(null);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
  const [editingMonitoring, setEditingMonitoring] = useState<any>(null);
  const { toast } = useToast();

  const handleEditPermit = (permit: any) => {
    setEditingPermit({ ...permit });
  };

  const handleSavePermit = () => {
    toast({
      title: "Permit Updated",
      description: "Environmental permit has been successfully updated.",
    });
    setEditingPermit(null);
  };

  const handleEditAssessment = (assessment: any) => {
    setEditingAssessment({ ...assessment });
  };

  const handleSaveAssessment = () => {
    toast({
      title: "Assessment Updated", 
      description: "NEPA assessment has been successfully updated.",
    });
    setEditingAssessment(null);
  };

  const handleEditMonitoring = (monitoring: any) => {
    setEditingMonitoring({ ...monitoring });
  };

  const handleSaveMonitoring = () => {
    toast({
      title: "Monitoring Updated",
      description: "Monitoring data has been successfully updated.",
    });
    setEditingMonitoring(null);
  };

  // Mock data for demonstration
  const permits = [
    {
      id: "1",
      permit_number: "ENV-2024-0001",
      permit_name: "Clean Water Act Section 404 Permit",
      permit_type: "wetlands",
      issuing_agency: "army_corps",
      status: "approved",
      nepa_category: "environmental_assessment",
      application_date: "2024-01-15",
      expiration_date: "2026-01-15",
      compliance_status: "compliant",
      priority: "high",
      assigned_to: "Environmental Coordinator"
    },
    {
      id: "2", 
      permit_number: "ENV-2024-0002",
      permit_name: "NPDES Storm Water Permit",
      permit_type: "storm_water",
      issuing_agency: "epa",
      status: "under_review",
      nepa_category: "categorical_exclusion",
      application_date: "2024-02-20",
      target_decision_date: "2024-05-20",
      compliance_status: "pending_review",
      priority: "medium",
      assigned_to: "Project Manager"
    },
    {
      id: "3",
      permit_number: "ENV-2024-0003", 
      permit_name: "Endangered Species Act Consultation",
      permit_type: "endangered_species",
      issuing_agency: "usfws",
      status: "pending",
      nepa_category: "environmental_impact_statement",
      application_date: "2024-03-10",
      compliance_status: "unknown",
      priority: "critical",
      assigned_to: "Environmental Specialist"
    }
  ];

  const assessments = [
    {
      id: "1",
      permit_id: "1",
      assessment_type: "environmental_assessment",
      lead_agency: "U.S. Army Corps of Engineers",
      nepa_process_stage: "final_document",
      finding: "finding_of_no_significant_impact",
      decision_date: "2024-01-10",
      prepared_by: "Environmental Consultant"
    },
    {
      id: "2",
      permit_id: "3", 
      assessment_type: "environmental_impact_statement",
      lead_agency: "U.S. Fish and Wildlife Service",
      nepa_process_stage: "scoping",
      scoping_period_start: "2024-03-15",
      scoping_period_end: "2024-04-15",
      prepared_by: "NEPA Specialist"
    }
  ];

  const monitoringData = [
    {
      id: "1",
      permit_id: "1",
      monitoring_type: "water_quality",
      parameter_measured: "Turbidity",
      measured_value: 2.5,
      permit_limit: 5.0,
      measurement_unit: "NTU",
      measurement_date: "2024-04-01",
      within_limits: true,
      monitoring_location: "Wetland Area A"
    },
    {
      id: "2",
      permit_id: "2",
      monitoring_type: "storm_water",
      parameter_measured: "Total Suspended Solids",
      measured_value: 35,
      permit_limit: 30,
      measurement_unit: "mg/L",
      measurement_date: "2024-04-05",
      within_limits: false,
      exceedance_level: 16.7,
      monitoring_location: "Outfall 001"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "outline" as const, label: "Pending", icon: Clock },
      under_review: { variant: "secondary" as const, label: "Under Review", icon: FileText },
      approved: { variant: "default" as const, label: "Approved", icon: CheckCircle },
      conditional_approval: { variant: "secondary" as const, label: "Conditional", icon: AlertTriangle },
      denied: { variant: "destructive" as const, label: "Denied", icon: AlertTriangle },
      expired: { variant: "destructive" as const, label: "Expired", icon: Calendar },
      suspended: { variant: "destructive" as const, label: "Suspended", icon: AlertTriangle },
      renewed: { variant: "default" as const, label: "Renewed", icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: "outline" as const, label: "Low" },
      medium: { variant: "secondary" as const, label: "Medium" },
      high: { variant: "default" as const, label: "High" },
      critical: { variant: "destructive" as const, label: "Critical" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge variant={config?.variant}>{config?.label || priority}</Badge>;
  };

  const getComplianceBadge = (status: string) => {
    const complianceConfig = {
      compliant: { variant: "default" as const, label: "Compliant", color: "text-green-600" },
      minor_violation: { variant: "secondary" as const, label: "Minor Issues", color: "text-yellow-600" },
      major_violation: { variant: "destructive" as const, label: "Major Violation", color: "text-red-600" },
      pending_review: { variant: "outline" as const, label: "Pending Review", color: "text-blue-600" },
      unknown: { variant: "outline" as const, label: "Unknown", color: "text-gray-600" }
    };
    
    const config = complianceConfig[status as keyof typeof complianceConfig];
    return <Badge variant={config?.variant}>{config?.label || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout title="Environmental Permitting" showTrialBanner={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Environmental Permitting</h1>
            <p className="text-sm sm:text-base text-muted-foreground">NEPA compliance and environmental permits</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Permit Application</span>
                <span className="sm:hidden">New Permit</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Environmental Permit Application</DialogTitle>
                <DialogDescription>
                  Start a new environmental permit application with NEPA compliance
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Permit application form would be implemented here with all required fields for environmental permitting.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1">
          <TabsTrigger value="permits" className="text-xs sm:text-sm">Permits</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs sm:text-sm">NEPA</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs sm:text-sm">Monitoring</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs sm:text-sm">Compliance</TabsTrigger>
          <TabsTrigger value="coordination" className="text-xs sm:text-sm col-span-2 sm:col-span-1">Agency Coord</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permits, assessments, or monitoring data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm"
          />
        </div>

        <TabsContent value="permits" className="space-y-4">
          <div className="grid gap-4">
            {permits.map((permit) => (
              <Card key={permit.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base sm:text-lg flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                        <span className="break-words">{permit.permit_name}</span>
                        {getPriorityBadge(permit.priority)}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {permit.permit_number} • {permit.permit_type.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(permit.status)}
                      {getComplianceBadge(permit.compliance_status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-muted-foreground text-xs">Agency</div>
                        <div className="text-xs sm:text-sm truncate">{permit.issuing_agency.replace('_', ' ').toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-muted-foreground text-xs">NEPA Category</div>
                        <div className="capitalize text-xs sm:text-sm truncate">{permit.nepa_category?.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-muted-foreground text-xs">Applied</div>
                        <div className="text-xs sm:text-sm">{formatDate(permit.application_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-muted-foreground text-xs">
                          {permit.expiration_date ? "Expires" : "Decision Due"}
                        </div>
                        <div className="text-xs sm:text-sm">
                          {permit.expiration_date ? 
                            formatDate(permit.expiration_date) : 
                            formatDate(permit.target_decision_date || permit.application_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-xs sm:text-sm">
                      <span className="font-medium">Assigned to: </span>
                      <span className="break-words">{permit.assigned_to}</span>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Documents</span>
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3">
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Compliance</span>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="text-xs px-2 sm:px-3" onClick={() => handleEditPermit(permit)}>
                            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Environmental Permit</DialogTitle>
                            <DialogDescription>
                              Update permit information and compliance status
                            </DialogDescription>
                          </DialogHeader>
                          {editingPermit && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="permit-name">Permit Name</Label>
                                  <Input
                                    id="permit-name"
                                    value={editingPermit.permit_name}
                                    onChange={(e) => setEditingPermit({...editingPermit, permit_name: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="permit-number">Permit Number</Label>
                                  <Input
                                    id="permit-number"
                                    value={editingPermit.permit_number}
                                    onChange={(e) => setEditingPermit({...editingPermit, permit_number: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="permit-type">Permit Type</Label>
                                  <Select
                                    value={editingPermit.permit_type}
                                    onValueChange={(value) => setEditingPermit({...editingPermit, permit_type: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="wetlands">Wetlands</SelectItem>
                                      <SelectItem value="storm_water">Storm Water</SelectItem>
                                      <SelectItem value="endangered_species">Endangered Species</SelectItem>
                                      <SelectItem value="air_quality">Air Quality</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="status">Status</Label>
                                  <Select
                                    value={editingPermit.status}
                                    onValueChange={(value) => setEditingPermit({...editingPermit, status: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="under_review">Under Review</SelectItem>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="denied">Denied</SelectItem>
                                      <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="priority">Priority</Label>
                                  <Select
                                    value={editingPermit.priority}
                                    onValueChange={(value) => setEditingPermit({...editingPermit, priority: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="assigned-to">Assigned To</Label>
                                  <Input
                                    id="assigned-to"
                                    value={editingPermit.assigned_to}
                                    onChange={(e) => setEditingPermit({...editingPermit, assigned_to: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingPermit(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleSavePermit}>
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <div className="grid gap-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        {assessment.assessment_type.replace('_', ' ').toUpperCase()}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Lead Agency: {assessment.lead_agency}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="self-start">
                      {assessment.nepa_process_stage.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-4">
                    <div>
                      <div className="font-medium text-muted-foreground text-xs">Assessment Type</div>
                      <div className="capitalize text-xs sm:text-sm">{assessment.assessment_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground text-xs">Process Stage</div>
                      <div className="capitalize text-xs sm:text-sm">{assessment.nepa_process_stage.replace('_', ' ')}</div>
                    </div>
                    {assessment.finding && (
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Finding</div>
                        <div className="capitalize text-xs sm:text-sm">{assessment.finding.replace('_', ' ')}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-xs sm:text-sm">
                      <span className="font-medium">Prepared by: </span>
                      <span className="break-words">{assessment.prepared_by}</span>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Assessment Document</span>
                        <span className="sm:hidden">Doc</span>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="text-xs px-2 sm:px-3" onClick={() => handleEditAssessment(assessment)}>
                            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit NEPA Assessment</DialogTitle>
                            <DialogDescription>
                              Update assessment information and status
                            </DialogDescription>
                          </DialogHeader>
                          {editingAssessment && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="assessment-type">Assessment Type</Label>
                                  <Select
                                    value={editingAssessment.assessment_type}
                                    onValueChange={(value) => setEditingAssessment({...editingAssessment, assessment_type: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="environmental_assessment">Environmental Assessment</SelectItem>
                                      <SelectItem value="environmental_impact_statement">Environmental Impact Statement</SelectItem>
                                      <SelectItem value="categorical_exclusion">Categorical Exclusion</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="lead-agency">Lead Agency</Label>
                                  <Input
                                    id="lead-agency"
                                    value={editingAssessment.lead_agency}
                                    onChange={(e) => setEditingAssessment({...editingAssessment, lead_agency: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="process-stage">Process Stage</Label>
                                  <Select
                                    value={editingAssessment.nepa_process_stage}
                                    onValueChange={(value) => setEditingAssessment({...editingAssessment, nepa_process_stage: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="scoping">Scoping</SelectItem>
                                      <SelectItem value="draft_document">Draft Document</SelectItem>
                                      <SelectItem value="public_comment">Public Comment</SelectItem>
                                      <SelectItem value="final_document">Final Document</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="prepared-by">Prepared By</Label>
                                  <Input
                                    id="prepared-by"
                                    value={editingAssessment.prepared_by}
                                    onChange={(e) => setEditingAssessment({...editingAssessment, prepared_by: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingAssessment(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleSaveAssessment}>
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4">
            {monitoringData.map((monitoring) => (
              <Card key={monitoring.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        {monitoring.parameter_measured}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {monitoring.monitoring_type.replace('_', ' ')} monitoring at {monitoring.monitoring_location}
                      </CardDescription>
                    </div>
                    <Badge variant={monitoring.within_limits ? "default" : "destructive"} className="self-start">
                      {monitoring.within_limits ? "Within Limits" : "Exceedance"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <div className="font-medium text-muted-foreground text-xs">Measured Value</div>
                      <div className="text-base sm:text-lg font-semibold">
                        {monitoring.measured_value} {monitoring.measurement_unit}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground text-xs">Permit Limit</div>
                      <div className="text-xs sm:text-sm">{monitoring.permit_limit} {monitoring.measurement_unit}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground text-xs">Date Measured</div>
                      <div className="text-xs sm:text-sm">{formatDate(monitoring.measurement_date)}</div>
                    </div>
                    {monitoring.exceedance_level && (
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Exceedance</div>
                        <div className="text-red-600 font-semibold text-xs sm:text-sm">+{monitoring.exceedance_level}%</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-xs sm:text-sm">
                      <span className="font-medium">Location: </span>
                      <span className="break-words">{monitoring.monitoring_location}</span>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View Data</span>
                        <span className="sm:hidden">Data</span>
                      </Button>
                      {!monitoring.within_limits && (
                        <Button variant="destructive" size="sm" className="text-xs px-2 sm:px-3">
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Corrective Action</span>
                          <span className="sm:hidden">Action</span>
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="text-xs px-2 sm:px-3" onClick={() => handleEditMonitoring(monitoring)}>
                            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Monitoring Data</DialogTitle>
                            <DialogDescription>
                              Update monitoring information and measurement data
                            </DialogDescription>
                          </DialogHeader>
                          {editingMonitoring && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="parameter">Parameter Measured</Label>
                                  <Input
                                    id="parameter"
                                    value={editingMonitoring.parameter_measured}
                                    onChange={(e) => setEditingMonitoring({...editingMonitoring, parameter_measured: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="monitoring-type">Monitoring Type</Label>
                                  <Select
                                    value={editingMonitoring.monitoring_type}
                                    onValueChange={(value) => setEditingMonitoring({...editingMonitoring, monitoring_type: value})}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="water_quality">Water Quality</SelectItem>
                                      <SelectItem value="storm_water">Storm Water</SelectItem>
                                      <SelectItem value="air_quality">Air Quality</SelectItem>
                                      <SelectItem value="noise">Noise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="measured-value">Measured Value</Label>
                                  <Input
                                    id="measured-value"
                                    type="number"
                                    value={editingMonitoring.measured_value}
                                    onChange={(e) => setEditingMonitoring({...editingMonitoring, measured_value: parseFloat(e.target.value)})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="permit-limit">Permit Limit</Label>
                                  <Input
                                    id="permit-limit"
                                    type="number"
                                    value={editingMonitoring.permit_limit}
                                    onChange={(e) => setEditingMonitoring({...editingMonitoring, permit_limit: parseFloat(e.target.value)})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="unit">Unit</Label>
                                  <Input
                                    id="unit"
                                    value={editingMonitoring.measurement_unit}
                                    onChange={(e) => setEditingMonitoring({...editingMonitoring, measurement_unit: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="location">Monitoring Location</Label>
                                <Input
                                  id="location"
                                  value={editingMonitoring.monitoring_location}
                                  onChange={(e) => setEditingMonitoring({...editingMonitoring, monitoring_location: e.target.value})}
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setEditingMonitoring(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleSaveMonitoring}>
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>
                Environmental permit compliance status and upcoming deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-muted-foreground">Compliant Permits</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">1</div>
                  <div className="text-sm text-muted-foreground">Minor Issues</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-muted-foreground">Violations</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <div className="text-sm text-muted-foreground">Upcoming Renewals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coordination" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agency Coordination</CardTitle>
              <CardDescription>
                Track communications and coordination with regulatory agencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Active Coordination</h3>
                <p className="text-muted-foreground mb-4">
                  Agency coordination activities will appear here
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Initiate Coordination
                </Button>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}