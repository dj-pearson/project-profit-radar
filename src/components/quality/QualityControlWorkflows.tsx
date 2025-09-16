import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, AlertTriangle, Camera, FileText, User, Calendar, MapPin, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QualityInspection {
  id: string;
  title: string;
  type: 'pre_construction' | 'in_progress' | 'final' | 'punch_list';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'approved';
  inspector: string;
  scheduledDate: Date;
  completedDate?: Date;
  location: string;
  projectPhase: string;
  checklist: ChecklistItem[];
  photos: InspectionPhoto[];
  score?: number;
  notes: string;
  deficiencies: Deficiency[];
  approvals: Approval[];
}

interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes?: string;
  photos: string[];
  critical: boolean;
}

interface InspectionPhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: Date;
  location?: string;
  category: 'pass' | 'fail' | 'reference';
}

interface Deficiency {
  id: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  assignedTo: string;
  dueDate: Date;
  photos: string[];
  corrective_action: string;
}

interface Approval {
  id: string;
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: Date;
  comments?: string;
  signature?: string;
}

export const QualityControlWorkflows: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inspections');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockInspections: QualityInspection[] = [
      {
        id: '1',
        title: 'Foundation Final Inspection',
        type: 'final',
        status: 'completed',
        inspector: 'Quality Supervisor',
        scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        location: 'Building A - Foundation',
        projectPhase: 'Foundation',
        score: 95,
        notes: 'Foundation meets all specifications with minor cosmetic issues.',
        checklist: [
          {
            id: '1',
            category: 'Structural',
            requirement: 'Concrete strength test results',
            status: 'pass',
            notes: '4000 PSI achieved',
            photos: [],
            critical: true
          },
          {
            id: '2',
            category: 'Dimensions',
            requirement: 'Foundation dimensions per plans',
            status: 'pass',
            notes: 'All dimensions within tolerance',
            photos: [],
            critical: true
          },
          {
            id: '3',
            category: 'Surface',
            requirement: 'Surface finish quality',
            status: 'fail',
            notes: 'Minor surface imperfections on east wall',
            photos: ['/inspections/surface-defect.jpg'],
            critical: false
          }
        ],
        photos: [
          {
            id: '1',
            url: '/inspections/foundation-overview.jpg',
            caption: 'Foundation overview - completed',
            timestamp: new Date(),
            category: 'reference'
          }
        ],
        deficiencies: [
          {
            id: '1',
            description: 'Surface finish imperfections on east foundation wall',
            severity: 'minor',
            status: 'in_progress',
            assignedTo: 'Concrete Crew',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            photos: ['/inspections/surface-defect.jpg'],
            corrective_action: 'Apply surface patch and refinish'
          }
        ],
        approvals: [
          {
            id: '1',
            approver: 'Project Manager',
            role: 'PM',
            status: 'approved',
            timestamp: new Date(),
            comments: 'Approved with minor punch list items'
          }
        ]
      },
      {
        id: '2',
        title: 'Framing In-Progress Inspection',
        type: 'in_progress',
        status: 'scheduled',
        inspector: 'Structural Inspector',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        location: 'Building A - First Floor',
        projectPhase: 'Framing',
        notes: '',
        checklist: [
          {
            id: '1',
            category: 'Structural',
            requirement: 'Beam placement and connection',
            status: 'pending',
            photos: [],
            critical: true
          },
          {
            id: '2',
            category: 'Code Compliance',
            requirement: 'Fire blocking installation',
            status: 'pending',
            photos: [],
            critical: true
          }
        ],
        photos: [],
        deficiencies: [],
        approvals: []
      }
    ];

    setInspections(mockInspections);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChecklistStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'na': return <span className="text-xs text-gray-500">N/A</span>;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStartInspection = async (inspectionId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInspections(prev => prev.map(inspection => 
        inspection.id === inspectionId 
          ? { ...inspection, status: 'in_progress' as const }
          : inspection
      ));
      toast({
        title: "Inspection Started",
        description: "Quality inspection has been started.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start inspection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInspection = async (inspectionId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInspections(prev => prev.map(inspection => 
        inspection.id === inspectionId 
          ? { ...inspection, status: 'completed' as const, completedDate: new Date() }
          : inspection
      ));
      toast({
        title: "Inspection Completed",
        description: "Quality inspection has been completed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete inspection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInspection = () => {
    setIsCreating(true);
  };

  const handleSaveInspection = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Inspection Created",
        description: "New quality inspection has been scheduled.",
      });
      setIsCreating(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create inspection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedInspection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{selectedInspection.title}</h2>
            <p className="text-muted-foreground">{selectedInspection.location}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedInspection(null)}>
              Back to List
            </Button>
            {selectedInspection.status === 'scheduled' && (
              <Button onClick={() => handleStartInspection(selectedInspection.id)} disabled={loading}>
                Start Inspection
              </Button>
            )}
            {selectedInspection.status === 'in_progress' && (
              <Button onClick={() => handleCompleteInspection(selectedInspection.id)} disabled={loading}>
                Complete Inspection
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedInspection.checklist.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded">
                      <div className="mt-1">
                        {getChecklistStatusIcon(item.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.requirement}</h4>
                          {item.critical && (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        {item.notes && (
                          <p className="text-sm mt-1">{item.notes}</p>
                        )}
                        {item.photos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline">
                              <Camera className="h-3 w-3 mr-1" />
                              View Photos ({item.photos.length})
                            </Button>
                          </div>
                        )}
                      </div>
                      {selectedInspection.status === 'in_progress' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">Pass</Button>
                          <Button size="sm" variant="outline">Fail</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedInspection.deficiencies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Deficiencies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedInspection.deficiencies.map((deficiency) => (
                      <div key={deficiency.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${getSeverityColor(deficiency.severity)} text-white`}>
                            {deficiency.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{deficiency.status}</Badge>
                        </div>
                        <p className="text-sm font-medium">{deficiency.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Assigned to: {deficiency.assignedTo} • Due: {deficiency.dueDate.toLocaleDateString()}
                        </div>
                        {deficiency.corrective_action && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Corrective Action:</span> {deficiency.corrective_action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedInspection.status)}
                    <Badge className={getStatusColor(selectedInspection.status)}>
                      {selectedInspection.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Inspector:</span>
                  <p className="text-sm">{selectedInspection.inspector}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Scheduled:</span>
                  <p className="text-sm">{selectedInspection.scheduledDate.toLocaleDateString()}</p>
                </div>
                {selectedInspection.completedDate && (
                  <div>
                    <span className="text-sm font-medium">Completed:</span>
                    <p className="text-sm">{selectedInspection.completedDate.toLocaleDateString()}</p>
                  </div>
                )}
                {selectedInspection.score && (
                  <div>
                    <span className="text-sm font-medium">Score:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-bold">{selectedInspection.score}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedInspection.approvals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedInspection.approvals.map((approval) => (
                      <div key={approval.id} className="p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{approval.approver}</span>
                          <Badge variant={approval.status === 'approved' ? 'default' : 'secondary'}>
                            {approval.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{approval.role}</p>
                        {approval.comments && (
                          <p className="text-xs mt-1">{approval.comments}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedInspection.photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedInspection.photos.map((photo) => (
                      <div key={photo.id} className="aspect-square bg-gray-100 rounded border">
                        <div className="p-2">
                          <p className="text-xs">{photo.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quality Control</h2>
          <p className="text-muted-foreground">Manage quality inspections and workflows</p>
        </div>
        <Button onClick={handleCreateInspection}>
          <FileText className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inspections">All Inspections</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <div className="grid gap-4">
            {inspections.map((inspection) => (
              <Card key={inspection.id} className="cursor-pointer hover:bg-accent/50" 
                    onClick={() => setSelectedInspection(inspection)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getStatusIcon(inspection.status)}
                      {inspection.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(inspection.status)}>
                        {inspection.status.toUpperCase()}
                      </Badge>
                      {inspection.score && (
                        <Badge variant="outline">{inspection.score}%</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Inspector:</span> {inspection.inspector}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {inspection.location}
                    </div>
                    <div>
                      <span className="font-medium">Scheduled:</span> {inspection.scheduledDate.toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Phase:</span> {inspection.projectPhase}
                    </div>
                  </div>
                  
                  {inspection.deficiencies.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{inspection.deficiencies.length} deficiencies</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {inspection.checklist.length} checklist items
                    </div>
                    {inspection.status === 'scheduled' && (
                      <Button size="sm" onClick={(e) => {
                        e.stopPropagation();
                        handleStartInspection(inspection.id);
                      }} disabled={loading}>
                        Start Inspection
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid gap-4">
            {inspections.filter(i => i.status === 'scheduled').map((inspection) => (
              <Card key={inspection.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {inspection.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{inspection.location}</p>
                      <p className="text-sm text-muted-foreground">
                        {inspection.scheduledDate.toLocaleDateString()} • {inspection.inspector}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleStartInspection(inspection.id)} disabled={loading}>
                      Start Inspection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deficiencies" className="space-y-4">
          <div className="grid gap-4">
            {inspections.flatMap(i => i.deficiencies).map((deficiency) => (
              <Card key={deficiency.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${getSeverityColor(deficiency.severity)} text-white`}>
                      {deficiency.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{deficiency.status}</Badge>
                  </div>
                  <p className="font-medium">{deficiency.description}</p>
                  <div className="text-sm text-muted-foreground mt-1">
                    Assigned to: {deficiency.assignedTo} • Due: {deficiency.dueDate.toLocaleDateString()}
                  </div>
                  {deficiency.corrective_action && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Corrective Action:</span> {deficiency.corrective_action}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};