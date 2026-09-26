import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, QrCode, X, LogIn, LogOut, Search, RefreshCw, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useEquipmentQRScanning } from '@/hooks/useEquipmentQRScanning';
import { supabase } from '@/integrations/supabase/client';
import EquipmentQRScanner, { type ScanResult } from '@/components/equipment/EquipmentQRScanner';
import { format } from 'date-fns';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/** The equipment columns this screen reads. */
interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  location: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
}

type ActionType = 'check_out' | 'check_in' | 'maintenance' | 'inspection';
type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor';

interface TransactionForm {
  location: string;
  condition_after?: ConditionRating;
  fuel_level?: number;
  hours_reading?: number;
  notes?: string;
}

const EMPTY_FORM: TransactionForm = { location: '' };

// process_equipment_qr_scan sets 'in_use' on check-out. 'checked_out' is what
// this screen used to write directly; rows may still carry it.
const isCheckedOut = (status: string | null) => status === 'in_use' || status === 'checked_out';

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
  const [actionType, setActionType] = useState<ActionType>('check_out');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; client_name: string | null }[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  // The raw label string when the equipment was picked by scanning it.
  const [scannedQRValue, setScannedQRValue] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionForm>(EMPTY_FORM);

  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { isOnline } = useOfflineSync();
  const { position, getCurrentPosition } = useGeolocation();
  const { processScanAsync, getEquipmentById } = useEquipmentQRScanning();

  useEffect(() => {
    getCurrentPosition();
    loadEquipment();
    loadProjects();
  }, []);

  const loadEquipment = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, equipment_type, model, serial_number, status, location, last_maintenance_date, next_maintenance_date')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
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
      const foundEquipment = equipment.find(eq => eq.id === result.equipment!.equipment_id);

      if (foundEquipment) {
        setSelectedEquipment(foundEquipment);
        setScannedQRValue(result.qrCodeValue);
        setActionType(result.scanType as ActionType);

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
    setScannedQRValue(null);
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

    // The old offline path queued these under 'safety_incident', so nothing
    // ever reached equipment. Until there's a real queue for scans, refuse.
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Equipment check-out and check-in need a connection. Try again once you're back online.",
        variant: "destructive"
      });
      return;
    }

    // Check-out and check-in go through process_equipment_qr_scan, which
    // finds the equipment by its active label.
    const qrCodeValue = scannedQRValue ?? getEquipmentById(selectedEquipment.id)?.qr_code_value;
    if (!qrCodeValue) {
      toast({
        title: "No QR code",
        description: `${selectedEquipment.name} has no QR label yet. Generate one on the QR labels page first.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const dueBackAt = actionType === 'check_out'
        // Due back in 8 hours by default, as before.
        ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        : undefined;

      // The hook toasts success and failure.
      const result = await processScanAsync({
        qrCodeValue,
        scanType: actionType,
        projectId: selectedProject || undefined,
        latitude: position?.coords?.latitude,
        longitude: position?.coords?.longitude,
        accuracy: position?.coords?.accuracy,
        locationDescription: transactionData.location,
        conditionRating: transactionData.condition_after,
        fuelLevel: actionType === 'check_in' ? transactionData.fuel_level : undefined,
        hoursReading: actionType === 'check_in' ? transactionData.hours_reading : undefined,
        notes: transactionData.notes,
        dueBackAt,
      });

      if (!result.success) return;

      // The RPC only moves status for check-out/in. Keep this screen's old
      // rule that maintenance, or a check-in in poor condition, parks the
      // equipment in maintenance.
      const needsMaintenance =
        actionType === 'maintenance' ||
        (actionType === 'check_in' && transactionData.condition_after === 'poor');

      if (needsMaintenance && userProfile?.company_id) {
        const { error: statusError } = await supabase
          .from('equipment')
          .update({ status: 'maintenance', updated_at: new Date().toISOString() })
          .eq('id', selectedEquipment.id)
          .eq('company_id', userProfile.company_id);

        if (statusError) {
          console.error('Scan logged but status not set to maintenance:', statusError.message);
        }
      }

      onTransactionComplete?.({ ...result, action_type: actionType, project_id: selectedProject || null });

      loadEquipment();

      setSelectedEquipment(null);
      setScannedQRValue(null);
      setTransactionData(EMPTY_FORM);
    } catch (error) {
      // The hook has already shown the error toast.
      console.error('Error submitting transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_use':
      case 'checked_out': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out_of_service': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (isCheckedOut(status)) return 'checked out';
    return (status || 'unknown').replace('_', ' ');
  };

  const filteredEquipment = equipment.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(query) ||
                         (item.model || '').toLowerCase().includes(query) ||
                         (item.serial_number || '').toLowerCase().includes(query);

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'in_use' ? isCheckedOut(item.status) : item.status === filterStatus);

    return matchesSearch && matchesFilter;
  });

  if (showQRScanner) {
    return (
      <EquipmentQRScanner
        scanType={actionType}
        onScanComplete={handleQRScanComplete}
        onCancel={() => setShowQRScanner(false)}
        projectId={selectedProject || projectId}
        recordScan={false}
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
                <Badge className={getStatusColor(selectedEquipment.status)}>
                  {getStatusLabel(selectedEquipment.status)}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={(value) => setActionType(value as ActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedEquipment.status === 'available' && (
                    <SelectItem value="check_out">Check Out</SelectItem>
                  )}
                  {isCheckedOut(selectedEquipment.status) && (
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
                <Select value={transactionData.condition_after} onValueChange={(value) =>
                  setTransactionData(prev => ({ ...prev, condition_after: value as ConditionRating }))
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

            {actionType === 'check_in' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel Level (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={transactionData.fuel_level ?? ''}
                    onChange={(e) => setTransactionData(prev => ({
                      ...prev,
                      fuel_level: e.target.value === '' ? undefined : parseInt(e.target.value)
                    }))}
                    placeholder="Fuel %"
                  />
                </div>
                <div>
                  <Label>Hour Meter</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactionData.hours_reading ?? ''}
                    onChange={(e) => setTransactionData(prev => ({
                      ...prev,
                      hours_reading: e.target.value === '' ? undefined : parseFloat(e.target.value)
                    }))}
                    placeholder="Meter reading"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={transactionData.notes || ''}
                onChange={(e) => setTransactionData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or observations..."
                rows={3}
              />
            </div>

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
              size="icon"
              onClick={scanQRCode}
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
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
                <SelectItem value="in_use">Checked Out</SelectItem>
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
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusLabel(item.status)}
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

        {filteredEquipment.length === 0 && (
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
          Offline. Check-out and check-in need a connection.
        </div>
      )}
    </div>
  );
};

export default MobileEquipmentManager;
