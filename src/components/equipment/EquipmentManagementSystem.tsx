import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, Wrench, Calendar, MapPin, AlertTriangle, 
  CheckCircle, Clock, DollarSign, TrendingUp, Settings
} from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: 'heavy_machinery' | 'vehicle' | 'tool' | 'generator' | 'other';
  model: string;
  serialNumber: string;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
  currentLocation: string;
  currentProject?: string;
  assignedTo?: string;
  hoursMeter: number;
  nextMaintenanceHours: number;
  dailyRate: number;
  purchaseDate: Date;
  lastInspection: Date;
  nextInspection: Date;
}

interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: 'routine' | 'repair' | 'inspection' | 'emergency';
  description: string;
  cost: number;
  performedBy: string;
  date: Date;
  hoursAtMaintenance: number;
  nextServiceDue?: Date;
}

interface EquipmentUsage {
  equipmentId: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  hoursUsed: number;
  operatorId: string;
  fuelUsed?: number;
  notes?: string;
}

export const EquipmentManagementSystem: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([
    {
      id: '1',
      name: 'CAT 320 Excavator',
      type: 'heavy_machinery',
      model: 'CAT 320DL',
      serialNumber: 'CAT320-001',
      status: 'in_use',
      currentLocation: 'Downtown Construction Site',
      currentProject: 'Office Building Phase 2',
      assignedTo: 'Mike Johnson',
      hoursMeter: 2450,
      nextMaintenanceHours: 2500,
      dailyRate: 850,
      purchaseDate: new Date('2022-03-15'),
      lastInspection: new Date('2024-01-05'),
      nextInspection: new Date('2024-04-05')
    },
    {
      id: '2',
      name: 'Ford F-350 Pickup',
      type: 'vehicle',
      model: 'Ford F-350 Super Duty',
      serialNumber: 'FORD-F350-002',
      status: 'available',
      currentLocation: 'Main Yard',
      hoursMeter: 1250,
      nextMaintenanceHours: 1500,
      dailyRate: 120,
      purchaseDate: new Date('2023-01-20'),
      lastInspection: new Date('2024-01-10'),
      nextInspection: new Date('2024-07-10')
    }
  ]);

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([
    {
      id: '1',
      equipmentId: '1',
      type: 'routine',
      description: 'Oil change and hydraulic fluid check',
      cost: 450,
      performedBy: 'Service Team A',
      date: new Date('2024-01-05'),
      hoursAtMaintenance: 2400,
      nextServiceDue: new Date('2024-04-05')
    }
  ]);

  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEquipment = equipment.filter(eq =>
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'available': return 'default';
      case 'in_use': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'out_of_service': return 'outline';
      default: return 'outline';
    }
  };

  const getMaintenanceUrgency = (equipment: Equipment) => {
    const hoursUntilMaintenance = equipment.nextMaintenanceHours - equipment.hoursMeter;
    if (hoursUntilMaintenance <= 0) return 'overdue';
    if (hoursUntilMaintenance <= 50) return 'urgent';
    if (hoursUntilMaintenance <= 100) return 'soon';
    return 'ok';
  };

  const renderEquipmentCard = (eq: Equipment) => {
    const maintenanceUrgency = getMaintenanceUrgency(eq);
    const utilizationRate = (eq.hoursMeter / 3000) * 100; // Assuming 3000 hours annual capacity

    return (
      <Card key={eq.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {eq.type === 'heavy_machinery' && <Truck className="h-4 w-4" />}
              {eq.type === 'vehicle' && <Truck className="h-4 w-4" />}
              {eq.type === 'tool' && <Wrench className="h-4 w-4" />}
              <h4 className="font-medium">{eq.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{eq.model}</p>
            <p className="text-xs text-muted-foreground">SN: {eq.serialNumber}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(eq.status)}>
              {eq.status.replace('_', ' ')}
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
            <span>{eq.currentLocation}</span>
          </div>
          {eq.currentProject && (
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-3 w-3" />
              <span>{eq.currentProject}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            <span>{eq.hoursMeter.toLocaleString()} hours</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3" />
            <span>${eq.dailyRate}/day</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Hours Until Maintenance</span>
            <span className={
              maintenanceUrgency === 'overdue' ? 'text-destructive' :
              maintenanceUrgency === 'urgent' ? 'text-orange-500' : ''
            }>
              {Math.max(0, eq.nextMaintenanceHours - eq.hoursMeter)}h
            </span>
          </div>
          <Progress 
            value={Math.min(100, (eq.hoursMeter / eq.nextMaintenanceHours) * 100)} 
            className="h-2"
          />
          
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

  const renderMaintenanceCard = (record: MaintenanceRecord) => {
    const equipment_item = equipment.find(eq => eq.id === record.equipmentId);
    
    return (
      <Card key={record.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium">{equipment_item?.name}</h4>
            <p className="text-sm text-muted-foreground">{record.description}</p>
          </div>
          <Badge variant={
            record.type === 'emergency' ? 'destructive' :
            record.type === 'repair' ? 'secondary' : 'default'
          }>
            {record.type}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Cost:</span>
            <p className="font-medium">${record.cost.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">{record.date.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Performed By:</span>
            <p className="font-medium">{record.performedBy}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Hours:</span>
            <p className="font-medium">{record.hoursAtMaintenance.toLocaleString()}</p>
          </div>
        </div>
      </Card>
    );
  };

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
                <p className="text-2xl font-bold">{equipment.length}</p>
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
                  {equipment.filter(eq => eq.status === 'in_use').length}
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
                  {equipment.filter(eq => getMaintenanceUrgency(eq) !== 'ok').length}
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
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">$23,400</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEquipment.map(renderEquipmentCard)}
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Maintenance Records</h3>
              <Button>Schedule New Maintenance</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {maintenanceRecords.map(renderMaintenanceCard)}
            </div>
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
                <div className="space-y-4">
                  {equipment.map(eq => (
                    <div key={eq.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{eq.name}</span>
                        <span>{((eq.hoursMeter / 3000) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(eq.hoursMeter / 3000) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
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