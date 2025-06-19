
-- Add booking_source column to appointments table to track how appointments were created
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS booking_source text DEFAULT 'staff' CHECK (booking_source IN ('staff', 'customer', 'system'));

-- Add booking_token column for unique public booking links
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS booking_token text UNIQUE;

-- Create index for booking token lookups
CREATE INDEX IF NOT EXISTS idx_appointments_booking_token ON public.appointments(booking_token);

-- Create function to generate unique booking tokens
CREATE OR REPLACE FUNCTION generate_booking_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64url');
END;
$$;

-- Create public appointment booking slots table for time management
CREATE TABLE IF NOT EXISTS public.appointment_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  time_slot time NOT NULL,
  is_available boolean DEFAULT true,
  max_appointments integer DEFAULT 1,
  current_bookings integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(date, time_slot)
);

-- Enable RLS on appointment_slots
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- Create policy for appointment_slots - allow read access to everyone
CREATE POLICY "Anyone can view appointment slots" ON public.appointment_slots
  FOR SELECT USING (true);

-- Create policy for appointment_slots - only authenticated users can modify
CREATE POLICY "Authenticated users can manage appointment slots" ON public.appointment_slots
  FOR ALL USING (auth.role() = 'authenticated');

-- Create function to get available appointment slots
CREATE OR REPLACE FUNCTION get_available_appointment_slots(
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT CURRENT_DATE + interval '30 days'
)
RETURNS TABLE(
  slot_date date,
  slot_time time,
  available_spots integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.date as slot_date,
    s.time_slot as slot_time,
    (s.max_appointments - s.current_bookings) as available_spots
  FROM public.appointment_slots s
  WHERE s.date BETWEEN start_date AND end_date
    AND s.is_available = true
    AND s.current_bookings < s.max_appointments
  ORDER BY s.date, s.time_slot;
END;
$$;

-- Create function to book appointment slot
CREATE OR REPLACE FUNCTION book_appointment_slot(
  p_date date,
  p_time time
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  slot_exists boolean := false;
BEGIN
  -- Check if slot exists and has availability
  SELECT EXISTS(
    SELECT 1 FROM public.appointment_slots 
    WHERE date = p_date 
      AND time_slot = p_time 
      AND is_available = true 
      AND current_bookings < max_appointments
  ) INTO slot_exists;
  
  IF slot_exists THEN
    -- Increment booking count
    UPDATE public.appointment_slots 
    SET current_bookings = current_bookings + 1,
        updated_at = now()
    WHERE date = p_date AND time_slot = p_time;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Insert default appointment slots for the next 30 days (9 AM to 5 PM, hourly)
-- Using a simpler approach with cross join
INSERT INTO public.appointment_slots (date, time_slot)
SELECT 
  d.slot_date,
  t.slot_time
FROM (
  SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '30 days', '1 day')::date as slot_date
) d
CROSS JOIN (
  SELECT unnest(ARRAY['09:00'::time, '10:00'::time, '11:00'::time, '12:00'::time, 
                      '13:00'::time, '14:00'::time, '15:00'::time, '16:00'::time, '17:00'::time]) as slot_time
) t
ON CONFLICT (date, time_slot) DO NOTHING;
