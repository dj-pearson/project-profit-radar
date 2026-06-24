import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck, Wrench, Calendar, MapPin, AlertTriangle,
  CheckCircle, Clock, DollarSign, TrendingUp, Settings, Package
} from 'lucide-react';
import { useEquipmentWithMaintenance, useMaintenanceRecords, useEquipmentStats } from '@/hooks/useEquipment';

export const EquipmentManagementSystem: React.FC = () => {
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipmentWithMaintenance();
  const { data: maintenanceRecords = [], isLoading: maintenanceLoading } = useMaintenanceRecords();
  const { data: stats } = useEquipmentStats();

  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loading = equipmentLoading || maintenanceLoading;

  const filteredEquipment = equipment.filter(eq =>
    (eq.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (eq.model?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available': return 'default';
      case 'in_use': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'out_of_service': return 'outline';
      default: return 'default';
    }
  };

  const getMaintenanceUrgency = (eq: typeof equipment[0]) => {
    if (!eq.next_maintenance_date) return 'ok';
    const now = new Date();
    const maintenanceDate = new Date(eq.next_maintenance_date);
    const daysUntilMaintenance = Math.floor((maintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilMaintenance <= 0) return 'overdue';
    if (daysUntilMaintenance <= 7) return 'urgent';
    if (daysUntilMaintenance <= 30) return 'soon';
    return 'ok';
  };

  const renderEquipmentCard = (eq: typeof equipment[0]) => {
    const maintenanceUrgency = getMaintenanceUrgency(eq);
    const hoursMeter = eq.hours_meter || 0;
    const utilizationRate = Math.min(100, (hoursMeter / 3000) * 100);

    return (
      <Card key={eq.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {eq.type === 'heavy_machinery' && <Truck className="h-4 w-4" />}
              {eq.type === 'vehicle' && <Truck className="h-4 w-4" />}
              {eq.type === 'tool' && <Wrench className="h-4 w-4" />}
              {!eq.type && <Truck className="h-4 w-4" />}
              <h4 className="font-medium">{eq.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{eq.model || 'No model'}</p>
            <p className="text-xs text-muted-foreground">SN: {eq.serial_number || 'N/A'}</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(eq.status) as any}>
              {(eq.status || 'available').replace('_', ' ')}
            </Badge>
            {maintenanceUrgency === 'overdue' && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{eq.current_location || 'Location not set'}</span>
          </div>
          {eq.assigned_project && (
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-3 w-3" />
              <span>{eq.assigned_project}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            <span>{hoursMeter.toLocaleString()} hours</span>
          </div>
          {eq.daily_rate && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3 w-3" />
              <span>${eq.daily_rate}/day</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {eq.next_maintenance_date && (
            <>
              <div className="flex justify-between text-xs">
                <span>Next Maintenance</span>
                <span className={
                  maintenanceUrgency === 'overdue' ? 'text-destructive' :
                  maintenanceUrgency === 'urgent' ? 'text-orange-500' : ''
                }>
                  {new Date(eq.next_maintenance_date).toLocaleDateString()}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between text-xs mt-2">
            <span>Annual Utilization</span>
            <span>{utilizationRate.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationRate} className="h-2" />
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Schedule
          </Button>
          <Button size="sm" variant="ghost">
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderMaintenanceCard = (record: typeof maintenanceRecords[0]) => {
    const equipment_item = equipment.find(eq => eq.id === record.equipment_id);

    return (
      <Card key={record.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium">{equipment_item?.name || 'Unknown Equipment'}</h4>
            <p className="text-sm text-muted-foreground">{record.description || 'No description'}</p>
          </div>
          <Badge variant={
            record.maintenance_type === 'emergency' ? 'destructive' :
            record.maintenance_type === 'repair' ? 'secondary' : 'default'
          }>
            {record.maintenance_type || 'routine'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Cost:</span>
            <p className="font-medium">${(record.cost || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">
              {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : 'Not scheduled'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <p className="font-medium capitalize">{record.status || 'pending'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Performed By:</span>
            <p className="font-medium">{record.performed_by || 'Not assigned'}</p>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Equipment Management</h2>
          <p className="text-muted-foreground">
            Track, maintain, and optimize equipment utilization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Wrench className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Equipment</p>
                <p className="text-2xl font-bold">{stats?.total || equipment.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently Active</p>
                <p className="text-2xl font-bold">
                  {stats?.inUse || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Maintenance</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.maintenanceDueSoon || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats?.available || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search equipment by name or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Equipment Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="usage">Usage Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {filteredEquipment.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEquipment.map(renderEquipmentCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Equipment Found</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No equipment matches your search' : 'Add your first piece of equipment to get started'}
              </p>
              {!searchTerm && (
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Maintenance Records</h3>
              <Button>Schedule New Maintenance</Button>
            </div>
            {maintenanceRecords.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {maintenanceRecords.map(renderMaintenanceCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No Maintenance Records</p>
                <p className="text-muted-foreground mb-4">
                  Schedule maintenance to keep your equipment running smoothly
                </p>
                <Button>Schedule Maintenance</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Usage Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Real-time usage tracking and hour meter integration coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Utilization Rates</CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.length > 0 ? (
                  <div className="space-y-4">
                    {equipment.map(eq => {
                      const hoursMeter = eq.hours_meter || 0;
                      const utilizationRate = Math.min(100, (hoursMeter / 3000) * 100);
                      return (
                        <div key={eq.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{eq.name}</span>
                            <span>{utilizationRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={utilizationRate} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Add equipment to see utilization analytics
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Maintenance cost analysis and trending coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};