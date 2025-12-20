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
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Truck, Clock, Plus, Settings, Search, Wrench, TrendingUp, AlertTriangle, CheckCircle, MapPin, Edit, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EquipmentGanttChart from '@/components/equipment/EquipmentGanttChart';
import EquipmentEditForm from '@/components/equipment/EquipmentEditForm';
import { useToast } from '@/hooks/use-toast';
import { useEquipmentWithMaintenance, useUpdateEquipment } from '@/hooks/useEquipment';

export default function EquipmentManagement() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: equipment = [], isLoading: equipmentLoading, refetch } = useEquipmentWithMaintenance();
  const updateEquipment = useUpdateEquipment();
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("schedule");

  const loading = authLoading || equipmentLoading;

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
    refetch();
  };

  const handleEditEquipment = (item: any) => {
    setEditingEquipment(item);
  };

  const handleEquipmentUpdate = async (updatedEquipment: any) => {
    await updateEquipment.mutateAsync(updatedEquipment);
    setEditingEquipment(null);
  };

  const handleManageSchedule = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setCurrentTab("schedule");
  };

  const filteredEquipment = equipment.filter(item =>
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.current_location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="Equipment Management">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96 mt-2" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
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
                          <p>{eq.type || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Current Status</label>
                          {getStatusBadge(eq.status || 'available')}
                        </div>
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <p>{eq.current_location || 'Not specified'}</p>
                        </div>
                        {eq.assigned_project && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium">Currently Assigned To</label>
                            <p>{eq.assigned_project}</p>
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
              {filteredEquipment.map((item) => {
                const utilizationRate = item.hours_meter && item.hours_meter > 0
                  ? Math.min(100, Math.round((item.hours_meter / 3000) * 100))
                  : 0;
                return (
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
                            {getStatusBadge(item.status || 'available')}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{item.type || 'Equipment'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.model && `${item.model} • `}{item.serial_number || 'No serial'}
                          </p>
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
                            <div className={`text-xl font-bold ${getUtilizationColor(utilizationRate)}`}>
                              {utilizationRate}%
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
                          <span>{item.current_location || 'Location not set'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{(item.hours_meter || 0).toLocaleString()} hours</span>
                        </div>

                        {item.assigned_operator && (
                          <div className="text-sm">
                            <span className="font-medium">Operator:</span>
                            <p className="text-muted-foreground">{item.assigned_operator}</p>
                          </div>
                        )}

                        {item.assigned_project && (
                          <div className="text-sm">
                            <span className="font-medium">Assigned to:</span>
                            <p className="text-muted-foreground">{item.assigned_project}</p>
                          </div>
                        )}

                        {item.next_maintenance_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Next Maintenance: {formatDate(item.next_maintenance_date)}</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Utilization Rate</div>
                          <Progress value={utilizationRate} className="w-full" />
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
                );
              })}
            </div>

            {filteredEquipment.length === 0 && !searchTerm && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No Equipment Found</p>
                <p className="text-muted-foreground mb-4">
                  Add your first piece of equipment to start tracking
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </div>
            )}

            {filteredEquipment.length === 0 && searchTerm && (
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
      </div>
    </DashboardLayout>
  );
}