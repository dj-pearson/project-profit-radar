import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
}

interface QuickTimeEntryProps {
  onEntryCreated?: () => void;
}

export const QuickTimeEntry = ({ onEntryCreated }: QuickTimeEntryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    task_description: '',
    start_time: '',
    end_time: '',
    hourly_rate: '75.00',
    notes: '',
    location_address: ''
  });

  useEffect(() => {
    fetchProjects();
    
    // Set default times (current time - 1 hour to current time)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    setFormData(prev => ({
      ...prev,
      start_time: oneHourAgo.toISOString().slice(0, 16),
      end_time: now.toISOString().slice(0, 16)
    }));
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('created_by', user?.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.task_description || !formData.start_time || !formData.end_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user?.id,
          project_id: formData.project_id || null,
          description: formData.task_description,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location_address || null
        });

      if (error) throw error;

      toast({
        title: "Time Entry Created",
        description: "Your time entry has been saved successfully",
      });

      // Reset form
      setFormData({
        project_id: '',
        task_description: '',
        start_time: '',
        end_time: '',
        hourly_rate: '75.00',
        notes: '',
        location_address: ''
      });

      onEntryCreated?.();
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast({
        title: "Error",
        description: "Failed to create time entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Try to reverse geocode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
              {
                headers: {
                  'User-Agent': 'BuildDesk Construction Management App'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              setFormData(prev => ({
                ...prev,
                location_address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                location_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              }));
            }
          } catch {
            setFormData(prev => ({
              ...prev,
              location_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
          
          toast({
            title: "Location Added",
            description: "Current location has been added to the entry",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get current location",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Quick Time Entry
        </CardTitle>
        <CardDescription>
          Add a completed work session manually
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
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

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_description">Task Description *</Label>
            <Input
              id="task_description"
              placeholder="What did you work on?"
              value={formData.task_description}
              onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="location_address"
                placeholder="Job site address or location"
                value={formData.location_address}
                onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                className="flex items-center gap-1"
              >
                <MapPin className="h-4 w-4" />
                GPS
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about the work performed..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Time Entry'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};