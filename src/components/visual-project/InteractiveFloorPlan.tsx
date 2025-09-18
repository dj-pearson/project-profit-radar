import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Canvas as FabricCanvas, Circle, Rect, FabricText } from 'fabric';
import { MapPin, AlertTriangle, CheckCircle, Clock, Plus, Download, Upload, Eye, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface FloorPlanIssue {
  id: string;
  x: number;
  y: number;
  type: 'safety' | 'quality' | 'progress' | 'note';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: Date;
  assignedTo?: string;
  photos?: string[];
}

interface InteractiveFloorPlanProps {
  projectId?: string;
}

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({ projectId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [floorPlanImage, setFloorPlanImage] = useState<string>('/placeholder.svg');
  const [issues, setIssues] = useState<FloorPlanIssue[]>([
    {
      id: '1',
      x: 150,
      y: 200,
      type: 'safety',
      priority: 'high',
      status: 'open',
      title: 'Missing Safety Railing',
      description: 'Safety railing required along stairway opening',
      reportedBy: 'Safety Inspector',
      reportedAt: new Date('2024-01-15'),
      assignedTo: 'John Doe'
    },
    {
      id: '2',
      x: 300,
      y: 150,
      type: 'quality',
      priority: 'medium',
      status: 'in_progress',
      title: 'Wall Alignment Issue',
      description: 'Wall not aligned with architectural plans',
      reportedBy: 'Quality Manager',
      reportedAt: new Date('2024-01-18'),
      assignedTo: 'Mike Smith'
    },
    {
      id: '3',
      x: 450,
      y: 250,
      type: 'progress',
      priority: 'low',
      status: 'resolved',
      title: 'Electrical Rough Complete',
      description: 'Electrical rough-in work completed and inspected',
      reportedBy: 'Electrician',
      reportedAt: new Date('2024-01-20')
    }
  ]);

  const [selectedIssue, setSelectedIssue] = useState<FloorPlanIssue | null>(null);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [newIssuePosition, setNewIssuePosition] = useState<{ x: number; y: number } | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);
    toast.success("Floor plan ready! Click to add issues.");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Load floor plan image - simplified for now
    fabricCanvas.renderAll();

    // Clear existing pins
    fabricCanvas.getObjects().forEach(obj => {
      if (obj.get('name')?.startsWith('issue-pin')) {
        fabricCanvas.remove(obj);
      }
    });

    // Add issue pins
    issues.forEach(issue => {
      if (shouldShowIssue(issue)) {
        addIssuePin(issue);
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, issues, filterType, filterStatus, floorPlanImage]);

  const shouldShowIssue = (issue: FloorPlanIssue): boolean => {
    const typeMatch = filterType === 'all' || issue.type === filterType;
    const statusMatch = filterStatus === 'all' || issue.status === filterStatus;
    return typeMatch && statusMatch;
  };

  const addIssuePin = (issue: FloorPlanIssue) => {
    if (!fabricCanvas) return;

    const getIssueColor = (type: string, status: string) => {
      if (status === 'resolved') return '#22c55e'; // green
      
      switch (type) {
        case 'safety': return '#ef4444'; // red
        case 'quality': return '#f97316'; // orange
        case 'progress': return '#3b82f6'; // blue
        case 'note': return '#8b5cf6'; // purple
        default: return '#6b7280'; // gray
      }
    };

    // Create pin circle
    const pin = new Circle({
      left: issue.x,
      top: issue.y,
      radius: 12,
      fill: getIssueColor(issue.type, issue.status),
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      hoverCursor: 'pointer',
      name: `issue-pin-${issue.id}` as any
    });

    // Add click handler
    pin.on('mousedown', () => {
      setSelectedIssue(issue);
    });

    // Create priority indicator
    if (issue.priority === 'critical' || issue.priority === 'high') {
      const indicator = new Circle({
        left: issue.x + 8,
        top: issue.y - 8,
        radius: 4,
        fill: issue.priority === 'critical' ? '#dc2626' : '#ea580c',
        selectable: false,
        hoverCursor: 'pointer',
        name: `issue-indicator-${issue.id}` as any
      });
      
      indicator.on('mousedown', () => {
        setSelectedIssue(issue);
      });
      
      fabricCanvas.add(indicator);
    }

    fabricCanvas.add(pin);
  };

  const handleCanvasClick = (event: any) => {
    if (!isAddingIssue || !fabricCanvas) return;

    const pointer = fabricCanvas.getPointer(event.e);
    setNewIssuePosition({ x: pointer.x, y: pointer.y });
  };

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.on('mouse:down', handleCanvasClick);

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    };
  }, [fabricCanvas, isAddingIssue]);

  const handleAddIssue = (issueData: Partial<FloorPlanIssue>) => {
    if (!newIssuePosition) return;

    const newIssue: FloorPlanIssue = {
      id: Date.now().toString(),
      x: newIssuePosition.x,
      y: newIssuePosition.y,
      type: issueData.type as FloorPlanIssue['type'] || 'note',
      priority: issueData.priority as FloorPlanIssue['priority'] || 'medium',
      status: 'open',
      title: issueData.title || '',
      description: issueData.description || '',
      reportedBy: 'Current User',
      reportedAt: new Date(),
      assignedTo: issueData.assignedTo
    };

    setIssues(prev => [...prev, newIssue]);
    setNewIssuePosition(null);
    setIsAddingIssue(false);
    toast.success("Issue added to floor plan");
  };

  const getIssueTypeIcon = (type: FloorPlanIssue['type']) => {
    switch (type) {
      case 'safety': return <AlertTriangle className="h-4 w-4" />;
      case 'quality': return <Eye className="h-4 w-4" />;
      case 'progress': return <Clock className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getIssueTypeColor = (type: FloorPlanIssue['type'], status: FloorPlanIssue['status']) => {
    if (status === 'resolved') return 'bg-success text-success-foreground';
    
    switch (type) {
      case 'safety': return 'bg-destructive text-destructive-foreground';
      case 'quality': return 'bg-orange-500 text-white';
      case 'progress': return 'bg-primary text-primary-foreground';
      case 'note': return 'bg-purple-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: FloorPlanIssue['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setFloorPlanImage(imageUrl);
        toast.success("Floor plan uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Interactive Floor Plan
              </CardTitle>
              <CardDescription>
                Pin issues and track progress directly on your floor plans
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="floorplan-upload"
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="floorplan-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Plan
                </label>
              </Button>
              
              <Button
                variant={isAddingIssue ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAddingIssue(!isAddingIssue)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingIssue ? 'Click to Place' : 'Add Issue'}
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="p-1 border rounded text-sm"
              >
                <option value="all">All Types</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="progress">Progress</option>
                <option value="note">Notes</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-1 border rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <div className="flex-1" />
            
            <div className="text-sm text-muted-foreground">
              {issues.filter(shouldShowIssue).length} issues shown
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floor Plan Canvas */}
      <Card>
        <CardContent className="p-6">
          <div className="relative border rounded-lg overflow-hidden">
            <canvas ref={canvasRef} className="max-w-full" />
            {isAddingIssue && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm">
                Click on the floor plan to add an issue
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-destructive" />
                <span>Safety Issues</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span>Quality Issues</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <span>Progress Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-success" />
                <span>Resolved</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Tracking</CardTitle>
          <CardDescription>
            All issues pinned on the floor plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {issues.filter(shouldShowIssue).map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className={`p-2 rounded ${getIssueTypeColor(issue.type, issue.status)}`}>
                  {getIssueTypeIcon(issue.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{issue.title}</h4>
                    <Badge className={getPriorityColor(issue.priority)} variant="secondary">
                      {issue.priority}
                    </Badge>
                    <Badge variant={issue.status === 'resolved' ? 'default' : 'secondary'}>
                      {issue.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <p>{issue.reportedBy}</p>
                  <p>{issue.reportedAt.toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
          
          {issues.filter(shouldShowIssue).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No issues found with current filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Issue Dialog */}
      {newIssuePosition && (
        <Dialog open={!!newIssuePosition} onOpenChange={() => setNewIssuePosition(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Issue</DialogTitle>
              <DialogDescription>
                Create a new issue at position ({Math.round(newIssuePosition.x)}, {Math.round(newIssuePosition.y)})
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleAddIssue({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                type: formData.get('type') as FloorPlanIssue['type'],
                priority: formData.get('priority') as FloorPlanIssue['priority'],
                assignedTo: formData.get('assignedTo') as string
              });
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <select id="type" name="type" className="w-full p-2 border rounded">
                      <option value="safety">Safety</option>
                      <option value="quality">Quality</option>
                      <option value="progress">Progress</option>
                      <option value="note">Note</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <select id="priority" name="priority" className="w-full p-2 border rounded">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input id="assignedTo" name="assignedTo" placeholder="Optional" />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit">Add Issue</Button>
                  <Button type="button" variant="outline" onClick={() => setNewIssuePosition(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Issue Detail Dialog */}
      {selectedIssue && (
        <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getIssueTypeIcon(selectedIssue.type)}
                {selectedIssue.title}
              </DialogTitle>
              <DialogDescription>
                Issue #{selectedIssue.id} • Reported by {selectedIssue.reportedBy}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getIssueTypeColor(selectedIssue.type, selectedIssue.status)}>
                  {selectedIssue.type}
                </Badge>
                <Badge className={getPriorityColor(selectedIssue.priority)} variant="secondary">
                  {selectedIssue.priority}
                </Badge>
                <Badge variant={selectedIssue.status === 'resolved' ? 'default' : 'secondary'}>
                  {selectedIssue.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm">{selectedIssue.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Reported</Label>
                  <p>{selectedIssue.reportedAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <p>{selectedIssue.assignedTo || 'Unassigned'}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm">Update Status</Button>
                <Button variant="outline" size="sm">Add Comment</Button>
                <Button variant="outline" size="sm">Attach Photo</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};