import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, DollarSign, MapPin, Clock, Save } from 'lucide-react';
import { SmartFormInput } from '@/components/forms/SmartFormInput';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealTimeCostEntryProps {
  projectId: string;
  onCostAdded?: () => void;
}

const costCategories = [
  'labor',
  'material', 
  'equipment',
  'subcontractor',
  'other'
];

export const RealTimeCostEntry: React.FC<RealTimeCostEntryProps> = ({ 
  projectId, 
  onCostAdded 
}) => {
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    category: '',
    cost_code: '',
    amount: '',
    description: '',
    vendor_name: ''
  });

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast.success('Location captured');
        },
        (error) => {
          toast.error('Could not get location');
          console.error('Location error:', error);
        }
      );
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      const fileName = `${Date.now()}-${photo.name}`;
      const filePath = `cost-entries/${projectId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('project-files')
        .upload(filePath, photo);
      
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.company_id || !formData.category || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload photos first
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      // First get or create cost code
      let costCodeId = 'general';
      if (formData.cost_code) {
        const { data: costCode } = await supabase
          .from('cost_codes')
          .select('id')
          .eq('code', formData.cost_code)
          .eq('company_id', userProfile.company_id)
          .single();
        
        if (costCode) costCodeId = costCode.id;
      }

      // Map category to specific cost field
      const costData: any = {
        cost_code_id: costCodeId,
        project_id: projectId,
        description: formData.description || `${formData.category} cost`,
        created_by: userProfile.id
      };

      const amount = parseFloat(formData.amount);
      switch (formData.category) {
        case 'labor':
          costData.labor_cost = amount;
          costData.labor_hours = 8; // Default hours
          break;
        case 'material':
          costData.material_cost = amount;
          break;
        case 'equipment':
          costData.equipment_cost = amount;
          break;
        default:
          costData.other_cost = amount;
      }

      // Create job cost entry
      const { data: costEntry, error: costError } = await supabase
        .from('job_costs')
        .insert(costData)
        .select()
        .single();

      if (costError) throw costError;

      toast.success('Cost entry saved successfully');
      
      // Reset form
      setFormData({
        category: '',
        cost_code: '',
        amount: '',
        description: '',
        vendor_name: ''
      });
      setPhotos([]);
      setLocation(null);
      
      onCostAdded?.();
      
    } catch (error) {
      console.error('Error saving cost entry:', error);
      toast.error('Failed to save cost entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Real-Time Cost Entry
        </CardTitle>
        <CardDescription>
          Record project costs instantly from the field
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <SmartFormInput
              label="Cost Code"
              value={formData.cost_code}
              onChange={(value) => setFormData(prev => ({ ...prev, cost_code: value }))}
              placeholder="e.g., 03300"
              storageKey="cost-code"
            />

            <SmartFormInput
              label="Vendor"
              value={formData.vendor_name}
              onChange={(value) => setFormData(prev => ({ ...prev, vendor_name: value }))}
              placeholder="Vendor name"
              storageKey="vendor-name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the cost..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {location ? 'Location Captured' : 'Get Location'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Add Photos ({photos.length})
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <Badge key={index} variant="secondary">
                  {photo.name}
                </Badge>
              ))}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !formData.category || !formData.amount}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Cost Entry'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};