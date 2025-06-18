
-- Create appointments table with comprehensive fields
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  appointment_type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  salesperson_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  no_show_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  follow_up_required BOOLEAN DEFAULT false
);

-- Add Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments access
CREATE POLICY "Users can view appointments for their leads or assigned appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = appointments.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('manager', 'admin')
      ))
    ) OR salesperson_id = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "Users can create appointments for their leads" 
  ON public.appointments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = appointments.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('manager', 'admin')
      ))
    )
  );

CREATE POLICY "Users can update appointments they created or are assigned to" 
  ON public.appointments 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR 
    salesperson_id = auth.uid() OR 
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Users can delete appointments they created" 
  ON public.appointments 
  FOR DELETE 
  USING (
    created_by = auth.uid() OR 
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role IN ('manager', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_appointments_salesperson_id ON public.appointments(salesperson_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_created_by ON public.appointments(created_by);

-- Add check constraints for valid values
ALTER TABLE public.appointments ADD CONSTRAINT check_appointment_type 
  CHECK (appointment_type IN ('consultation', 'test_drive', 'service', 'delivery', 'follow_up', 'other'));

ALTER TABLE public.appointments ADD CONSTRAINT check_appointment_status 
  CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'));

ALTER TABLE public.appointments ADD CONSTRAINT check_duration_positive 
  CHECK (duration_minutes > 0);
