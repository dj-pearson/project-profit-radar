import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Search, AlertTriangle, Calendar, CheckCircle, Clock, FileText, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function EnvironmentalPermitting() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("permits");
  const { toast } = useToast();

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environmental Permitting</h1>
          <p className="text-muted-foreground mt-2">
            NEPA compliance, EPA coordination, and environmental permit management
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Permit Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
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
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="permits">Permits</TabsTrigger>
          <TabsTrigger value="assessments">NEPA Assessments</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="coordination">Agency Coordination</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permits, assessments, or monitoring data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="permits" className="space-y-4">
          <div className="grid gap-4">
            {permits.map((permit) => (
              <Card key={permit.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {permit.permit_name}
                        {getPriorityBadge(permit.priority)}
                      </CardTitle>
                      <CardDescription>
                        {permit.permit_number} • {permit.permit_type.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(permit.status)}
                      {getComplianceBadge(permit.compliance_status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Agency</div>
                        <div>{permit.issuing_agency.replace('_', ' ').toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">NEPA Category</div>
                        <div className="capitalize">{permit.nepa_category?.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Applied</div>
                        <div>{formatDate(permit.application_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">
                          {permit.expiration_date ? "Expires" : "Decision Due"}
                        </div>
                        <div>
                          {permit.expiration_date ? 
                            formatDate(permit.expiration_date) : 
                            formatDate(permit.target_decision_date || permit.application_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Assigned to: </span>
                      <span>{permit.assigned_to}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Documents
                      </Button>
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Compliance
                      </Button>
                      <Button size="sm">
                        View Details
                      </Button>
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
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {assessment.assessment_type.replace('_', ' ').toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        Lead Agency: {assessment.lead_agency}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {assessment.nepa_process_stage.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <div className="font-medium text-muted-foreground">Assessment Type</div>
                      <div className="capitalize">{assessment.assessment_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Process Stage</div>
                      <div className="capitalize">{assessment.nepa_process_stage.replace('_', ' ')}</div>
                    </div>
                    {assessment.finding && (
                      <div>
                        <div className="font-medium text-muted-foreground">Finding</div>
                        <div className="capitalize">{assessment.finding.replace('_', ' ')}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Prepared by: </span>
                      <span>{assessment.prepared_by}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Assessment Document
                      </Button>
                      <Button size="sm">
                        View Details
                      </Button>
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
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {monitoring.parameter_measured}
                      </CardTitle>
                      <CardDescription>
                        {monitoring.monitoring_type.replace('_', ' ')} monitoring at {monitoring.monitoring_location}
                      </CardDescription>
                    </div>
                    <Badge variant={monitoring.within_limits ? "default" : "destructive"}>
                      {monitoring.within_limits ? "Within Limits" : "Exceedance"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="font-medium text-muted-foreground">Measured Value</div>
                      <div className="text-lg font-semibold">
                        {monitoring.measured_value} {monitoring.measurement_unit}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Permit Limit</div>
                      <div>{monitoring.permit_limit} {monitoring.measurement_unit}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Date Measured</div>
                      <div>{formatDate(monitoring.measurement_date)}</div>
                    </div>
                    {monitoring.exceedance_level && (
                      <div>
                        <div className="font-medium text-muted-foreground">Exceedance</div>
                        <div className="text-red-600 font-semibold">+{monitoring.exceedance_level}%</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Location: </span>
                      <span>{monitoring.monitoring_location}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Data
                      </Button>
                      {!monitoring.within_limits && (
                        <Button variant="destructive" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Corrective Action
                        </Button>
                      )}
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
  );
}