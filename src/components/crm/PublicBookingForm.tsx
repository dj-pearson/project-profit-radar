import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Video, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { addDays, format, startOfDay, addMinutes, isBefore, isAfter, setHours, setMinutes } from "date-fns";

interface PublicBookingFormProps {
  slug: string;
}

interface BookingPage {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  location_type: string | null;
  collect_phone: boolean;
  collect_notes: boolean;
}

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface TimeSlot {
  time: Date;
  formatted: string;
}

export function PublicBookingForm({ slug }: PublicBookingFormProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: bookingPage, isLoading } = useQuery({
    queryKey: ["public-booking-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as BookingPage;
    },
  });

  const { data: availabilityRules } = useQuery({
    queryKey: ["availability-rules", bookingPage?.id],
    queryFn: async () => {
      if (!bookingPage?.id) return [];
      const { data, error } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("booking_page_id", bookingPage.id);

      if (error) throw error;
      return data as AvailabilityRule[];
    },
    enabled: !!bookingPage?.id,
  });

  const { data: existingBookings } = useQuery({
    queryKey: ["existing-bookings", bookingPage?.id, selectedDate],
    queryFn: async () => {
      if (!bookingPage?.id || !selectedDate) return [];
      
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const { data, error } = await supabase
        .from("bookings")
        .select("scheduled_at, end_at")
        .eq("booking_page_id", bookingPage.id)
        .gte("scheduled_at", startOfSelectedDay.toISOString())
        .lt("scheduled_at", endOfSelectedDay.toISOString())
        .in("status", ["pending", "confirmed"]);

      if (error) throw error;
      return data;
    },
    enabled: !!bookingPage?.id && !!selectedDate,
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!bookingPage || !selectedTime) throw new Error("Missing required data");

      const endTime = addMinutes(selectedTime, bookingPage.duration_minutes);

      const { data, error } = await supabase.from("bookings").insert({
        booking_page_id: bookingPage.id,
        attendee_name: formData.name,
        attendee_email: formData.email,
        attendee_phone: formData.phone || null,
        attendee_notes: formData.notes || null,
        scheduled_at: selectedTime.toISOString(),
        end_at: endTime.toISOString(),
        status: "confirmed",
      }).select().single();

      if (error) throw error;
      
      // Send confirmation email
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: { bookingId: data.id }
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
      
      return data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ title: "Booking confirmed!", description: "You'll receive a confirmation email shortly." });
    },
    onError: (error: Error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const getAvailableTimeSlots = (): TimeSlot[] => {
    if (!selectedDate || !availabilityRules || !bookingPage) return [];

    const dayOfWeek = selectedDate.getDay();
    const rules = availabilityRules.filter(rule => rule.day_of_week === dayOfWeek);

    if (rules.length === 0) return [];

    const slots: TimeSlot[] = [];
    const now = new Date();

    rules.forEach(rule => {
      const [startHour, startMinute] = rule.start_time.split(":").map(Number);
      const [endHour, endMinute] = rule.end_time.split(":").map(Number);

      let currentSlot = setMinutes(setHours(selectedDate, startHour), startMinute);
      const endTime = setMinutes(setHours(selectedDate, endHour), endMinute);

      while (isBefore(currentSlot, endTime)) {
        const slotEnd = addMinutes(currentSlot, bookingPage.duration_minutes);
        
        if (!isAfter(slotEnd, endTime) && isAfter(currentSlot, now)) {
          const isBooked = existingBookings?.some(booking => {
            const bookingStart = new Date(booking.scheduled_at);
            const bookingEnd = new Date(booking.end_at);
            return (
              (isAfter(currentSlot, bookingStart) && isBefore(currentSlot, bookingEnd)) ||
              (isAfter(slotEnd, bookingStart) && isBefore(slotEnd, bookingEnd)) ||
              (isBefore(currentSlot, bookingStart) && isAfter(slotEnd, bookingEnd))
            );
          });

          if (!isBooked) {
            slots.push({
              time: currentSlot,
              formatted: format(currentSlot, "h:mm a"),
            });
          }
        }

        currentSlot = addMinutes(currentSlot, 30);
      }
    });

    return slots;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate();
  };

  const getLocationIcon = () => {
    switch (bookingPage?.location_type) {
      case "video_zoom":
      case "video_google_meet":
      case "video_teams":
        return <Video className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "in_person":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!bookingPage) {
    return <div className="flex items-center justify-center min-h-screen">Booking page not found</div>;
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
              <p className="text-muted-foreground mt-2">
                Your meeting is scheduled for {selectedTime && format(selectedTime, "MMMM d, yyyy 'at' h:mm a")}
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                A confirmation email has been sent to {formData.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableSlots = getAvailableTimeSlots();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{bookingPage.title}</CardTitle>
          {bookingPage.description && (
            <CardDescription>{bookingPage.description}</CardDescription>
          )}
          <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {bookingPage.duration_minutes} minutes
            </div>
            <div className="flex items-center gap-1">
              {getLocationIcon()}
              {bookingPage.location_type?.replace("video_", "").replace("_", " ")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!selectedDate ? (
              <div className="space-y-4">
                <Label>Select a Date</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(14)].map((_, i) => {
                    const date = addDays(new Date(), i + 1);
                    return (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedDate(date)}
                        className="h-auto py-3"
                      >
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                          <div className="text-lg font-bold">{format(date, "d")}</div>
                          <div className="text-xs">{format(date, "MMM")}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : !selectedTime ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select a Time on {format(selectedDate, "MMMM d, yyyy")}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    Change Date
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {availableSlots.length === 0 ? (
                    <p className="col-span-3 text-center text-muted-foreground py-8">
                      No available times on this date
                    </p>
                  ) : (
                    availableSlots.map((slot, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedTime(slot.time)}
                      >
                        {slot.formatted}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{format(selectedTime, "EEEE, MMMM d, yyyy")}</div>
                      <div className="text-sm text-muted-foreground">{format(selectedTime, "h:mm a")}</div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTime(null)}>
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  {bookingPage.collect_phone && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  )}

                  {bookingPage.collect_notes && (
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Anything we should know?"
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}