import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Truck, 
  Wrench, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react';
import { MobilePageWrapper, MobileStatsGrid, MobileFilters, mobileGridClasses, mobileFilterClasses, mobileButtonClasses } from '@/utils/mobileHelpers';

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("fleet");

  // Mock data
  const equipment = [
    {
      id: "1",
      name: "CAT 320 Excavator",
      model: "320 GC",
      manufacturer: "Caterpillar",
      serial_number: "CAT123456",
      year: 2022,
      status: "available",
      location: "Main Yard",
      last_maintenance: "2024-03-15",
      next_maintenance: "2024-06-15",
      hours_used: 1250,
      daily_rate: 850.00
    },
    {
      id: "2",
      name: "Volvo L50H Loader",
      model: "L50H",
      manufacturer: "Volvo",
      serial_number: "VOL789012",
      year: 2021,
      status: "in_use",
      location: "Project Site A",
      last_maintenance: "2024-02-20",
      next_maintenance: "2024-05-20",
      hours_used: 2100,
      daily_rate: 650.00
    },
    {
      id: "3",
      name: "Komatsu D65 Bulldozer",
      model: "D65EX-18",
      manufacturer: "Komatsu",
      serial_number: "KOM345678",
      year: 2020,
      status: "maintenance",
      location: "Service Center",
      last_maintenance: "2024-04-01",
      next_maintenance: "2024-07-01",
      hours_used: 3500,
      daily_rate: 750.00
    }
  ];

  const maintenanceRecords = [
    {
      id: "1",
      equipment_id: "1",
      equipment_name: "CAT 320 Excavator",
      maintenance_type: "Routine Service",
      date: "2024-03-15",
      cost: 450.00,
      technician: "Mike Johnson",
      status: "completed"
    },
    {
      id: "2",
      equipment_id: "3",
      equipment_name: "Komatsu D65 Bulldozer",
      maintenance_type: "Engine Repair",
      date: "2024-04-01",
      cost: 2500.00,
      technician: "Sarah Wilson", 
      status: "in_progress"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: "default" as const, label: "Available", icon: CheckCircle },
      in_use: { variant: "secondary" as const, label: "In Use", icon: Truck },
      maintenance: { variant: "destructive" as const, label: "Maintenance", icon: Wrench },
      out_of_service: { variant: "outline" as const, label: "Out of Service", icon: AlertTriangle },
      completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
      in_progress: { variant: "secondary" as const, label: "In Progress", icon: Clock }
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

  return (
    <DashboardLayout title="Equipment Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Equipment Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage fleet, maintenance, and equipment utilization</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Equipment</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                  <DialogDescription>
                    Register new equipment to your fleet
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Equipment Name</Label>
                    <Input id="name" placeholder="Enter equipment name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input id="manufacturer" placeholder="e.g., Caterpillar" />
                    </div>
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" placeholder="e.g., 320 GC" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serial">Serial Number</Label>
                      <Input id="serial" placeholder="Serial number" />
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" type="number" placeholder="2024" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="daily_rate">Daily Rate ($)</Label>
                    <Input id="daily_rate" type="number" step="0.01" placeholder="0.00" />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="fleet" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Equipment Fleet</span>
              <span className="sm:hidden">Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Maintenance</span>
              <span className="sm:hidden">Maint.</span>
            </TabsTrigger>
            <TabsTrigger value="utilization" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Utilization</span>
              <span className="sm:hidden">Util.</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>

          <div className={mobileFilterClasses.container}>
            <div className="flex items-center space-x-2 w-full">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <TabsContent value="fleet" className="space-y-4">
            <div className="grid gap-4">
              {equipment.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          {item.name}
                        </CardTitle>
                        <CardDescription>
                          {item.manufacturer} {item.model} • {item.year} • {item.serial_number}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Location</div>
                          <div className="text-sm">{item.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Hours Used</div>
                          <div className="text-sm">{item.hours_used.toLocaleString()} hrs</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Next Maintenance</div>
                          <div className="text-sm">{new Date(item.next_maintenance).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Daily Rate</div>
                          <div className="text-sm">${item.daily_rate.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={mobileFilterClasses.buttonGroup}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          console.log('Schedule Maintenance clicked for:', item.name);
                          // TODO: Open maintenance scheduling dialog
                        }}
                      >
                        <Wrench className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Schedule Maintenance</span>
                        <span className="sm:hidden">Maint.</span>
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          console.log('View Details clicked for:', item.name);
                          // TODO: Open equipment details dialog
                        }}
                      >
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <div className="grid gap-4">
              {maintenanceRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {record.equipment_name}
                        </CardTitle>
                        <CardDescription>
                          {record.maintenance_type} • {new Date(record.date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Technician</div>
                        <div className="text-sm">{record.technician}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Cost</div>
                        <div className="font-semibold text-sm">${record.cost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Date</div>
                        <div className="text-sm">{new Date(record.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => {
                          console.log('View Maintenance Details clicked for:', record.equipment_name);
                          // TODO: Open maintenance details dialog
                        }}
                      >
                        <span className="hidden sm:inline">View Maintenance Details</span>
                        <span className="sm:hidden">Details</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="utilization" className="space-y-4">
            <div className="grid gap-4">
              {equipment.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          {item.name}
                        </CardTitle>
                        <CardDescription>
                          Current utilization and usage statistics
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Hours This Month</div>
                        <div className="text-2xl font-bold">{Math.floor(item.hours_used / 12)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Utilization Rate</div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.floor(Math.random() * 30 + 60)}%
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Revenue Generated</div>
                        <div className="text-2xl font-bold">
                          ${(item.daily_rate * Math.floor(item.hours_used / 12 / 8)).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground text-xs">Efficiency</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.floor(Math.random() * 20 + 75)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Active units</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <div className="text-xs sm:text-sm text-green-600">+12% from last month</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1</div>
                  <div className="flex items-center text-xs sm:text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Within 30 days
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}