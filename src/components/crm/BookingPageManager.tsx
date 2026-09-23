import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { ListSkeleton, LoadingRegion } from '@/components/ui/skeletons';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputFormField, SelectFormField, TextareaFormField } from "@/components/forms/FormFields";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BOOKING_PAGE_DEFAULTS,
  bookingPageFormSchema,
  buildBookingPageData,
  slugify,
  type BookingPageFormValues,
} from "@/lib/validations/crm";

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
  // The slug follows the title until the user types in the slug field. It used
  // to fill only while the slug was empty, so it stopped after one character.
  const [slugEdited, setSlugEdited] = useState(false);

  const form = useForm<BookingPageFormValues>({
    resolver: zodResolver(bookingPageFormSchema),
    defaultValues: BOOKING_PAGE_DEFAULTS,
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
    mutationFn: async ({ availability: rules, ...pageData }: ReturnType<typeof buildBookingPageData> & { availability: AvailabilityRule[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: page, error: pageError } = await supabase
        .from("booking_pages")
        // booking_pages has no availability column; the rules go to
        // availability_rules below, keyed by the new page id.
        .insert({
          ...pageData,
          user_id: user.id,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      const availabilityRules = rules.map(rule => ({
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
      form.reset(BOOKING_PAGE_DEFAULTS);
      setSlugEdited(false);
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

  const handleSubmit = (values: BookingPageFormValues) => {
    createPageMutation.mutate({ ...buildBookingPageData(values), availability });
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
    return <LoadingRegion label="Loading booking pages" className="p-4">
      <ListSkeleton />
    </LoadingRegion>;
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
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Create booking page form">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!slugEdited) {
                            form.setValue("slug", slugify(e.target.value), { shouldValidate: form.formState.isSubmitted });
                          }
                        }}
                        placeholder="15 Minute Consultation"
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/book/</span>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clearing the slug hands it back to the title.
                            setSlugEdited(e.target.value !== "");
                          }}
                          placeholder="15-min-consultation"
                          aria-required="true"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TextareaFormField control={form.control} name="description" label="Description" placeholder="Brief description of this meeting type" />

              <div className="grid grid-cols-2 gap-4">
                <InputFormField control={form.control} name="duration_minutes" label="Duration (minutes)" type="number" min={15} step={15} />
                <SelectFormField
                  control={form.control}
                  name="location_type"
                  label="Meeting Type"
                  options={[
                    { value: "video_zoom", label: "Zoom" },
                    { value: "video_google_meet", label: "Google Meet" },
                    { value: "video_teams", label: "Microsoft Teams" },
                    { value: "phone", label: "Phone Call" },
                    { value: "in_person", label: "In Person" },
                  ]}
                />
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
                      size="icon" aria-label="Remove availability rule"
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
            </Form>
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
                  onClick={async () => {
                    if (await confirmAction({ title: 'Delete this booking page?', description: 'Its public link stops working.', destructive: true })) deletePageMutation.mutate(page.id);
                  }}
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