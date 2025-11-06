import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Copy, ExternalLink, Plus, Settings, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BookingPage {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  location_type: string | null;
  created_at: string;
}

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BookingPageManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    duration_minutes: 30,
    location_type: "video_zoom",
    is_active: true,
  });

  const [availability, setAvailability] = useState<AvailabilityRule[]>([
    { day_of_week: 1, start_time: "09:00", end_time: "17:00" },
    { day_of_week: 2, start_time: "09:00", end_time: "17:00" },
    { day_of_week: 3, start_time: "09:00", end_time: "17:00" },
    { day_of_week: 4, start_time: "09:00", end_time: "17:00" },
    { day_of_week: 5, start_time: "09:00", end_time: "17:00" },
  ]);

  const { data: bookingPages, isLoading } = useQuery({
    queryKey: ["booking-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BookingPage[];
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: typeof formData & { availability: AvailabilityRule[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: page, error: pageError } = await supabase
        .from("booking_pages")
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      const availabilityRules = data.availability.map(rule => ({
        booking_page_id: page.id,
        ...rule,
      }));

      const { error: rulesError } = await supabase
        .from("availability_rules")
        .insert(availabilityRules);

      if (rulesError) throw rulesError;

      return page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-pages"] });
      setIsCreating(false);
      setFormData({
        title: "",
        slug: "",
        description: "",
        duration_minutes: 30,
        location_type: "video_zoom",
        is_active: true,
      });
      toast({ title: "Booking page created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating booking page", description: error.message, variant: "destructive" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("booking_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-pages"] });
      toast({ title: "Booking page deleted" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ pageId, isActive }: { pageId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("booking_pages")
        .update({ is_active: isActive })
        .eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-pages"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPageMutation.mutate({ ...formData, availability });
  };

  const copyBookingLink = (slug: string) => {
    const link = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  };

  const addAvailabilityRule = () => {
    setAvailability([...availability, { day_of_week: 1, start_time: "09:00", end_time: "17:00" }]);
  };

  const removeAvailabilityRule = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="p-4">Loading booking pages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meeting Scheduler</h2>
          <p className="text-muted-foreground">Create booking pages for clients to schedule meetings</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Booking Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Booking Page</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!formData.slug) {
                      setFormData(prev => ({
                        ...prev,
                        title: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                      }));
                    }
                  }}
                  placeholder="15 Minute Consultation"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/book/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="15-min-consultation"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this meeting type"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min={15}
                    step={15}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Meeting Type</Label>
                  <Select
                    value={formData.location_type}
                    onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video_zoom">Zoom</SelectItem>
                      <SelectItem value="video_google_meet">Google Meet</SelectItem>
                      <SelectItem value="video_teams">Microsoft Teams</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Availability</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addAvailabilityRule}>
                    <Plus className="mr-2 h-3 w-3" />
                    Add Time Slot
                  </Button>
                </div>
                {availability.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={rule.day_of_week.toString()}
                      onValueChange={(value) => {
                        const newAvailability = [...availability];
                        newAvailability[index].day_of_week = parseInt(value);
                        setAvailability(newAvailability);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) => {
                        const newAvailability = [...availability];
                        newAvailability[index].start_time = e.target.value;
                        setAvailability(newAvailability);
                      }}
                      className="w-28"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) => {
                        const newAvailability = [...availability];
                        newAvailability[index].end_time = e.target.value;
                        setAvailability(newAvailability);
                      }}
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAvailabilityRule(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={createPageMutation.isPending}>
                {createPageMutation.isPending ? "Creating..." : "Create Booking Page"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bookingPages?.map((page) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {page.duration_minutes} min
                  </CardDescription>
                </div>
                <Switch
                  checked={page.is_active}
                  onCheckedChange={(checked) => toggleActiveMutation.mutate({ pageId: page.id, isActive: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {page.description && (
                <p className="text-sm text-muted-foreground">{page.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyBookingLink(page.slug)}
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={`/book/${page.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deletePageMutation.mutate(page.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}