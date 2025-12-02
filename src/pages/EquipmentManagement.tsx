import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Calendar, Truck, Clock, Plus, Settings, Search, Wrench, TrendingUp, AlertTriangle, CheckCircle, MapPin, Edit } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EquipmentGanttChart from '@/components/equipment/EquipmentGanttChart';
import EquipmentEditForm from '@/components/equipment/EquipmentEditForm';
import { useToast } from '@/hooks/use-toast';

// Mock equipment data - in a real app, this would come from the database
const mockEquipment = [
  {
    id: '1',
    name: 'Excavator CAT 320',
    type: 'Heavy Machinery',
    model: 'CAT 320',
    serial_number: 'CAT123456',
    status: 'available',
    location: 'Main Yard',
    last_maintenance: '2024-01-15',
    next_maintenance: '2024-04-15',
    assigned_to: null,
    availability: 'available',
    total_hours: 2847.5,
    utilization_rate: 78,
    assigned_operator: 'John Doe'
  },
  {
    id: '2',
    name: 'Crane Tower 100T',
    type: 'Heavy Machinery',
    model: 'Tower 100T',
    serial_number: 'CRN789012',
    status: 'assigned',
    location: 'Project Site A',
    last_maintenance: '2024-01-10',
    next_maintenance: '2024-04-10',
    assigned_to: 'Downtown Office Complex',
    availability: 'assigned',
    total_hours: 1924.0,
    utilization_rate: 85,
    assigned_operator: 'Mike Johnson'
  },
  {
    id: '3',
    name: 'Forklift Toyota 5K',
    type: 'Material Handling',
    model: 'Toyota 5K',
    serial_number: 'TYT345678',
    status: 'maintenance',
    location: 'Service Center',
    last_maintenance: '2024-01-20',
    next_maintenance: '2024-04-20',
    assigned_to: null,
    availability: 'maintenance',
    total_hours: 3562.25,
    utilization_rate: 45,
    assigned_operator: null
  },
  {
    id: '4',
    name: 'Generator 50KW',
    type: 'Power Equipment',
    model: 'Gen 50KW',
    serial_number: 'GEN901234',
    status: 'available',
    location: 'Main Yard',
    last_maintenance: '2024-01-05',
    next_maintenance: '2024-04-05',
    assigned_to: null,
    availability: 'available',
    total_hours: 1245.0,
    utilization_rate: 60,
    assigned_operator: null
  },
  {
    id: '5',
    name: 'Concrete Mixer',
    type: 'Construction Equipment',
    model: 'CM-500',
    serial_number: 'MIX567890',
    status: 'assigned',
    location: 'Project Site B',
    last_maintenance: '2024-01-12',
    next_maintenance: '2024-04-12',
    assigned_to: 'Residential Complex Phase 2',
    availability: 'assigned',
    total_hours: 987.5,
    utilization_rate: 72,
    assigned_operator: 'Sarah Williams'
  }
];

export default function EquipmentManagement() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState(mockEquipment);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("schedule");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'out_of_service': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'assigned': return 'Assigned';
      case 'maintenance': return 'Maintenance';
      case 'out_of_service': return 'Out of Service';
      default: return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: "default" as const, label: "Available", icon: CheckCircle },
      assigned: { variant: "secondary" as const, label: "Assigned", icon: TrendingUp },
      maintenance: { variant: "destructive" as const, label: "Maintenance", icon: Wrench },
      out_of_service: { variant: "outline" as const, label: "Out of Service", icon: AlertTriangle }
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

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEquipmentSelect = (equipmentId: string) => {
    setSelectedEquipment(selectedEquipment === equipmentId ? null : equipmentId);
  };

  const handleAssignmentChange = () => {
    setRefreshKey(prev => prev + 1);
    // In a real app, you'd also refresh the equipment list to update availability status
  };

  const handleEditEquipment = (item: any) => {
    setEditingEquipment(item);
  };

  const handleEquipmentUpdate = (updatedEquipment: any) => {
    setEquipment(prev => prev.map(item => 
      item.id === updatedEquipment.id ? updatedEquipment : item
    ));
    setEditingEquipment(null);
  };

  const handleManageSchedule = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setCurrentTab("schedule");
  };

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile?.company_id) return null;

  return (
    <DashboardLayout title="Equipment Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Equipment Management</h1>
            <p className="text-muted-foreground">
              Manage your equipment inventory and project assignments
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule View
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Equipment Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                View and manage equipment assignments across all projects. Click on assignments to edit time periods and quantities.
              </AlertDescription>
            </Alert>

            <EquipmentGanttChart 
              key={refreshKey}
              equipmentId={selectedEquipment || undefined}
              onAssignmentChange={handleAssignmentChange}
            />

            {selectedEquipment && (
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const eq = equipment.find(e => e.id === selectedEquipment);
                    if (!eq) return null;
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <p>{eq.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Type</label>
                          <p>{eq.type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Current Status</label>
                          {getStatusBadge(eq.status)}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <p>{eq.location}</p>
                        </div>
                        {eq.assigned_to && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium">Currently Assigned To</label>
                            <p>{eq.assigned_to}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Alert>
              <Truck className="h-4 w-4" />
              <AlertDescription>
                Your equipment bank shows all available equipment. Select an item to view its schedule and assign it to projects.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment, type, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map((item) => (
                <Card 
                  key={item.id} 
                  className={`cursor-pointer transition-colors hover:shadow-md ${
                    selectedEquipment === item.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleEquipmentSelect(item.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                          {item.name}
                          {getStatusBadge(item.status)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{item.type}</p>
                        <p className="text-xs text-muted-foreground">{item.model} • {item.serial_number}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEquipment(item);
                          }}
                          className="p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getUtilizationColor(item.utilization_rate)}`}>
                            {item.utilization_rate}%
                          </div>
                          <div className="text-xs text-muted-foreground">Utilization</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{item.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{item.total_hours.toLocaleString()} hours</span>
                      </div>

                      {item.assigned_operator && (
                        <div className="text-sm">
                          <span className="font-medium">Operator:</span>
                          <p className="text-muted-foreground">{item.assigned_operator}</p>
                        </div>
                      )}
                      
                      {item.assigned_to && (
                        <div className="text-sm">
                          <span className="font-medium">Assigned to:</span>
                          <p className="text-muted-foreground">{item.assigned_to}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Next Maintenance: {formatDate(item.next_maintenance)}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Utilization Rate</div>
                        <Progress value={item.utilization_rate} className="w-full" />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManageSchedule(item.id);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No equipment found matching your search criteria
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Equipment Dialog */}
        <Dialog open={!!editingEquipment} onOpenChange={() => setEditingEquipment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Equipment</DialogTitle>
            </DialogHeader>
            {editingEquipment ? (
              <EquipmentEditForm
                equipment={editingEquipment}
                onSuccess={handleEquipmentUpdate}
                onCancel={() => setEditingEquipment(null)}
              />
            ) : (
              <div>No equipment selected for editing</div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Debug info */}
        {editingEquipment && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded z-50">
            Dialog should be open: {editingEquipment.name}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}