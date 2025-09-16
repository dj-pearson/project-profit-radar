import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, MapPin, Clock, Users, Wrench, AlertTriangle, CheckCircle, Upload, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldReport {
  id: string;
  type: 'daily' | 'progress' | 'issue' | 'safety' | 'weather';
  title: string;
  description: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  reportedBy: string;
  reportedAt: Date;
  photos: string[];
  status: 'draft' | 'submitted' | 'approved';
  weather?: WeatherConditions;
  crew: CrewMember[];
  equipment: EquipmentUsage[];
  materials: MaterialUsage[];
  workCompleted: string[];
  issues: Issue[];
}

interface WeatherConditions {
  temperature: number;
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  visibility: 'good' | 'fair' | 'poor';
  workImpact: 'none' | 'minor' | 'major';
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  hoursWorked: number;
  present: boolean;
}

interface EquipmentUsage {
  id: string;
  name: string;
  hoursUsed: number;
  condition: 'good' | 'needs_maintenance' | 'out_of_service';
  notes?: string;
}

interface MaterialUsage {
  id: string;
  name: string;
  quantityUsed: number;
  unit: string;
  delivered: boolean;
  notes?: string;
}

interface Issue {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
}

export const FieldReportingSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [currentReport, setCurrentReport] = useState<Partial<FieldReport>>({});
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockReports: FieldReport[] = [
      {
        id: '1',
        type: 'daily',
        title: 'Daily Progress Report - Foundation',
        description: 'Continued foundation work on west side. Concrete pour completed.',
        location: 'Building A - West Foundation',
        reportedBy: 'Site Supervisor',
        reportedAt: new Date(),
        photos: ['/reports/foundation-1.jpg', '/reports/foundation-2.jpg'],
        status: 'submitted',
        weather: {
          temperature: 72,
          conditions: 'sunny',
          visibility: 'good',
          workImpact: 'none'
        },
        crew: [
          { id: '1', name: 'John Smith', role: 'Foreman', hoursWorked: 8, present: true },
          { id: '2', name: 'Mike Johnson', role: 'Laborer', hoursWorked: 8, present: true },
          { id: '3', name: 'Sarah Wilson', role: 'Equipment Operator', hoursWorked: 6, present: true }
        ],
        equipment: [
          { id: '1', name: 'Excavator CAT 320', hoursUsed: 6, condition: 'good' },
          { id: '2', name: 'Concrete Mixer', hoursUsed: 4, condition: 'good' }
        ],
        materials: [
          { id: '1', name: 'Concrete', quantityUsed: 25, unit: 'cubic yards', delivered: true },
          { id: '2', name: 'Rebar', quantityUsed: 1000, unit: 'linear feet', delivered: true }
        ],
        workCompleted: [
          'Foundation forms set on west side',
          'Rebar placement completed',
          'Concrete pour - 25 cubic yards',
          'Initial curing started'
        ],
        issues: []
      },
      {
        id: '2',
        type: 'issue',
        title: 'Equipment Breakdown - Crane',
        description: 'Main crane experienced hydraulic failure. Work halted.',
        location: 'Main Construction Site',
        reportedBy: 'Equipment Operator',
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        photos: ['/reports/crane-issue.jpg'],
        status: 'submitted',
        crew: [],
        equipment: [],
        materials: [],
        workCompleted: [],
        issues: [
          {
            id: '1',
            description: 'Hydraulic system failure on main crane',
            severity: 'high',
            status: 'in_progress',
            assignedTo: 'Maintenance Team'
          }
        ]
      }
    ];

    setReports(mockReports);
  }, []);

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'progress': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'issue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'safety': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'weather': return <MapPin className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateReport = () => {
    setIsCreating(true);
    setCurrentReport({
      type: 'daily',
      title: '',
      description: '',
      location: '',
      reportedBy: 'Current User',
      reportedAt: new Date(),
      photos: [],
      status: 'draft',
      crew: [],
      equipment: [],
      materials: [],
      workCompleted: [],
      issues: []
    });
  };

  const handleSaveReport = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Report Saved",
        description: "Field report has been saved successfully.",
      });
      setIsCreating(false);
      setCurrentReport({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (reportId: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, status: 'submitted' as const } : report
      ));
      toast({
        title: "Report Submitted",
        description: "Field report has been submitted for review.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCapturePhoto = () => {
    toast({
      title: "Photo Captured",
      description: "Photo has been added to the report.",
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentReport(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          toast({
            title: "Location Added",
            description: "GPS coordinates have been captured.",
          });
        },
        () => {
          toast({
            title: "Location Error",
            description: "Unable to get current location.",
            variant: "destructive",
          });
        }
      );
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create Field Report</h2>
            <p className="text-muted-foreground">Document field activities and progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <select
                  value={currentReport.type || 'daily'}
                  onChange={(e) => setCurrentReport(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="daily">Daily Report</option>
                  <option value="progress">Progress Report</option>
                  <option value="issue">Issue Report</option>
                  <option value="safety">Safety Report</option>
                  <option value="weather">Weather Report</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <div className="flex gap-2">
                  <Input
                    value={currentReport.location || ''}
                    onChange={(e) => setCurrentReport(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location"
                  />
                  <Button size="sm" variant="outline" onClick={handleGetLocation}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={currentReport.title || ''}
                onChange={(e) => setCurrentReport(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Report title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={currentReport.description || ''}
                onChange={(e) => setCurrentReport(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of activities..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCapturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Field Reporting</h2>
          <p className="text-muted-foreground">Create and manage field reports</p>
        </div>
        <Button onClick={handleCreateReport}>
          <Clock className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">All Reports</TabsTrigger>
          <TabsTrigger value="daily">Daily Reports</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getReportTypeIcon(report.type)}
                      {report.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.toUpperCase()}
                      </Badge>
                      {report.status === 'draft' && (
                        <Button size="sm" onClick={() => handleSubmitReport(report.id)} disabled={loading}>
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{report.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {report.location}
                      </div>
                      <div>
                        <span className="font-medium">Reported by:</span> {report.reportedBy}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {report.reportedAt.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Photos:</span> {report.photos.length}
                      </div>
                    </div>
                    
                    {report.crew.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Crew ({report.crew.length}):</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {report.crew.map((member) => (
                            <Badge key={member.id} variant="outline">
                              {member.name} - {member.hoursWorked}h
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.workCompleted.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Work Completed:</span>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {report.workCompleted.map((task, index) => (
                            <li key={index}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.issues.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Issues:</span>
                        <div className="mt-1 space-y-1">
                          {report.issues.map((issue) => (
                            <div key={issue.id} className="flex items-center gap-2">
                              <Badge variant="destructive">{issue.severity}</Badge>
                              <span>{issue.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4">
            {reports.filter(r => r.type === 'daily').map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {report.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{report.description}</p>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {report.location} • {report.reportedAt.toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4">
            {reports.filter(r => r.type === 'issue' || r.issues.length > 0).map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {report.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{report.description}</p>
                  {report.issues.map((issue) => (
                    <div key={issue.id} className="mt-2 p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{issue.severity}</Badge>
                        <Badge variant="outline">{issue.status}</Badge>
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};