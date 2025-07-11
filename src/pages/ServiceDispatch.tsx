import { useState } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Search, Phone, MapPin, Clock, User, Calendar, CheckCircle, AlertTriangle, Zap, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ServiceDispatch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("active-calls");
  const { toast } = useToast();

  const serviceCalls = [
    {
      id: "1",
      call_number: "SC-2024-0001",
      title: "HVAC System Not Heating",
      customer_name: "John Smith",
      customer_phone: "(555) 123-4567",
      customer_address: "123 Main St, Springfield, IL",
      service_type: "repair",
      priority: "urgent",
      status: "dispatched",
      assigned_technician: "Mike Johnson",
      scheduled_date: "2024-11-25",
      scheduled_time_start: "09:00",
      estimated_cost: 350.00,
      created_at: "2024-11-24T14:30:00Z"
    },
    {
      id: "2",
      call_number: "SC-2024-0002", 
      title: "Plumbing Leak Emergency",
      customer_name: "Sarah Wilson",
      customer_phone: "(555) 987-6543",
      customer_address: "456 Oak Ave, Springfield, IL",
      service_type: "emergency",
      priority: "emergency",
      status: "on_site",
      assigned_technician: "Dave Miller",
      scheduled_date: "2024-11-24",
      scheduled_time_start: "15:30",
      estimated_cost: 275.00,
      created_at: "2024-11-24T15:15:00Z"
    },
    {
      id: "3",
      call_number: "SC-2024-0003",
      title: "Preventive Maintenance Check",
      customer_name: "ABC Corp",
      customer_phone: "(555) 456-7890",
      customer_address: "789 Business Park Dr, Springfield, IL",
      service_type: "preventive_maintenance",
      priority: "standard",
      status: "scheduled",
      assigned_technician: "Tom Brown",
      scheduled_date: "2024-11-26",
      scheduled_time_start: "10:00",
      estimated_cost: 150.00,
      created_at: "2024-11-23T09:45:00Z"
    }
  ];

  const technicians = [
    {
      id: "1",
      name: "Mike Johnson",
      status: "en_route",
      current_call: "SC-2024-0001",
      location: "Driving to Main St",
      eta: "10 minutes",
      total_calls_today: 3,
      completed_today: 2
    },
    {
      id: "2", 
      name: "Dave Miller",
      status: "on_site",
      current_call: "SC-2024-0002",
      location: "456 Oak Ave",
      eta: null,
      total_calls_today: 4,
      completed_today: 3
    },
    {
      id: "3",
      name: "Tom Brown",
      status: "available",
      current_call: null,
      location: "Shop",
      eta: null,
      total_calls_today: 2,
      completed_today: 2
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { variant: "outline" as const, label: "Received", icon: Clock },
      scheduled: { variant: "default" as const, label: "Scheduled", icon: Calendar },
      dispatched: { variant: "secondary" as const, label: "Dispatched", icon: User },
      en_route: { variant: "default" as const, label: "En Route", icon: MapPin },
      on_site: { variant: "default" as const, label: "On Site", icon: CheckCircle },
      in_progress: { variant: "default" as const, label: "In Progress", icon: CheckCircle },
      parts_needed: { variant: "destructive" as const, label: "Parts Needed", icon: AlertTriangle },
      on_hold: { variant: "secondary" as const, label: "On Hold", icon: Clock },
      completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
      cancelled: { variant: "destructive" as const, label: "Cancelled", icon: AlertTriangle }
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
      emergency: { variant: "destructive" as const, label: "Emergency", icon: Zap },
      urgent: { variant: "destructive" as const, label: "Urgent", icon: AlertTriangle },
      standard: { variant: "default" as const, label: "Standard", icon: Clock },
      low: { variant: "outline" as const, label: "Low", icon: Clock }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    const Icon = config?.icon || Clock;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || priority}
      </Badge>
    );
  };

  const getTechnicianStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: "default" as const, label: "Available" },
      en_route: { variant: "secondary" as const, label: "En Route" },
      on_site: { variant: "default" as const, label: "On Site" },
      off_duty: { variant: "outline" as const, label: "Off Duty" },
      break: { variant: "outline" as const, label: "On Break" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant}>{config?.label || status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <DashboardLayout title="Service Dispatch">
      <div className="flex justify-end mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Service Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Service Call</DialogTitle>
                <DialogDescription>
                  Create a new service call and assign it to a technician
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name">Customer Name</Label>
                    <Input id="customer-name" placeholder="John Smith" />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Phone Number</Label>
                    <Input id="customer-phone" placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer-address">Service Address</Label>
                  <Input id="customer-address" placeholder="123 Main St, Springfield, IL" />
                </div>
                <div>
                  <Label htmlFor="title">Issue Title</Label>
                  <Input id="title" placeholder="HVAC system not working" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Detailed description of the issue..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service-type">Service Type</Label>
                    <Select>
                      <SelectTrigger id="service-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="installation">Installation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="technician">Assign Technician</Label>
                    <Select>
                      <SelectTrigger id="technician">
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mike">Mike Johnson</SelectItem>
                        <SelectItem value="dave">Dave Miller</SelectItem>
                        <SelectItem value="tom">Tom Brown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input id="scheduled-date" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                    <Input id="scheduled-time" type="time" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create Service Call</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
      </div>
      
      <div className="space-y-6">

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-calls">Active Calls</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search service calls, customers, or technicians..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="active-calls" className="space-y-4">
          <div className="grid gap-4">
            {serviceCalls.map((call) => (
              <Card key={call.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {call.title}
                        {getPriorityBadge(call.priority)}
                      </CardTitle>
                      <CardDescription>
                        {call.call_number} • {call.customer_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(call.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Customer</div>
                        <div>{call.customer_phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Address</div>
                        <div className="truncate">{call.customer_address}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Technician</div>
                        <div>{call.assigned_technician}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-muted-foreground">Scheduled</div>
                        <div>{formatTime(call.scheduled_time_start)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">Estimated Cost: </span>
                      <span className="text-lg font-semibold">{formatCurrency(call.estimated_cost)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
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

        <TabsContent value="technicians" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {technicians.map((tech) => (
              <Card key={tech.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{tech.name}</CardTitle>
                      <CardDescription>{tech.location}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTechnicianStatusBadge(tech.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tech.current_call && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="font-medium text-sm">Current Call</div>
                        <div className="text-sm text-muted-foreground">{tech.current_call}</div>
                        {tech.eta && (
                          <div className="text-sm">ETA: {tech.eta}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Today's Calls</div>
                        <div className="text-lg font-semibold">{tech.total_calls_today}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Completed</div>
                        <div className="text-lg font-semibold text-green-600">{tech.completed_today}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <MapPin className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
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
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                Scheduled service calls for {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceCalls
                  .filter(call => call.scheduled_date === "2024-11-25")
                  .map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                          {formatTime(call.scheduled_time_start)}
                        </div>
                        <div>
                          <div className="font-medium">{call.title}</div>
                          <div className="text-sm text-muted-foreground">{call.customer_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">{call.assigned_technician}</div>
                        {getStatusBadge(call.status)}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Service Calls</CardTitle>
              <CardDescription>
                Completed and cancelled service calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Recent History</h3>
                <p className="text-muted-foreground mb-4">
                  Completed service calls will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}