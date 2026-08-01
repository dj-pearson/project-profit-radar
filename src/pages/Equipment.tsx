import { useState } from 'react';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Truck, Wrench, AlertTriangle, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import { mobileFilterClasses } from '@/utils/mobileHelpers';
import { useEquipmentWithMaintenance, useMaintenanceRecords, useEquipmentStats, useCreateEquipment } from '@/hooks/useEquipment';
import { EquipmentAssignmentsTab } from '@/components/equipment/EquipmentAssignmentsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("fleet");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    equipment_type: '',
    model: '',
    serial_number: '',
    purchase_cost: '',
  });

  // Fetch real data from database
  const { data: equipment, isLoading: equipmentLoading } = useEquipmentWithMaintenance();
  const { data: maintenanceRecords, isLoading: maintenanceLoading } = useMaintenanceRecords();
  const { data: stats, isLoading: statsLoading } = useEquipmentStats();
  const createEquipment = useCreateEquipment();

  // Filter equipment based on search term
  const filteredEquipment = equipment?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipment_type?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle adding new equipment
  const handleAddEquipment = async () => {
    if (!newEquipment.name || !newEquipment.equipment_type) return;

    await createEquipment.mutateAsync({
      name: newEquipment.name,
      equipment_type: newEquipment.equipment_type,
      model: newEquipment.model || null,
      serial_number: newEquipment.serial_number || null,
      purchase_cost: newEquipment.purchase_cost ? parseFloat(newEquipment.purchase_cost) : null,
    });

    setNewEquipment({ name: '', equipment_type: '', model: '', serial_number: '', purchase_cost: '' });
    setIsAddDialogOpen(false);
  };

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
      <Badge variant={config?.variant} className="flex items-center gap-1" aria-label={`Status: ${config?.label || status}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <AccessiblePageWrapper pageTitle="Equipment">
    <DashboardLayout title="Equipment Management" hasAccessibleWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Equipment Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage fleet, maintenance, and equipment utilization</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add Equipment</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby="add-equipment-description">
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                  <DialogDescription id="add-equipment-description">
                    Register new equipment to your fleet
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Equipment Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter equipment name"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <Label htmlFor="equipment_type">Equipment Type *</Label>
                    <Select
                      value={newEquipment.equipment_type}
                      onValueChange={(value) => setNewEquipment(prev => ({ ...prev, equipment_type: value }))}
                      aria-required="true"
                    >
                      <SelectTrigger aria-label="Select equipment type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excavator">Excavator</SelectItem>
                        <SelectItem value="loader">Loader</SelectItem>
                        <SelectItem value="bulldozer">Bulldozer</SelectItem>
                        <SelectItem value="crane">Crane</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="compactor">Compactor</SelectItem>
                        <SelectItem value="generator">Generator</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="e.g., 320 GC"
                        value={newEquipment.model}
                        onChange={(e) => setNewEquipment(prev => ({ ...prev, model: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="serial">Serial Number</Label>
                      <Input
                        id="serial"
                        placeholder="Serial number"
                        value={newEquipment.serial_number}
                        onChange={(e) => setNewEquipment(prev => ({ ...prev, serial_number: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
                    <Input
                      id="purchase_cost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newEquipment.purchase_cost}
                      onChange={(e) => setNewEquipment(prev => ({ ...prev, purchase_cost: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={handleAddEquipment}
                    disabled={!newEquipment.name || !newEquipment.equipment_type || createEquipment.isPending}
                    className="w-full"
                  >
                    {createEquipment.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Adding...
                      </>
                    ) : (
                      'Add Equipment'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4" aria-label="Equipment management sections">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5" aria-label="Equipment categories">
            <TabsTrigger value="fleet" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Equipment Fleet</span>
              <span className="sm:hidden">Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Assign.</span>
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

          <div className={mobileFilterClasses.container} role="search" aria-label="Search equipment">
            <div className="flex items-center space-x-2 w-full">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                aria-label="Search equipment by name, model, or type"
              />
            </div>
          </div>

          <TabsContent value="fleet" className="space-y-4">
            {(() => {
              const equipmentColumns: TableColumn<any>[] = [
                {
                  key: 'name',
                  header: 'Name',
                  sortable: true,
                  render: (value) => (
                    <span className="flex items-center gap-2 font-medium">
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      {value}
                    </span>
                  ),
                },
                {
                  key: 'equipment_type',
                  header: 'Type',
                  sortable: true,
                  render: (value) => (
                    <span className="capitalize">{value || '--'}</span>
                  ),
                },
                {
                  key: 'model',
                  header: 'Model',
                  hideOnMobile: true,
                  render: (value) => <span>{value || '--'}</span>,
                },
                {
                  key: 'serial_number',
                  header: 'Serial Number',
                  hideOnMobile: true,
                  render: (value) => <span className="font-mono text-xs">{value || '--'}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortable: true,
                  render: (value) => getStatusBadge(value || 'available'),
                },
                {
                  key: 'location',
                  header: 'Location',
                  hideOnMobile: true,
                  render: (value) => (
                    <span className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      {value || 'Not assigned'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  headerRender: () => <span className="sr-only">Actions</span>,
                  render: (_, row) => (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" aria-label={`Schedule maintenance for ${row.name}`}>
                        <Wrench className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button size="sm" aria-label={`View details for ${row.name}`}>
                        <span className="sr-only">Details</span>
                        <span aria-hidden="true">View</span>
                      </Button>
                    </div>
                  ),
                },
              ];

              return (
                <AccessibleTable
                  caption="Equipment Fleet"
                  hideCaption
                  columns={equipmentColumns}
                  data={filteredEquipment}
                  loading={equipmentLoading}
                  emptyContent={
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                      <h3 className="text-lg font-semibold mb-2">No Equipment Found</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        {searchTerm
                          ? 'No equipment matches your search criteria.'
                          : 'Get started by adding your first piece of equipment to your fleet.'}
                      </p>
                      {!searchTerm && (
                        <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                          Add Your First Equipment
                        </Button>
                      )}
                    </div>
                  }
                />
              );
            })()}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <EquipmentAssignmentsTab />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            {maintenanceLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !maintenanceRecords || maintenanceRecords.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold mb-2">No Maintenance Records</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    No maintenance records have been logged yet. Schedule maintenance for your equipment to track service history.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {maintenanceRecords.map((record: any) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow" role="article" aria-labelledby={`maintenance-${record.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle id={`maintenance-${record.id}`} className="text-lg">
                            {record.equipment?.name || 'Unknown Equipment'}
                          </CardTitle>
                          <CardDescription>
                            {record.maintenance_type} • {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : 'No date'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(record.actual_completion_date ? 'completed' : 'in_progress')}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Task</div>
                          <div className="text-sm">{record.task_name}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Cost</div>
                          <div className="font-semibold text-sm">
                            {record.total_cost ? formatCurrency(record.total_cost) : 'Not recorded'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Work Performed</div>
                          <div className="text-sm truncate">{record.work_performed}</div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          aria-label={`View maintenance details for ${record.equipment?.name || 'equipment'}`}
                        >
                          <span className="hidden sm:inline">View Maintenance Details</span>
                          <span className="sm:hidden">Details</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="utilization" className="space-y-4">
            {equipmentLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEquipment.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold mb-2">No Utilization Data</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Add equipment to your fleet to start tracking utilization metrics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredEquipment.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow" role="article" aria-labelledby={`utilization-${item.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle id={`utilization-${item.id}`} className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5" aria-hidden="true" />
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
                          <div className="font-medium text-muted-foreground text-xs">Status</div>
                          <div className="text-2xl font-bold capitalize">{item.status || 'Available'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Location</div>
                          <div className="text-lg font-semibold">{item.location || 'Unassigned'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Purchase Value</div>
                          <div className="text-2xl font-bold">
                            {item.purchase_cost ? formatCurrency(item.purchase_cost) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground text-xs">Current Value</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {item.current_value ? formatCurrency(item.current_value) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.total || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Active units</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">{stats?.available || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Ready for use</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">In Use</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-blue-600">{stats?.inUse || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Currently deployed</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-yellow-600">{stats?.maintenance || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Being serviced</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-red-600">{stats?.outOfService || 0}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Needs attention</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.maintenanceDueSoon || 0}</div>
                      <div className="flex items-center text-xs sm:text-sm text-yellow-600">
                        <AlertTriangle className="h-4 w-4 mr-1" aria-hidden="true" />
                        Within 30 days
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
}