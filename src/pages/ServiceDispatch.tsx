import { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

export default function ServiceDispatch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("active-calls");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceCalls, setServiceCalls] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    service_address: '',
    issue_title: '',
    issue_description: '',
    service_type: '',
    priority: '',
    assigned_technician: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      service_address: '',
      issue_title: '',
      issue_description: '',
      service_type: '',
      priority: '',
      assigned_technician: '',
      scheduled_date: '',
      scheduled_time: ''
    });
  };

  const loadServiceCalls = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceCalls(data || []);
    } catch (error) {
      console.error('Error loading service calls:', error);
      toast({
        title: "Error",
        description: "Failed to load service calls",
        variant: "destructive"
      });
    }
  };

  const loadTechnicians = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, phone, is_active')
        .eq('company_id', userProfile.company_id)
        .in('role', ['technician', 'field_supervisor', 'journeyman', 'equipment_operator'])
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      
      const formattedTechnicians = data?.map(tech => ({
        id: tech.id,
        name: `${tech.first_name} ${tech.last_name}`,
        phone: tech.phone || 'N/A',
        status: 'available',
        current_call: null,
        location: 'Shop',
        eta: null,
        total_calls_today: 0,
        completed_today: 0
      })) || [];
      
      setTechnicians(formattedTechnicians);
    } catch (error) {
      console.error('Error loading technicians:', error);
      toast({
        title: "Error",
        description: "Failed to load technicians",
        variant: "destructive"
      });
    }
  };

  const handleCreateServiceCall = async () => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customer_name || !formData.issue_title || !formData.service_address || !formData.service_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const serviceCallData = {
        company_id: userProfile.company_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_address: formData.service_address || null,
        title: formData.issue_title,
        description: formData.issue_description || null,
        service_type: formData.service_type,
        priority: formData.priority || 'standard',
        assigned_technician_id: formData.assigned_technician || null,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time_start: formData.scheduled_time || null,
        status: 'received',
        created_by: userProfile.id
      };

      const { error } = await supabase
        .from('service_calls')
        .insert(serviceCallData as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service call created successfully"
      });
      
      resetForm();
      setIsDialogOpen(false);
      loadServiceCalls();
    } catch (error) {
      console.error('Error creating service call:', error);
      toast({
        title: "Error",
        description: "Failed to create service call. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      setDataLoading(true);
      Promise.all([loadServiceCalls(), loadTechnicians()])
        .finally(() => setDataLoading(false));
    }
  }, [userProfile?.company_id]);

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
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
                    <Label htmlFor="customer-name">Customer Name *</Label>
                    <Input 
                      id="customer-name" 
                      placeholder="John Smith"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Phone Number</Label>
                    <Input 
                      id="customer-phone" 
                      placeholder="(555) 123-4567"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customer-address">Service Address *</Label>
                  <Input 
                    id="customer-address" 
                    placeholder="123 Main St, Springfield, IL"
                    value={formData.service_address}
                    onChange={(e) => setFormData({...formData, service_address: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="title">Issue Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="HVAC system not working"
                    value={formData.issue_title}
                    onChange={(e) => setFormData({...formData, issue_title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detailed description of the issue..."
                    value={formData.issue_description}
                    onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service-type">Service Type *</Label>
                    <Select 
                      value={formData.service_type}
                      onValueChange={(value) => setFormData({...formData, service_type: value})}
                    >
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
                    <Select 
                      value={formData.priority}
                      onValueChange={(value) => setFormData({...formData, priority: value})}
                    >
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
                    <Select 
                      value={formData.assigned_technician}
                      onValueChange={(value) => setFormData({...formData, assigned_technician: value})}
                    >
                      <SelectTrigger id="technician">
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input 
                      id="scheduled-date" 
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                    <Input 
                      id="scheduled-time" 
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateServiceCall}
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Service Call"}
                  </Button>
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
          {dataLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading service calls...</div>
            </div>
          ) : serviceCalls.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Service Calls Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first service call to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Service Call
              </Button>
            </div>
          ) : (
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
                          <div>{call.customer_phone || 'No phone'}</div>
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
                          <div>{call.assigned_technician_id ? 'Assigned' : 'Not assigned'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground">Scheduled</div>
                          <div>{call.scheduled_time_start ? formatTime(call.scheduled_time_start) : 'Not scheduled'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">Estimated Cost: </span>
                        <span className="text-lg font-semibold">{formatCurrency(call.estimated_cost || 0)}</span>
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
          )}
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