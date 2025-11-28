import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Wrench,
  PlusCircle,
  Search,
  AlertTriangle,
  Calendar,
  Clock,
  DollarSign
} from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  description: string;
  equipment_type: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: number;
  current_value: number;
  location: string;
  status: string;
  maintenance_schedule: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  is_active: boolean;
  created_at: string;
}

interface EquipmentUsage {
  id: string;
  equipment_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  hours_used: number;
  hourly_rate: number;
  total_cost: number;
  notes: string;
  equipment?: { name: string; equipment_type: string };
  projects?: { name: string };
}

const EquipmentTracking = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsage[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    description: '',
    equipment_type: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: 0,
    current_value: 0,
    location: '',
    status: 'available',
    maintenance_schedule: '',
    next_maintenance_date: ''
  });

  const [newUsage, setNewUsage] = useState({
    equipment_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
    hours_used: 0,
    hourly_rate: 0,
    notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');

      if (equipmentError) throw equipmentError;
      setEquipment(equipmentData || []);

      // Load equipment usage with equipment and project names
      const { data: usageData, error: usageError } = await supabase
        .from('equipment_usage')
        .select(`
          *,
          equipment(name, equipment_type),
          projects(name)
        `)
        .order('start_date', { ascending: false })
        .limit(50);

      if (usageError) throw usageError;
      setEquipmentUsage(usageData || []);

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['active', 'in_progress'])
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load equipment data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateEquipment = async () => {
    if (!newEquipment.name || !newEquipment.equipment_type) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .insert([{
          ...newEquipment,
          company_id: userProfile?.company_id,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Equipment added successfully"
      });

      setIsCreateDialogOpen(false);
      setNewEquipment({
        name: '',
        description: '',
        equipment_type: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_cost: 0,
        current_value: 0,
        location: '',
        status: 'available',
        maintenance_schedule: '',
        next_maintenance_date: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating equipment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add equipment"
      });
    }
  };

  const handleCreateUsage = async () => {
    if (!newUsage.equipment_id || !newUsage.project_id || !newUsage.start_date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const totalCost = newUsage.hours_used * newUsage.hourly_rate;

      const { error } = await supabase
        .from('equipment_usage')
        .insert([{
          ...newUsage,
          total_cost: totalCost,
          operator_id: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Equipment usage recorded successfully"
      });

      setIsUsageDialogOpen(false);
      setNewUsage({
        equipment_id: '',
        project_id: '',
        start_date: '',
        end_date: '',
        hours_used: 0,
        hourly_rate: 0,
        notes: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error recording usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record equipment usage"
      });
    }
  };

  const equipmentTypes = [...new Set(equipment.map(e => e.equipment_type))].filter(Boolean);
  
  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || eq.equipment_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || eq.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const maintenanceDue = equipment.filter(e => {
    if (!e.next_maintenance_date) return false;
    const dueDate = new Date(e.next_maintenance_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 30;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'in_use': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'retired': return 'outline';
      default: return 'outline';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Equipment Tracking</h1>
                <p className="text-sm text-muted-foreground">Manage equipment inventory and usage</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Log Usage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Log Equipment Usage</DialogTitle>
                    <DialogDescription>
                      Record equipment usage for a project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="usage-equipment">Equipment *</Label>
                        <Select value={newUsage.equipment_id} onValueChange={(value) => setNewUsage({...newUsage, equipment_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select equipment" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipment.filter(eq => eq.status === 'available').map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} - {eq.equipment_type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="usage-project">Project *</Label>
                        <Select value={newUsage.project_id} onValueChange={(value) => setNewUsage({...newUsage, project_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_date">Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={newUsage.start_date}
                          onChange={(e) => setNewUsage({...newUsage, start_date: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={newUsage.end_date}
                          onChange={(e) => setNewUsage({...newUsage, end_date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hours_used">Hours Used</Label>
                        <Input
                          id="hours_used"
                          type="number"
                          min="0"
                          step="0.5"
                          value={newUsage.hours_used}
                          onChange={(e) => setNewUsage({...newUsage, hours_used: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="hourly_rate">Hourly Rate</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newUsage.hourly_rate}
                          onChange={(e) => setNewUsage({...newUsage, hourly_rate: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="usage_notes">Notes</Label>
                      <Textarea
                        id="usage_notes"
                        placeholder="Additional notes about equipment usage..."
                        value={newUsage.notes}
                        onChange={(e) => setNewUsage({...newUsage, notes: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUsage}>
                        Log Usage
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Equipment</DialogTitle>
                    <DialogDescription>
                      Add new equipment to your inventory management system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="equipment_name">Name *</Label>
                        <Input
                          id="equipment_name"
                          placeholder="Equipment name"
                          value={newEquipment.name}
                          onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="equipment_type">Type *</Label>
                        <Input
                          id="equipment_type"
                          placeholder="e.g., Excavator, Generator, etc."
                          value={newEquipment.equipment_type}
                          onChange={(e) => setNewEquipment({...newEquipment, equipment_type: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="equipment_description">Description</Label>
                      <Textarea
                        id="equipment_description"
                        placeholder="Equipment description..."
                        value={newEquipment.description}
                        onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          placeholder="Equipment model"
                          value={newEquipment.model}
                          onChange={(e) => setNewEquipment({...newEquipment, model: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="serial_number">Serial Number</Label>
                        <Input
                          id="serial_number"
                          placeholder="Serial number"
                          value={newEquipment.serial_number}
                          onChange={(e) => setNewEquipment({...newEquipment, serial_number: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="purchase_date">Purchase Date</Label>
                        <Input
                          id="purchase_date"
                          type="date"
                          value={newEquipment.purchase_date}
                          onChange={(e) => setNewEquipment({...newEquipment, purchase_date: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="purchase_cost">Purchase Cost</Label>
                        <Input
                          id="purchase_cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newEquipment.purchase_cost}
                          onChange={(e) => setNewEquipment({...newEquipment, purchase_cost: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="current_value">Current Value</Label>
                        <Input
                          id="current_value"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newEquipment.current_value}
                          onChange={(e) => setNewEquipment({...newEquipment, current_value: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="equipment_location">Location</Label>
                        <Input
                          id="equipment_location"
                          placeholder="Current location"
                          value={newEquipment.location}
                          onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={newEquipment.status} onValueChange={(value) => setNewEquipment({...newEquipment, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="in_use">In Use</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maintenance_schedule">Maintenance Schedule</Label>
                        <Input
                          id="maintenance_schedule"
                          placeholder="e.g., Every 6 months"
                          value={newEquipment.maintenance_schedule}
                          onChange={(e) => setNewEquipment({...newEquipment, maintenance_schedule: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="next_maintenance_date">Next Maintenance Date</Label>
                        <Input
                          id="next_maintenance_date"
                          type="date"
                          value={newEquipment.next_maintenance_date}
                          onChange={(e) => setNewEquipment({...newEquipment, next_maintenance_date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateEquipment}>
                        Add Equipment
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Maintenance Alert */}
        {maintenanceDue.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Maintenance Due
              </CardTitle>
              <CardDescription className="text-yellow-700">
                {maintenanceDue.length} equipment(s) require maintenance within 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {maintenanceDue.slice(0, 3).map((eq) => (
                  <div key={eq.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{eq.name}</span>
                    <Badge variant="outline" className="text-yellow-800">
                      Due: {new Date(eq.next_maintenance_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
                {maintenanceDue.length > 3 && (
                  <p className="text-sm text-yellow-700">
                    and {maintenanceDue.length - 3} more...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="usage">Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Equipment</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, model, or serial number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type-filter">Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {equipmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Equipment Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
                        ? 'No equipment matches your current filters' 
                        : 'No equipment has been added yet'
                      }
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add First Equipment
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredEquipment.map((eq) => (
                  <Card key={eq.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{eq.name}</CardTitle>
                        <Badge variant={getStatusColor(eq.status)}>
                          {eq.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription>{eq.equipment_type}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {eq.description && (
                        <p className="text-sm text-muted-foreground">{eq.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {eq.model && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Model</p>
                              <p className="font-medium">{eq.model}</p>
                            </div>
                          </>
                        )}
                        {eq.serial_number && (
                          <div>
                            <p className="text-muted-foreground">Serial #</p>
                            <p className="font-mono text-xs">{eq.serial_number}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Purchase Cost</p>
                          <p className="font-medium">${eq.purchase_cost}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Value</p>
                          <p className="font-medium">${eq.current_value}</p>
                        </div>
                        {eq.location && (
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{eq.location}</p>
                          </div>
                        )}
                        {eq.purchase_date && (
                          <div>
                            <p className="text-muted-foreground">Purchased</p>
                            <p className="font-medium">{new Date(eq.purchase_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      
                      {eq.next_maintenance_date && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Next Maintenance</p>
                          <p className="font-medium">{new Date(eq.next_maintenance_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Usage History</CardTitle>
                <CardDescription>Track equipment utilization across projects</CardDescription>
              </CardHeader>
              <CardContent>
                {equipmentUsage.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No equipment usage recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {equipmentUsage.map((usage) => (
                      <div key={usage.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{usage.equipment?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {usage.equipment?.equipment_type} • Project: {usage.projects?.name}
                          </p>
                          {usage.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{usage.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{usage.hours_used} hours</p>
                          <p className="text-sm text-muted-foreground">${usage.total_cost}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(usage.start_date).toLocaleDateString()}
                            {usage.end_date && ` - ${new Date(usage.end_date).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EquipmentTracking;