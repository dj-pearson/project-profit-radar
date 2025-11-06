-- Create booking_pages table for Calendly-style meeting scheduling
CREATE TABLE public.booking_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  max_bookings_per_day INTEGER,
  booking_advance_days INTEGER DEFAULT 60,
  booking_notice_hours INTEGER DEFAULT 24,
  location_type TEXT CHECK (location_type IN ('in_person', 'phone', 'video_zoom', 'video_google_meet', 'video_teams', 'custom')),
  location_details JSONB,
  confirmation_message TEXT,
  redirect_url TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  collect_phone BOOLEAN DEFAULT false,
  collect_notes BOOLEAN DEFAULT true,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create availability_rules table
CREATE TABLE public.availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_page_id UUID NOT NULL REFERENCES public.booking_pages(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_page_id UUID NOT NULL REFERENCES public.booking_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  attendee_notes TEXT,
  custom_field_responses JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  cancellation_reason TEXT,
  calendar_event_id TEXT,
  google_meet_link TEXT,
  zoom_meeting_id TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_pages
CREATE POLICY "Users can view their own booking pages"
  ON public.booking_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booking pages"
  ON public.booking_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking pages"
  ON public.booking_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking pages"
  ON public.booking_pages FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view active booking pages"
  ON public.booking_pages FOR SELECT
  USING (is_active = true);

-- RLS Policies for availability_rules
CREATE POLICY "Users can manage availability rules for their booking pages"
  ON public.availability_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_pages
      WHERE booking_pages.id = availability_rules.booking_page_id
      AND booking_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view availability rules for active pages"
  ON public.availability_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_pages
      WHERE booking_pages.id = availability_rules.booking_page_id
      AND booking_pages.is_active = true
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Users can view bookings for their pages"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_pages
      WHERE booking_pages.id = bookings.booking_page_id
      AND booking_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create bookings for active pages"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.booking_pages
      WHERE booking_pages.id = booking_page_id
      AND booking_pages.is_active = true
    )
  );

CREATE POLICY "Users can update bookings for their pages"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_pages
      WHERE booking_pages.id = bookings.booking_page_id
      AND booking_pages.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_booking_pages_user_id ON public.booking_pages(user_id);
CREATE INDEX idx_booking_pages_slug ON public.booking_pages(slug);
CREATE INDEX idx_availability_rules_booking_page ON public.availability_rules(booking_page_id);
CREATE INDEX idx_bookings_booking_page ON public.bookings(booking_page_id);
CREATE INDEX idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX idx_bookings_lead_id ON public.bookings(lead_id);
CREATE INDEX idx_bookings_contact_id ON public.bookings(contact_id);

-- Trigger for updated_at
CREATE TRIGGER update_booking_pages_updated_at
  BEFORE UPDATE ON public.booking_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();