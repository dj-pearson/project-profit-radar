import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Search, Wrench, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function EquipmentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("equipment");
  const { toast } = useToast();

  // Mock data for demonstration
  const equipment = [
    {
      id: "1",
      name: "CAT 320 Excavator",
      equipment_type: "excavator",
      model: "320",
      serial_number: "CAT123456",
      status: "in_use",
      location: "Downtown Construction Site",
      total_hours: 2847.5,
      last_maintenance_date: "2024-03-15",
      next_maintenance_date: "2024-05-15",
      utilization_rate: 78,
      assigned_operator: "John Doe",
      current_project: "City Center Renovation"
    },
    {
      id: "2",
      name: "Volvo L50H Loader",
      equipment_type: "loader", 
      model: "L50H",
      serial_number: "VLV789012",
      status: "available",
      location: "Main Yard",
      total_hours: 1924.0,
      last_maintenance_date: "2024-04-01",
      next_maintenance_date: "2024-06-01",
      utilization_rate: 65,
      assigned_operator: null,
      current_project: null
    },
    {
      id: "3",
      name: "Komatsu D65 Bulldozer",
      equipment_type: "bulldozer",
      model: "D65PX-18",
      serial_number: "KMT345678",
      status: "maintenance",
      location: "Service Bay 2",
      total_hours: 3562.25,
      last_maintenance_date: "2024-04-20",
      next_maintenance_date: "2024-04-25",
      utilization_rate: 45,
      assigned_operator: null,
      current_project: null
    }
  ];

  const maintenanceSchedule = [
    {
      id: "1",
      equipment_id: "1",
      equipment_name: "CAT 320 Excavator",
      task_name: "500-Hour Service",
      maintenance_type: "preventive",
      next_due_date: "2024-05-15",
      priority: "medium",
      status: "scheduled",
      estimated_cost: 850.00,
      assigned_technician: "Mike Wilson"
    },
    {
      id: "2",
      equipment_id: "3",
      equipment_name: "Komatsu D65 Bulldozer",
      task_name: "Hydraulic System Repair",
      maintenance_type: "corrective",
      next_due_date: "2024-04-25",
      priority: "high",
      status: "in_progress",
      estimated_cost: 1250.00,
      assigned_technician: "Sarah Tech"
    },
    {
      id: "3",
      equipment_id: "2",
      equipment_name: "Volvo L50H Loader",
      task_name: "Annual Inspection",
      maintenance_type: "inspection",
      next_due_date: "2024-06-01",
      priority: "low",
      status: "scheduled",
      estimated_cost: 425.00,
      assigned_technician: "Mike Wilson"
    }
  ];

  const utilizationData = [
    {
      id: "1",
      equipment_id: "1",
      equipment_name: "CAT 320 Excavator",
      date: "2024-04-22",
      total_hours: 8.5,
      operator: "John Doe",
      project: "City Center Renovation",
      activity_type: "excavation",
      fuel_consumed: 45.2,
      productivity_metric: "125 cubic yards excavated",
      billable_hours: 8.5,
      total_cost: 680.00
    },
    {
      id: "2",
      equipment_id: "2", 
      equipment_name: "Volvo L50H Loader",
      date: "2024-04-22",
      total_hours: 6.0,
      operator: "Jane Smith",
      project: "Highway Expansion",
      activity_type: "loading",
      fuel_consumed: 28.5,
      productivity_metric: "85 tons moved",
      billable_hours: 6.0,
      total_cost: 420.00
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: "default" as const, label: "Available", icon: CheckCircle },
      in_use: { variant: "secondary" as const, label: "In Use", icon: TrendingUp },
      maintenance: { variant: "destructive" as const, label: "Maintenance", icon: Wrench },
      repair: { variant: "destructive" as const, label: "Repair", icon: AlertTriangle },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Equipment Management</h1>
          <p className="text-muted-foreground mt-2">
            Track utilization, schedule maintenance, and manage heavy equipment fleet
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Wrench className="mr-2 h-4 w-4" />
                Schedule Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Equipment Maintenance</DialogTitle>
                <DialogDescription>
                  Create a new maintenance schedule for equipment
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Maintenance scheduling form would be implemented here.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
                <DialogDescription>
                  Register new equipment to the fleet management system
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Equipment registration form would be implemented here.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="equipment">Equipment Fleet</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment, operators, or projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="equipment" className="space-y-4">
          <div className="grid gap-4">
            {equipment.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {item.name}
                        {getStatusBadge(item.status)}
                      </CardTitle>
                      <CardDescription>
                        {item.model} • {item.serial_number}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getUtilizationColor(item.utilization_rate)}`}>
                        {item.utilization_rate}%
                      </div>
                      <div className="text-sm text-muted-foreground">Utilization</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Location</div>
                        <div className="truncate">{item.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Total Hours</div>
                        <div>{item.total_hours.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Next Maintenance</div>
                        <div>{formatDate(item.next_maintenance_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Operator</div>
                        <div>{item.assigned_operator || "Unassigned"}</div>
                      </div>
                    </div>
                  </div>
                  
                  {item.current_project && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium">Currently Assigned</div>
                      <div className="text-sm text-muted-foreground">{item.current_project}</div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Utilization Rate</div>
                      <Progress value={item.utilization_rate} className="w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Utilization
                      </Button>
                      <Button variant="outline" size="sm">
                        <Wrench className="h-4 w-4 mr-2" />
                        Maintenance
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

        <TabsContent value="utilization" className="space-y-4">
          <div className="grid gap-4">
            {utilizationData.map((util) => (
              <Card key={util.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{util.equipment_name}</CardTitle>
                      <CardDescription>
                        {util.date} • {util.operator} • {util.project}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{util.total_hours}h</div>
                      <div className="text-sm text-muted-foreground">Daily Hours</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="font-medium text-muted-foreground">Activity</div>
                      <div className="capitalize">{util.activity_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Fuel Used</div>
                      <div>{util.fuel_consumed} gal</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Productivity</div>
                      <div>{util.productivity_metric}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Total Cost</div>
                      <div className="font-semibold">{formatCurrency(util.total_cost)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Billable Hours: </span>
                      <span className="text-green-600 font-semibold">{util.billable_hours}h</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit Entry
                      </Button>
                      <Button size="sm">
                        View Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-4">
            {maintenanceSchedule.map((maintenance) => (
              <Card key={maintenance.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {maintenance.task_name}
                        {getPriorityBadge(maintenance.priority)}
                      </CardTitle>
                      <CardDescription>
                        {maintenance.equipment_name} • {maintenance.maintenance_type}
                      </CardDescription>
                    </div>
                    <Badge variant={maintenance.status === "in_progress" ? "default" : "secondary"}>
                      {maintenance.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Due Date</div>
                        <div>{formatDate(maintenance.next_due_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Technician</div>
                        <div>{maintenance.assigned_technician}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Type</div>
                        <div className="capitalize">{maintenance.maintenance_type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Est. Cost</div>
                        <div className="font-semibold">{formatCurrency(maintenance.estimated_cost)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Priority: </span>
                      <span className="capitalize">{maintenance.priority}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <Wrench className="h-4 w-4 mr-2" />
                        Work Order
                      </Button>
                      <Button size="sm">
                        Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Calendar</CardTitle>
              <CardDescription>
                Upcoming maintenance activities and equipment availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Calendar View</h3>
                <p className="text-muted-foreground mb-4">
                  Interactive maintenance calendar would be implemented here
                </p>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">72%</div>
                <p className="text-xs text-muted-foreground">
                  +5% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Equipment</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  out of 15 total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  within 30 days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Costs</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$24,500</div>
                <p className="text-xs text-muted-foreground">
                  -8% from last month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}