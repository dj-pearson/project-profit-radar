import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  HardHat
} from 'lucide-react';

export default function SafetyManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("incidents");

  // Mock data
  const incidents = [
    {
      id: "INC-001",
      title: "Minor Cut on Hand",
      description: "Worker received small cut while handling materials",
      incident_type: "injury",
      severity: "minor",
      status: "investigating",
      reported_by: "John Smith",
      incident_date: "2024-04-10",
      location: "Building Site A",
      injured_person: "Mike Johnson",
      project_name: "Office Complex"
    },
    {
      id: "INC-002",
      title: "Near Miss - Falling Equipment",
      description: "Crane load shifted unexpectedly but no contact made",
      incident_type: "near_miss",
      severity: "high",
      status: "closed",
      reported_by: "Sarah Wilson",
      incident_date: "2024-04-08",
      location: "Construction Zone B",
      injured_person: null,
      project_name: "Residential Complex"
    },
    {
      id: "INC-003",
      title: "Slip and Fall",
      description: "Worker slipped on wet surface in break area",
      incident_type: "injury",
      severity: "moderate",
      status: "open",
      reported_by: "David Brown",
      incident_date: "2024-04-12",
      location: "Site Trailer",
      injured_person: "Lisa Anderson",
      project_name: "Warehouse Project"
    }
  ];

  const trainings = [
    {
      id: "1",
      title: "OSHA 10-Hour Construction Safety",
      type: "certification",
      duration: "10 hours",
      valid_for: "5 years",
      completion_rate: 85,
      scheduled_date: "2024-04-20",
      instructor: "Safety Training Corp"
    },
    {
      id: "2",
      title: "Fall Protection Training",
      type: "refresher",
      duration: "4 hours", 
      valid_for: "1 year",
      completion_rate: 92,
      scheduled_date: "2024-04-25",
      instructor: "Internal Safety Team"
    },
    {
      id: "3",
      title: "Equipment Safety Orientation",
      type: "orientation",
      duration: "2 hours",
      valid_for: "6 months",
      completion_rate: 100,
      scheduled_date: "2024-04-15",
      instructor: "Equipment Specialists"
    }
  ];

  const inspections = [
    {
      id: "1",
      inspection_type: "Site Safety Audit",
      inspector: "Safety Coordinator",
      inspection_date: "2024-04-10",
      status: "completed",
      score: 95,
      violations: 1,
      project_name: "Office Complex",
      next_inspection: "2024-05-10"
    },
    {
      id: "2", 
      inspection_type: "Equipment Inspection",
      inspector: "Certified Technician",
      inspection_date: "2024-04-08",
      status: "completed",
      score: 88,
      violations: 3,
      project_name: "Residential Complex",
      next_inspection: "2024-05-08"
    },
    {
      id: "3",
      inspection_type: "OSHA Compliance Check",
      inspector: "OSHA Inspector",
      inspection_date: "2024-04-15",
      status: "pending",
      score: null,
      violations: null,
      project_name: "Warehouse Project",
      next_inspection: null
    }
  ];

  const getStatusBadge = (status: string, type: 'incident' | 'inspection' = 'incident') => {
    if (type === 'incident') {
      const incidentConfig: Record<string, { variant: any; label: string; icon: any }> = {
        open: { variant: "destructive" as const, label: "Open", icon: AlertTriangle },
        investigating: { variant: "secondary" as const, label: "Investigating", icon: Clock },
        closed: { variant: "default" as const, label: "Closed", icon: CheckCircle }
      };
      
      const statusData = incidentConfig[status] || { variant: "outline" as const, label: status, icon: Clock };
      const Icon = statusData.icon;
      
      return (
        <Badge variant={statusData.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {statusData.label}
        </Badge>
      );
    } else {
      const inspectionConfig: Record<string, { variant: any; label: string; icon: any }> = {
        completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
        pending: { variant: "secondary" as const, label: "Pending", icon: Clock },
        failed: { variant: "destructive" as const, label: "Failed", icon: XCircle }
      };
      
      const statusData = inspectionConfig[status] || { variant: "outline" as const, label: status, icon: Clock };
      const Icon = statusData.icon;
      
      return (
        <Badge variant={statusData.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {statusData.label}
        </Badge>
      );
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      minor: { variant: "outline" as const, label: "Minor" },
      moderate: { variant: "secondary" as const, label: "Moderate" },
      major: { variant: "destructive" as const, label: "Major" },
      high: { variant: "destructive" as const, label: "High" },
      critical: { variant: "destructive" as const, label: "Critical" }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig];
    return <Badge variant={config?.variant}>{config?.label || severity}</Badge>;
  };

  return (
    <DashboardLayout title="Safety Management" showTrialBanner={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Safety Management</h1>
            <p className="text-muted-foreground">Manage workplace safety, incidents, and compliance</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Report Safety Incident</DialogTitle>
                  <DialogDescription>
                    Report a workplace safety incident or near miss
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="incident-title">Incident Title</Label>
                    <Input id="incident-title" placeholder="Brief description of incident" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="incident-type">Incident Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="injury">Injury</SelectItem>
                          <SelectItem value="near_miss">Near Miss</SelectItem>
                          <SelectItem value="property_damage">Property Damage</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="severity">Severity</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="incident-date">Date & Time</Label>
                      <Input id="incident-date" type="datetime-local" />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="Where did this occur?" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="injured-person">Injured Person (if applicable)</Label>
                    <Input id="injured-person" placeholder="Name of injured person" />
                  </div>
                  <div>
                    <Label htmlFor="description">Detailed Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Provide detailed description of what happened..."
                      rows={4}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents, training, or inspections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="incidents" className="space-y-4">
            <div className="grid gap-4">
              {incidents.map((incident) => (
                <Card key={incident.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          {incident.title}
                        </CardTitle>
                        <CardDescription>
                          {incident.id} • {incident.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status, 'incident')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Type</div>
                        <div className="capitalize">{incident.incident_type.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Date</div>
                        <div>{new Date(incident.incident_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Location</div>
                        <div>{incident.location}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Reported By</div>
                        <div>{incident.reported_by}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">Project: </span>
                        <span>{incident.project_name}</span>
                        {incident.injured_person && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Injured: </span>
                            <span>{incident.injured_person}</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Report
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

          <TabsContent value="training" className="space-y-4">
            <div className="grid gap-4">
              {trainings.map((training) => (
                <Card key={training.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <HardHat className="h-5 w-5" />
                          {training.title}
                        </CardTitle>
                        <CardDescription>
                          {training.type} • {training.duration} • Valid for {training.valid_for}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {training.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Instructor</div>
                        <div>{training.instructor}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Scheduled Date</div>
                        <div>{new Date(training.scheduled_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Completion Rate</div>
                        <div className="font-semibold">{training.completion_rate}%</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Duration</div>
                        <div>{training.duration}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Attendees
                      </Button>
                      <Button size="sm">
                        View Training
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-4">
            <div className="grid gap-4">
              {inspections.map((inspection) => (
                <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          {inspection.inspection_type}
                        </CardTitle>
                        <CardDescription>
                          {inspection.project_name} • Conducted by {inspection.inspector}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(inspection.status, 'inspection')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Date</div>
                        <div>{new Date(inspection.inspection_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Score</div>
                        <div className="font-semibold">
                          {inspection.score ? `${inspection.score}%` : 'Pending'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Violations</div>
                        <div className={inspection.violations === 0 ? 'text-green-600' : 'text-red-600'}>
                          {inspection.violations !== null ? inspection.violations : 'TBD'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Next Inspection</div>
                        <div>
                          {inspection.next_inspection ? new Date(inspection.next_inspection).toLocaleDateString() : 'TBD'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                      <Button size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2</div>
                  <div className="text-sm text-red-600">Requires attention</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Days Since Last Incident</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-muted-foreground">Current streak</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">92%</div>
                  <div className="text-sm text-green-600">Above target</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">91.5</div>
                  <div className="text-sm text-green-600">+2.5 from last month</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}