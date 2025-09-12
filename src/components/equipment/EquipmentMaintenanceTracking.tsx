import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Truck, Wrench, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock, DollarSign, TrendingUp, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';

interface MaintenanceRecord {
  id: string;
  type: 'preventive' | 'corrective' | 'inspection' | 'repair';
  description: string;
  performedBy: string;
  date: string;
  cost: number;
  partsUsed: string[];
  hoursSpent: number;
  notes: string;
  nextDueDate?: string;
}

interface Equipment {
  id: string;
  name: string;
  type: 'excavator' | 'bulldozer' | 'crane' | 'truck' | 'generator' | 'compressor' | 'tool';
  make: string;
  model: string;
  year: number;
  serialNumber: string;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'repair';
  location: string;
  currentProject?: {
    id: string;
    name: string;
    assignedDate: string;
    estimatedReturnDate: string;
  };
  specifications: {
    capacity?: string;
    fuelType?: string;
    powerRating?: string;
    weight?: string;
  };
  maintenance: {
    lastService: string;
    nextService: string;
    serviceInterval: number; // days
    totalHours: number;
    maintenanceRecords: MaintenanceRecord[];
  };
  financials: {
    purchasePrice: number;
    purchaseDate: string;
    currentValue: number;
    totalMaintenanceCost: number;
    monthlyDepreciation: number;
  };
  utilization: {
    hoursThisMonth: number;
    hoursThisYear: number;
    utilizationRate: number; // percentage
    fuelConsumption: number;
    operatingCostPerHour: number;
  };
}

interface ScheduledAssignment {
  id: string;
  equipmentId: string;
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  operatorName: string;
  purpose: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export const EquipmentMaintenanceTracking: React.FC = () => {
  const { userProfile } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [assignments, setAssignments] = useState<ScheduledAssignment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();

  useEffect(() => {
    loadEquipmentData();
    loadAssignments();
  }, []);

  const loadEquipmentData = async () => {
    try {
      // Equipment tables not yet fully implemented, using mock data
      console.log('Equipment inventory table not fully set up, using mock data');
      
      const mockEquipment: Equipment[] = [
        {
          id: '1',
          name: 'CAT 320 Excavator',
          type: 'excavator',
          make: 'Caterpillar',
          model: '320',
          year: 2022,
          serialNumber: 'CAT320-001',
          status: 'in_use',
          location: 'Downtown Office Complex',
          currentProject: {
            id: 'proj1',
            name: 'Downtown Office Complex',
            assignedDate: '2024-01-15',
            estimatedReturnDate: '2024-02-15'
          },
          specifications: {
            capacity: '20 tons',
            fuelType: 'Diesel',
            powerRating: '122 kW',
            weight: '20,500 kg'
          },
          maintenance: {
            lastService: '2024-01-01',
            nextService: '2024-02-01',
            serviceInterval: 30,
            totalHours: 1250,
            maintenanceRecords: []
          },
          financials: {
            purchasePrice: 250000,
            purchaseDate: '2022-03-15',
            currentValue: 220000,
            totalMaintenanceCost: 12500,
            monthlyDepreciation: 1250
          },
          utilization: {
            hoursThisMonth: 180,
            hoursThisYear: 720,
            utilizationRate: 85,
            fuelConsumption: 15.5,
            operatingCostPerHour: 45
          }
        }
      ];
      setEquipment(mockEquipment);
    } catch (error) {
      console.error('Error loading equipment data:', error);
      setEquipment([]);
    }
  };

  const loadAssignments = () => {
    // Mock assignment data
    const mockAssignments: ScheduledAssignment[] = [
      {
        id: '1',
        equipmentId: '1',
        projectId: 'proj1',
        projectName: 'Downtown Office Complex',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        operatorName: 'John Smith',
        purpose: 'Excavation and foundation work',
        status: 'active'
      },
      {
        id: '2',
        equipmentId: '3',
        projectId: 'proj2',
        projectName: 'Residential Development',
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        operatorName: 'Mike Davis',
        purpose: 'Steel erection and heavy lifting',
        status: 'scheduled'
      }
    ];

    setAssignments(mockAssignments);
  };

  const scheduleEquipment = async (equipmentId: string, projectId: string, startDate: string, endDate: string, operatorName: string, purpose: string) => {
    const newAssignment: ScheduledAssignment = {
      id: Date.now().toString(),
      equipmentId,
      projectId,
      projectName: 'New Project', // Would come from project lookup
      startDate,
      endDate,
      operatorName,
      purpose,
      status: 'scheduled'
    };

    setAssignments(prev => [...prev, newAssignment]);

    // Update equipment status
    setEquipment(prev => prev.map(eq =>
      eq.id === equipmentId
        ? {
            ...eq,
            status: 'in_use',
            currentProject: {
              id: projectId,
              name: 'New Project',
              assignedDate: startDate,
              estimatedReturnDate: endDate
            }
          }
        : eq
    ));

    toast({
      title: "Equipment Scheduled",
      description: "Equipment has been successfully scheduled for the project.",
    });

    setShowScheduleForm(false);
  };

  const addMaintenanceRecord = async (equipmentId: string, record: Omit<MaintenanceRecord, 'id'>) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: Date.now().toString()
    };

    setEquipment(prev => prev.map(eq =>
      eq.id === equipmentId
        ? {
            ...eq,
            maintenance: {
              ...eq.maintenance,
              maintenanceRecords: [...eq.maintenance.maintenanceRecords, newRecord],
              lastService: record.date,
              nextService: record.nextDueDate || addDays(new Date(record.date), eq.maintenance.serviceInterval).toISOString(),
              totalHours: eq.maintenance.totalHours + record.hoursSpent
            },
            financials: {
              ...eq.financials,
              totalMaintenanceCost: eq.financials.totalMaintenanceCost + record.cost
            }
          }
        : eq
    ));

    toast({
      title: "Maintenance Record Added",
      description: "Maintenance record has been successfully logged.",
    });

    setShowMaintenanceForm(false);
  };

  const updateEquipmentStatus = async (equipmentId: string, newStatus: Equipment['status']) => {
    setEquipment(prev => prev.map(eq =>
      eq.id === equipmentId ? { ...eq, status: newStatus } : eq
    ));

    toast({
      title: "Status Updated",
      description: `Equipment status has been updated to ${newStatus.replace('_', ' ')}.`,
    });
  };

  const getStatusBadgeVariant = (status: Equipment['status']) => {
    switch (status) {
      case 'available': return 'default';
      case 'in_use': return 'default';
      case 'maintenance': return 'secondary';
      case 'out_of_service': return 'destructive';
      case 'repair': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: Equipment['status']) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'in_use': return <Settings className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'out_of_service': return <AlertTriangle className="h-4 w-4" />;
      case 'repair': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getMaintenanceStatus = (nextService: string): 'overdue' | 'due_soon' | 'current' => {
    const daysUntilService = differenceInDays(new Date(nextService), new Date());
    if (daysUntilService < 0) return 'overdue';
    if (daysUntilService <= 7) return 'due_soon';
    return 'current';
  };

  const filteredEquipment = equipment.filter(eq => {
    const statusMatch = filterStatus === 'all' || eq.status === filterStatus;
    const typeMatch = filterType === 'all' || eq.type === filterType;
    return statusMatch && typeMatch;
  });

  // Calculate summary statistics
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(eq => eq.status === 'available').length;
  const inUseEquipment = equipment.filter(eq => eq.status === 'in_use').length;
  const maintenanceEquipment = equipment.filter(eq => ['maintenance', 'repair'].includes(eq.status)).length;
  const totalValue = equipment.reduce((sum, eq) => sum + eq.financials.currentValue, 0);
  const monthlyOperatingCost = equipment.reduce((sum, eq) => sum + (eq.utilization.hoursThisMonth * eq.utilization.operatingCostPerHour), 0);
  const averageUtilization = equipment.reduce((sum, eq) => sum + eq.utilization.utilizationRate, 0) / equipment.length;

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Equipment</p>
                <p className="text-2xl font-bold">{totalEquipment}</p>
                <p className="text-sm text-muted-foreground">{availableEquipment} available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Fleet Value</p>
                <p className="text-2xl font-bold">${(totalValue / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Current market value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
                <p className="text-2xl font-bold">{averageUtilization.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Fleet average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Maintenance</p>
                <p className="text-2xl font-bold">{maintenanceEquipment}</p>
                <p className="text-sm text-muted-foreground">Needs attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Equipment Fleet Management
            </span>
            <div className="flex gap-2">
              <Button onClick={() => setShowScheduleForm(true)}>
                Schedule Equipment
              </Button>
              <Button onClick={() => setShowMaintenanceForm(true)}>
                Log Maintenance
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="type-filter">Type:</Label>
              <Select onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="excavator">Excavator</SelectItem>
                  <SelectItem value="bulldozer">Bulldozer</SelectItem>
                  <SelectItem value="crane">Crane</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="generator">Generator</SelectItem>
                  <SelectItem value="compressor">Compressor</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Equipment List */}
          <div className="space-y-4">
            {filteredEquipment.map((eq) => {
              const maintenanceStatus = getMaintenanceStatus(eq.maintenance.nextService);
              
              return (
                <div key={eq.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{eq.name}</h3>
                      <Badge variant={getStatusBadgeVariant(eq.status)} className="flex items-center gap-1">
                        {getStatusIcon(eq.status)}
                        {eq.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {maintenanceStatus === 'overdue' && (
                        <Badge variant="destructive">
                          Maintenance Overdue
                        </Badge>
                      )}
                      {maintenanceStatus === 'due_soon' && (
                        <Badge variant="secondary">
                          Maintenance Due Soon
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {eq.status === 'available' && (
                        <Button size="sm" onClick={() => setSelectedEquipment(eq)}>
                          Schedule
                        </Button>
                      )}
                      {['maintenance', 'repair'].includes(eq.status) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEquipmentStatus(eq.id, 'available')}
                        >
                          Mark Available
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Equipment Info:</span>
                      <div className="font-medium">{eq.make} {eq.model} ({eq.year})</div>
                      <div className="text-sm text-muted-foreground">
                        SN: {eq.serialNumber}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Location:</span>
                      <div className="font-medium">{eq.location}</div>
                      {eq.currentProject && (
                        <div className="text-sm text-muted-foreground">
                          Project: {eq.currentProject.name}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Utilization:</span>
                      <div className="font-medium">{eq.utilization.utilizationRate}%</div>
                      <div className="text-sm text-muted-foreground">
                        {eq.utilization.hoursThisMonth}h this month
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Next Service:</span>
                      <div className="font-medium">
                        {format(new Date(eq.maintenance.nextService), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {differenceInDays(new Date(eq.maintenance.nextService), new Date())} days
                      </div>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div>
                    <span className="text-sm text-muted-foreground">Specifications:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
                      {Object.entries(eq.specifications).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="ml-1 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
                    <div>
                      <span className="text-sm text-muted-foreground">Current Value:</span>
                      <div className="font-medium">${eq.financials.currentValue.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Maintenance Cost:</span>
                      <div className="font-medium">${eq.financials.totalMaintenanceCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Operating Cost/Hour:</span>
                      <div className="font-medium">${eq.utilization.operatingCostPerHour}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Hours:</span>
                      <div className="font-medium">{eq.maintenance.totalHours.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Recent Maintenance */}
                  {eq.maintenance.maintenanceRecords.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recent Maintenance</h4>
                      <div className="space-y-1">
                        {eq.maintenance.maintenanceRecords.slice(-2).map((record) => (
                          <div key={record.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {record.type.toUpperCase()}
                              </Badge>
                              <span>{record.description}</span>
                              <span className="text-muted-foreground">
                                - {format(new Date(record.date), 'MMM dd')}
                              </span>
                            </div>
                            <span className="font-medium">${record.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Progress 
                    value={eq.utilization.utilizationRate} 
                    className="w-full" 
                  />
                </div>
              );
            })}

            {filteredEquipment.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No equipment found for the selected filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};