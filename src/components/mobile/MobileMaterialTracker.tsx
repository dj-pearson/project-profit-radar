import React, { useState, useEffect } from 'react';
import { Camera, Package, MapPin, CheckCircle, AlertCircle, Plus, Search, Filter, Calendar, User, FileText, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedMobileCamera from './EnhancedMobileCamera';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mobileCardClasses, mobileButtonClasses, mobileTextClasses } from '@/utils/mobileHelpers';

interface MaterialDelivery {
  id: string;
  project_id: string;
  supplier_name: string;
  material_type: string;
  quantity_ordered: number;
  quantity_delivered: number;
  unit_of_measure: string;
  delivery_date: string;
  expected_delivery_date: string;
  po_number?: string;
  status: 'pending' | 'partial' | 'complete' | 'rejected';
  delivery_notes?: string;
  quality_rating: number;
  photos: string[];
  gps_location?: any;
  received_by?: string;
  delivery_person?: string;
  vehicle_info?: string;
  created_at: string;
}

interface MaterialIssue {
  id: string;
  delivery_id: string;
  issue_type: 'damage' | 'shortage' | 'quality' | 'wrong_item' | 'other';
  description: string;
  photos: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported_by: string;
  created_at: string;
}

export const MobileMaterialTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState('deliveries');
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<MaterialDelivery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCamera, setShowCamera] = useState(false);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<MaterialDelivery | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { position, getCurrentPosition } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000
  });

  const { deviceInfo, isNative } = useDeviceInfo();

  // New delivery form state
  const [newDelivery, setNewDelivery] = useState({
    supplier_name: '',
    material_type: '',
    quantity_ordered: '',
    quantity_delivered: '',
    unit_of_measure: '',
    expected_delivery_date: '',
    po_number: '',
    delivery_notes: '',
    delivery_person: '',
    vehicle_info: '',
    quality_rating: 5
  });

  // Issue form state
  const [newIssue, setNewIssue] = useState({
    issue_type: 'damage' as const,
    description: '',
    severity: 'medium' as const
  });

  useEffect(() => {
    loadDeliveries();
    loadIssues();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, searchQuery, statusFilter]);

  const loadDeliveries = async () => {
    try {
      // Mock data for now - replace with actual Supabase query
      const mockDeliveries: MaterialDelivery[] = [
        {
          id: '1',
          project_id: 'proj1',
          supplier_name: 'ABC Supply Co',
          material_type: 'Concrete Blocks',
          quantity_ordered: 100,
          quantity_delivered: 95,
          unit_of_measure: 'blocks',
          delivery_date: new Date().toISOString(),
          expected_delivery_date: new Date().toISOString(),
          po_number: 'PO-2024-001',
          status: 'partial',
          delivery_notes: 'Some blocks damaged during transport',
          quality_rating: 4,
          photos: [],
          received_by: 'John Doe',
          delivery_person: 'Mike Smith',
          vehicle_info: 'Truck #123',
          created_at: new Date().toISOString()
        }
      ];
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast.error('Failed to load deliveries');
    }
  };

  const loadIssues = async () => {
    try {
      // Mock data for now
      setIssues([]);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const filterDeliveries = () => {
    let filtered = deliveries;

    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.material_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDeliveries(filtered);
  };

  const handlePhotoCapture = (file: File) => {
    setCapturedPhotos(prev => [...prev, file]);
    setShowCamera(false);
    toast.success('Photo captured successfully');
  };

  const handleSubmitDelivery = async () => {
    if (!newDelivery.supplier_name || !newDelivery.material_type) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      await getCurrentPosition();
      
      const deliveryData = {
        ...newDelivery,
        quantity_ordered: parseFloat(newDelivery.quantity_ordered),
        quantity_delivered: parseFloat(newDelivery.quantity_delivered),
        delivery_date: new Date().toISOString(),
        status: 'complete' as const,
        photos: capturedPhotos.map(photo => URL.createObjectURL(photo)),
        gps_location: position,
        received_by: 'Current User', // Replace with actual user
        created_at: new Date().toISOString()
      };

      // Here you would upload photos and save to Supabase
      // For now, just add to local state
      const newDeliveryRecord: MaterialDelivery = {
        id: Date.now().toString(),
        project_id: 'current-project', // Replace with actual project
        ...deliveryData
      };

      setDeliveries(prev => [newDeliveryRecord, ...prev]);
      resetNewDeliveryForm();
      setShowNewDelivery(false);
      toast.success('Delivery confirmed successfully');
    } catch (error) {
      console.error('Error submitting delivery:', error);
      toast.error('Failed to submit delivery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitIssue = async () => {
    if (!selectedDelivery || !newIssue.description) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      const issueData: MaterialIssue = {
        id: Date.now().toString(),
        delivery_id: selectedDelivery.id,
        ...newIssue,
        photos: capturedPhotos.map(photo => URL.createObjectURL(photo)),
        reported_by: 'Current User', // Replace with actual user
        created_at: new Date().toISOString()
      };

      setIssues(prev => [issueData, ...prev]);
      resetIssueForm();
      setShowIssueForm(false);
      toast.success('Issue reported successfully');
    } catch (error) {
      console.error('Error submitting issue:', error);
      toast.error('Failed to report issue');
    } finally {
      setIsLoading(false);
    }
  };

  const resetNewDeliveryForm = () => {
    setNewDelivery({
      supplier_name: '',
      material_type: '',
      quantity_ordered: '',
      quantity_delivered: '',
      unit_of_measure: '',
      expected_delivery_date: '',
      po_number: '',
      delivery_notes: '',
      delivery_person: '',
      vehicle_info: '',
      quality_rating: 5
    });
    setCapturedPhotos([]);
  };

  const resetIssueForm = () => {
    setNewIssue({
      issue_type: 'damage',
      description: '',
      severity: 'medium'
    });
    setCapturedPhotos([]);
    setSelectedDelivery(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-success/20 text-success border-success/30';
      case 'partial': return 'bg-warning/20 text-warning border-warning/30';
      case 'pending': return 'bg-muted/20 text-muted-foreground border-muted/30';
      case 'rejected': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      case 'low': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  if (showCamera) {
    return (
      <EnhancedMobileCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        maxPhotos={10}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className={mobileTextClasses.title}>Material Tracker</h1>
          </div>
          <Button
            onClick={() => setShowNewDelivery(true)}
            className={mobileButtonClasses.primary}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Log Delivery
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials, suppliers, PO numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="deliveries" className="mt-4">
            <div className="space-y-4">
              {filteredDeliveries.length === 0 ? (
                <Card className={mobileCardClasses.container}>
                  <CardContent className="pt-6 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className={mobileTextClasses.body}>No deliveries found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <Card key={delivery.id} className={mobileCardClasses.container}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className={mobileTextClasses.cardTitle}>
                            {delivery.material_type}
                          </CardTitle>
                          <p className={mobileTextClasses.muted}>
                            {delivery.supplier_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className={mobileTextClasses.muted}>Ordered</p>
                          <p className="font-medium">{delivery.quantity_ordered} {delivery.unit_of_measure}</p>
                        </div>
                        <div>
                          <p className={mobileTextClasses.muted}>Delivered</p>
                          <p className="font-medium">{delivery.quantity_delivered} {delivery.unit_of_measure}</p>
                        </div>
                        {delivery.po_number && (
                          <div>
                            <p className={mobileTextClasses.muted}>PO Number</p>
                            <p className="font-medium">{delivery.po_number}</p>
                          </div>
                        )}
                        <div>
                          <p className={mobileTextClasses.muted}>Quality</p>
                          <p className="font-medium">{delivery.quality_rating}/5 ⭐</p>
                        </div>
                      </div>
                      
                      {delivery.delivery_notes && (
                        <div>
                          <p className={mobileTextClasses.muted}>Notes</p>
                          <p className="text-sm">{delivery.delivery_notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setShowIssueForm(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Report Issue
                        </Button>
                        <Button
                          onClick={() => setShowCamera(true)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Photo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <div className="space-y-4">
              {issues.length === 0 ? (
                <Card className={mobileCardClasses.container}>
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className={mobileTextClasses.body}>No issues reported</p>
                  </CardContent>
                </Card>
              ) : (
                issues.map((issue) => (
                  <Card key={issue.id} className={mobileCardClasses.container}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className={mobileTextClasses.cardTitle}>
                          {issue.issue_type.charAt(0).toUpperCase() + issue.issue_type.slice(1)} Issue
                        </CardTitle>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2">{issue.description}</p>
                      <p className={mobileTextClasses.muted}>
                        Reported by {issue.reported_by}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Delivery Modal */}
      {showNewDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background w-full max-h-[90vh] overflow-y-auto rounded-t-lg">
            <div className="sticky top-0 bg-background border-b p-4">
              <div className="flex items-center justify-between">
                <h2 className={mobileTextClasses.header}>Log Delivery</h2>
                <Button
                  onClick={() => setShowNewDelivery(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium">Supplier Name *</label>
                  <Input
                    value={newDelivery.supplier_name}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Material Type *</label>
                  <Input
                    value={newDelivery.material_type}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, material_type: e.target.value }))}
                    placeholder="Enter material type"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Qty Ordered</label>
                    <Input
                      type="number"
                      value={newDelivery.quantity_ordered}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, quantity_ordered: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Qty Delivered</label>
                    <Input
                      type="number"
                      value={newDelivery.quantity_delivered}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, quantity_delivered: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Unit of Measure</label>
                  <Select value={newDelivery.unit_of_measure} onValueChange={(value) => setNewDelivery(prev => ({ ...prev, unit_of_measure: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                      <SelectItem value="yards">Cubic Yards</SelectItem>
                      <SelectItem value="feet">Linear Feet</SelectItem>
                      <SelectItem value="sheets">Sheets</SelectItem>
                      <SelectItem value="gallons">Gallons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">PO Number</label>
                  <Input
                    value={newDelivery.po_number}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, po_number: e.target.value }))}
                    placeholder="Enter PO number"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Delivery Person</label>
                  <Input
                    value={newDelivery.delivery_person}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, delivery_person: e.target.value }))}
                    placeholder="Enter delivery person name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Vehicle Info</label>
                  <Input
                    value={newDelivery.vehicle_info}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, vehicle_info: e.target.value }))}
                    placeholder="Truck #, license plate, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Quality Rating</label>
                  <Select value={newDelivery.quality_rating.toString()} onValueChange={(value) => setNewDelivery(prev => ({ ...prev, quality_rating: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                      <SelectItem value="4">4 - Good</SelectItem>
                      <SelectItem value="3">3 - Average</SelectItem>
                      <SelectItem value="2">2 - Poor</SelectItem>
                      <SelectItem value="1">1 - Unacceptable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Delivery Notes</label>
                  <Textarea
                    value={newDelivery.delivery_notes}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, delivery_notes: e.target.value }))}
                    placeholder="Add any notes about the delivery..."
                    rows={3}
                  />
                </div>

                {capturedPhotos.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Photos ({capturedPhotos.length})</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {capturedPhotos.map((photo, index) => (
                        <img
                          key={index}
                          src={URL.createObjectURL(photo)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setShowCamera(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowNewDelivery(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDelivery}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Confirm Delivery'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Modal */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background w-full max-h-[90vh] overflow-y-auto rounded-t-lg">
            <div className="sticky top-0 bg-background border-b p-4">
              <div className="flex items-center justify-between">
                <h2 className={mobileTextClasses.header}>Report Issue</h2>
                <Button
                  onClick={() => setShowIssueForm(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Issue Type *</label>
                <Select value={newIssue.issue_type} onValueChange={(value: any) => setNewIssue(prev => ({ ...prev, issue_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="shortage">Shortage</SelectItem>
                    <SelectItem value="quality">Quality Issue</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Severity *</label>
                <Select value={newIssue.severity} onValueChange={(value: any) => setNewIssue(prev => ({ ...prev, severity: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={newIssue.description}
                  onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                />
              </div>

              {capturedPhotos.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Photos ({capturedPhotos.length})</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {capturedPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowCamera(true)}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Photos
              </Button>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowIssueForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitIssue}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Reporting...' : 'Report Issue'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};