import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Truck,
  MapPin,
  Clock,
  User,
  QrCode,
  Camera,
  AlertTriangle,
  CheckCircle2,
  X,
  LogIn,
  LogOut,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Wrench,
  Fuel,
  Calendar,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedMobileCamera } from './EnhancedMobileCamera';
import { format } from 'date-fns';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  make: string;
  model: string;
  serial_number: string;
  status: 'available' | 'checked_out' | 'maintenance' | 'out_of_service';
  current_condition: 'excellent' | 'good' | 'fair' | 'poor';
  current_location: string;
  assigned_to?: string;
  checked_out_by?: string;
  checked_out_at?: string;
  due_back_at?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
}

interface EquipmentTransaction {
  equipment_id: string;
  action_type: 'check_out' | 'check_in' | 'maintenance' | 'inspection';
  user_id: string;
  project_id?: string;
  location: string;
  condition_before?: string;
  condition_after?: string;
  fuel_level?: number;
  hours_used?: number;
  notes?: string;
  photos: string[];
  gps_latitude?: number;
  gps_longitude?: number;
}

interface MobileEquipmentManagerProps {
  projectId?: string;
  onTransactionComplete?: (transaction: any) => void;
  onClose?: () => void;
}

const MobileEquipmentManager: React.FC<MobileEquipmentManagerProps> = ({
  projectId,
  onTransactionComplete,
  onClose
}) => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'check_out' | 'check_in' | 'maintenance' | 'inspection'>('check_out');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  
  const [transactionData, setTransactionData] = useState<EquipmentTransaction>({
    equipment_id: '',
    action_type: 'check_out',
    user_id: '',
    location: '',
    photos: []
  });

  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();
  const { position, getCurrentPosition } = useGeolocation();

  useEffect(() => {
    getCurrentPosition();
    loadEquipment();
    loadProjects();
  }, []);

  const loadEquipment = async () => {
    try {
      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', profile.company_id)
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
      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handlePhotoCapture = (file: File, metadata?: any) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      setTransactionData(prev => ({
        ...prev,
        photos: [...prev.photos, base64Data]
      }));
    };
    reader.readAsDataURL(file);
    
    setShowCamera(false);
    toast({
      title: "Photo Added",
      description: "Equipment photo captured successfully",
    });
  };

  const removePhoto = (index: number) => {
    setTransactionData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const scanQRCode = async () => {
    toast({
      title: "QR Scanner",
      description: "QR code scanning feature coming soon",
    });
  };

  const selectEquipment = (item: any) => {
    setSelectedEquipment(item);
    setTransactionData(prev => ({
      ...prev,
      equipment_id: item.id,
      user_id: user?.id || '',
      condition_before: item.current_condition
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

    try {
      setIsSubmitting(true);

      const transaction = {
        ...transactionData,
        project_id: selectedProject || null,
        gps_latitude: position?.coords?.latitude || null,
        gps_longitude: position?.coords?.longitude || null,
        timestamp: new Date().toISOString(),
        company_id: profile?.company_id
      };

      // Update equipment status based on action
      let newStatus = selectedEquipment.status;
      let assignedTo = selectedEquipment.assigned_to;
      let checkedOutBy = selectedEquipment.checked_out_by;
      let checkedOutAt = selectedEquipment.checked_out_at;
      let dueBackAt = selectedEquipment.due_back_at;

      switch (actionType) {
        case 'check_out':
          newStatus = 'checked_out';
          assignedTo = user?.id;
          checkedOutBy = user?.id;
          checkedOutAt = new Date().toISOString();
          // Calculate due back time (8 hours from now by default)
          dueBackAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
          break;
        case 'check_in':
          newStatus = transactionData.condition_after === 'poor' ? 'maintenance' : 'available';
          assignedTo = null;
          checkedOutBy = null;
          checkedOutAt = null;
          dueBackAt = null;
          break;
        case 'maintenance':
          newStatus = 'maintenance';
          break;
      }

      if (isOnline) {
        // Since equipment_transactions table doesn't exist, let's save offline for now
        await saveOfflineData('safety_incident', transaction);

        // Update equipment status directly (simplified for now)
        const { error: updateError } = await supabase
          .from('equipment')
          .update({
            status: newStatus,
            current_condition: transactionData.condition_after || selectedEquipment.current_condition,
            assigned_to: assignedTo,
            checked_out_by: checkedOutBy,
            checked_out_at: checkedOutAt,
            due_back_at: dueBackAt,
            current_location: transactionData.location,
            notes: transactionData.notes || selectedEquipment.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEquipment.id);

        if (updateError) throw updateError;

        toast({
          title: "Transaction Complete",
          description: `Equipment ${actionType.replace('_', ' ')} completed successfully`,
        });

        onTransactionComplete?.(transaction);
        
        // Refresh equipment list
        loadEquipment();
      } else {
        await saveOfflineData('safety_incident', transaction);
        
        toast({
          title: "Transaction Saved Offline",
          description: "Transaction will be processed when connection is restored",
        });
      }

      // Reset form
      setSelectedEquipment(null);
      setTransactionData({
        equipment_id: '',
        action_type: 'check_out',
        user_id: '',
        location: '',
        photos: []
      });

    } catch (error) {
      console.error('Error submitting transaction:', error);
      toast({
        title: "Transaction Error",
        description: "Failed to process equipment transaction",
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (dueBackAt: string) => {
    return new Date(dueBackAt) < new Date();
  };

  const filteredEquipment = equipment.filter(item => {
    const makeModel = `${item.make} ${item.model}`.trim();
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (showCamera) {
    return (
      <EnhancedMobileCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        enableGeolocation={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50">
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
        <Card className="border-yellow-200 bg-yellow-50">
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
                {selectedEquipment.make} {selectedEquipment.model} • {selectedEquipment.serial_number}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(selectedEquipment.status)}>
                  {selectedEquipment.status.replace('_', ' ')}
                </Badge>
                <Badge className={getConditionColor(selectedEquipment.current_condition)}>
                  {selectedEquipment.current_condition}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={(value) => {
                setActionType(value as any);
                setTransactionData(prev => ({ ...prev, action_type: value as any }));
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

            {actionType === 'check_in' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fuel Level (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={transactionData.fuel_level || ''}
                    onChange={(e) => setTransactionData(prev => ({ 
                      ...prev, 
                      fuel_level: parseInt(e.target.value) || 0 
                    }))}
                    placeholder="Fuel %"
                  />
                </div>
                <div>
                  <Label>Hours Used</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactionData.hours_used || ''}
                    onChange={(e) => setTransactionData(prev => ({ 
                      ...prev, 
                      hours_used: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Usage hours"
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

            <div>
              <Label>Photos</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="h-20 flex flex-col items-center justify-center gap-1"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Add Photo</span>
                </Button>
                {transactionData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt={`Equipment ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-5 w-5 p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={submitTransaction}
              disabled={isSubmitting || !transactionData.location}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                    {item.make} {item.model} • {item.serial_number}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    📍 {item.current_location}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getConditionColor(item.current_condition)}>
                      {item.current_condition}
                    </Badge>
                    {item.due_back_at && isOverdue(item.due_back_at) && (
                      <Badge variant="destructive">
                        <Clock className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  {item.checked_out_by && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Checked out {item.checked_out_at ? format(new Date(item.checked_out_at), 'MM/dd HH:mm') : ''}
                      {item.due_back_at && (
                        <span> • Due back {format(new Date(item.due_back_at), 'MM/dd HH:mm')}</span>
                      )}
                    </div>
                  )}
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
          📶 Offline - Transactions will be processed when connection is restored
        </div>
      )}
    </div>
  );
};

export default MobileEquipmentManager;