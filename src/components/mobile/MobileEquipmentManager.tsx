import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, QrCode, X, LogIn, LogOut, Search, RefreshCw, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import EquipmentQRScanner, { type ScanResult } from '@/components/equipment/EquipmentQRScanner';
import { format } from 'date-fns';
import { ErrorState } from '@/components/ui/states';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// The columns equipment actually has (types.ts, migration 20250703175856).
// There is no current_condition, current_location, assigned_to,
// checked_out_by, checked_out_at, due_back_at, notes or make column: the old
// update wrote seven of them and every check-out 400'd (US-368). Status and
// location are the only per-transaction facts the table can hold.
interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  location: string | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
}

interface EquipmentTransaction {
  equipment_id: string;
  action_type: 'check_out' | 'check_in' | 'maintenance' | 'inspection';
  user_id: string;
  project_id?: string;
  location: string;
  condition_after?: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

interface MobileEquipmentManagerProps {
  projectId?: string;
  onTransactionComplete?: (transaction: Record<string, unknown>) => void;
  onClose?: () => void;
}

const MobileEquipmentManager: React.FC<MobileEquipmentManagerProps> = ({
  projectId,
  onTransactionComplete,
  onClose
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [actionType, setActionType] = useState<'check_out' | 'check_in' | 'maintenance' | 'inspection'>('check_out');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string; client_name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  
  const [transactionData, setTransactionData] = useState<EquipmentTransaction>({
    equipment_id: '',
    action_type: 'check_out',
    user_id: '',
    location: '',
  });

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isOnline } = useOfflineSync();
  const { position, getCurrentPosition } = useGeolocation();

  useEffect(() => {
    getCurrentPosition();
    loadEquipment();
    loadProjects();
  }, []);

  const loadEquipment = async () => {
    try {
      if (!userProfile?.company_id) return;
      setLoadError(null);

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, equipment_type, model, serial_number, status, location, last_maintenance_date, next_maintenance_date')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
      setLoadError((error as { message?: string } | null)?.message || 'Failed to load equipment list');
      toast({
        title: "Loading Error",
        description: "Failed to load equipment list",
        variant: "destructive"
      });
    }
  };

  const loadProjects = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const scanQRCode = () => {
    setShowQRScanner(true);
  };

  const handleQRScanComplete = (result: ScanResult) => {
    setShowQRScanner(false);

    if (result.success && result.equipment) {
      // Find the full equipment record
      const foundEquipment = equipment.find(eq => eq.id === result.equipment!.equipment_id);

      if (foundEquipment) {
        selectEquipment(foundEquipment);

        // Set action type based on scan type
        const newActionType = result.scanType;
        setActionType(newActionType);
        setTransactionData(prev => ({
          ...prev,
          action_type: newActionType,
          equipment_id: foundEquipment.id,
          user_id: user?.id || '',
          location: foundEquipment.location || ''
        }));

        toast({
          title: "Equipment Scanned",
          description: `${foundEquipment.name} ready for ${result.scanType.replace('_', ' ')}`,
        });
      } else {
        toast({
          title: "Equipment Not Found",
          description: "Scanned equipment not found in local database. Please refresh.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Scan Failed",
        description: "Could not process QR code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const selectEquipment = (item: Equipment) => {
    setSelectedEquipment(item);
    setTransactionData(prev => ({
      ...prev,
      equipment_id: item.id,
      user_id: user?.id || '',
      location: item.location || ''
    }));
  };

  const submitTransaction = async () => {
    if (!selectedEquipment || !transactionData.location) {
      toast({
        title: "Missing Information",
        description: "Please select equipment and provide location",
        variant: "destructive"
      });
      return;
    }

    // Equipment moves are a live write. The old offline branch queued the
    // transaction as a 'safety_incident', which would have synced an
    // equipment check-out into safety_incidents. Refuse honestly instead.
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Checking equipment in or out needs a connection. Nothing was saved.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const transaction = {
        ...transactionData,
        project_id: selectedProject || null,
        gps_latitude: position?.coords?.latitude || null,
        gps_longitude: position?.coords?.longitude || null,
        timestamp: new Date().toISOString(),
        company_id: userProfile?.company_id
      };

      let newStatus = selectedEquipment.status;
      switch (actionType) {
        case 'check_out':
          newStatus = 'checked_out';
          break;
        case 'check_in':
          newStatus = transactionData.condition_after === 'poor' ? 'maintenance' : 'available';
          break;
        case 'maintenance':
          newStatus = 'maintenance';
          break;
      }

      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          status: newStatus,
          location: transactionData.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEquipment.id);

      if (updateError) throw updateError;

      toast({
        title: "Transaction Complete",
        description: `Equipment ${actionType.replace('_', ' ')} completed successfully`,
      });

      onTransactionComplete?.(transaction);
      loadEquipment();

      // Reset form
      setSelectedEquipment(null);
      setTransactionData({
        equipment_id: '',
        action_type: 'check_out',
        user_id: '',
        location: '',
      });
    } catch (error) {
      console.error('Error submitting transaction:', error);
      toast({
        title: "Transaction Error",
        description: (error as { message?: string } | null)?.message || "Failed to process equipment transaction",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'checked_out': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out_of_service': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(q) ||
                         (item.model || '').toLowerCase().includes(q) ||
                         (item.serial_number || '').toLowerCase().includes(q);
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (showQRScanner) {
    return (
      <EquipmentQRScanner
        scanType={actionType}
        onScanComplete={handleQRScanComplete}
        onCancel={() => setShowQRScanner(false)}
        projectId={selectedProject || projectId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <Card className="rounded-2xl glass shadow-ios-1 border-blue-200/60 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-800">Equipment Manager</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-blue-700">
            Check in/out equipment and track usage in real-time.
          </p>
        </CardHeader>
      </Card>

      {/* Selected Equipment Transaction */}
      {selectedEquipment && (
        <Card className="rounded-2xl glass shadow-ios-1 border-yellow-200/60 dark:border-yellow-500/30 bg-yellow-50/80 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Equipment Transaction</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEquipment(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background p-3 rounded border">
              <div className="font-medium">{selectedEquipment.name}</div>
              <div className="text-sm text-muted-foreground">
                {[selectedEquipment.model, selectedEquipment.serial_number].filter(Boolean).join(' • ')}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(selectedEquipment.status || '')}>
                  {(selectedEquipment.status || 'unknown').replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={(value) => {
                setActionType(value as EquipmentTransaction['action_type']);
                setTransactionData(prev => ({ ...prev, action_type: value as EquipmentTransaction['action_type'] }));
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedEquipment.status === 'available' && (
                    <SelectItem value="check_out">Check Out</SelectItem>
                  )}
                  {selectedEquipment.status === 'checked_out' && (
                    <SelectItem value="check_in">Check In</SelectItem>
                  )}
                  <SelectItem value="maintenance">Send to Maintenance</SelectItem>
                  <SelectItem value="inspection">Record Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'check_out' && !projectId && (
              <div>
                <Label>Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
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
            )}

            <div>
              <Label>Location *</Label>
              <div className="flex gap-2">
                <Input
                  value={transactionData.location}
                  onChange={(e) => setTransactionData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Current location or destination"
                  className="flex-1"
                />
                {position && (
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <MapPin className="h-3 w-3" />
                    GPS
                  </Badge>
                )}
              </div>
            </div>

            {(actionType === 'check_in' || actionType === 'inspection') && (
              <div>
                <Label>Condition After Use</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Not stored. "Poor" on check-in sends the item to maintenance.
                </p>
                <Select value={transactionData.condition_after} onValueChange={(value) => 
                  setTransactionData(prev => ({ ...prev, condition_after: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor - Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={submitTransaction}
              disabled={isSubmitting || !transactionData.location}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" tone="current" label={null} />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {actionType === 'check_out' ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {actionType.replace('_', ' ').toUpperCase()}
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon" aria-label="Scan equipment QR code"
              onClick={scanQRCode}
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon" aria-label="Refresh equipment list"
              onClick={loadEquipment}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment List */}
      <div className="space-y-2">
        {filteredEquipment.map((item) => (
          <Card 
            key={item.id} 
            className={`cursor-pointer transition-colors ${
              selectedEquipment?.id === item.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => selectEquipment(item)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[item.model, item.serial_number].filter(Boolean).join(' • ')}
                  </div>
                  {item.location && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {item.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(item.status || '')}>
                      {(item.status || 'unknown').replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{item.equipment_type}</div>
                  {item.next_maintenance_date && (
                    <div className="text-xs text-yellow-600 mt-1">
                      <Wrench className="h-3 w-3 inline mr-1" />
                      Maintenance due {format(new Date(item.next_maintenance_date), 'MM/dd')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {loadError && (
          <ErrorState error={loadError} onRetry={loadEquipment} />
        )}

        {!loadError && filteredEquipment.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Equipment Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'No equipment matches the current filters'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm text-center">
          Offline - equipment check-in and check-out need a connection
        </div>
      )}
    </div>
  );
};

export default MobileEquipmentManager;