import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { timeEntrySchema, type TimeEntryInput } from '@/lib/validations';

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
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<TimeEntryInput>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      project_id: '',
      task_description: '',
      start_time: '',
      end_time: '',
      notes: '',
    }
  });
  
  const formValues = watch();

  useEffect(() => {
    fetchProjects();
    
    // Set default times (current time - 1 hour to current time)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    setValue('start_time', oneHourAgo.toISOString());
    setValue('end_time', now.toISOString());
  }, [setValue]);

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

  const onSubmit = async (data: TimeEntryInput) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user?.id,
          project_id: data.project_id || null,
          description: data.task_description,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes || null,
          gps_latitude: data.location_latitude,
          gps_longitude: data.location_longitude,
          location_accuracy: data.location_accuracy,
          location: data.location_address || null,
        });

      if (error) throw error;

      toast({
        title: "Time Entry Created",
        description: "Your time entry has been saved successfully",
      });

      // Reset form
      reset();
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
              const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              setValue('location_address', address);
              setValue('location_latitude', latitude);
              setValue('location_longitude', longitude);
              setValue('location_accuracy', position.coords.accuracy);
            } else {
              const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              setValue('location_address', coords);
              setValue('location_latitude', latitude);
              setValue('location_longitude', longitude);
              setValue('location_accuracy', position.coords.accuracy);
            }
          } catch {
            const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setValue('location_address', coords);
            setValue('location_latitude', latitude);
            setValue('location_longitude', longitude);
            setValue('location_accuracy', position.coords.accuracy);
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
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the validation errors below
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                value={formValues.project_id}
                onValueChange={(value) => setValue('project_id', value)}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_description">Task Description *</Label>
            <Input
              id="task_description"
              placeholder="What did you work on?"
              {...register('task_description')}
            />
            {errors.task_description && (
              <p className="text-sm text-destructive">{errors.task_description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                {...register('start_time')}
              />
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                {...register('end_time')}
              />
              {errors.end_time && (
                <p className="text-sm text-destructive">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="location_address"
                placeholder="Job site address or location"
                {...register('location_address')}
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
            {errors.location_address && (
              <p className="text-sm text-destructive">{errors.location_address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about the work performed..."
              {...register('notes')}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
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