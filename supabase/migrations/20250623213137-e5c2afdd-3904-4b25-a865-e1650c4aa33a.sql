
-- Create enum for aggression levels
CREATE TYPE aggression_level AS ENUM ('gentle', 'moderate', 'aggressive', 'super_aggressive');

-- Create enum for process assignment status
CREATE TYPE process_assignment_status AS ENUM ('active', 'paused', 'completed', 'escalated');

-- Create lead_processes table
CREATE TABLE public.lead_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  aggression_level aggression_level NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_sequence JSONB DEFAULT '[]'::jsonb,
  escalation_rules JSONB DEFAULT '[]'::jsonb,
  success_criteria JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb
);

-- Create lead_process_assignments table
CREATE TABLE public.lead_process_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.lead_processes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_stage INTEGER NOT NULL DEFAULT 0,
  next_message_at TIMESTAMP WITH TIME ZONE,
  status process_assignment_status NOT NULL DEFAULT 'active',
  performance_notes TEXT,
  UNIQUE(lead_id, process_id)
);

-- Add RLS policies
ALTER TABLE public.lead_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_process_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_processes (allow all authenticated users to read, admins to modify)
CREATE POLICY "Anyone can view lead processes" ON public.lead_processes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lead processes" ON public.lead_processes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- RLS policies for lead_process_assignments (users can see assignments for leads they can access)
CREATE POLICY "Users can view process assignments" ON public.lead_process_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE id = lead_process_assignments.lead_id
    )
  );

CREATE POLICY "Users can create process assignments" ON public.lead_process_assignments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE id = lead_process_assignments.lead_id
    )
  );

CREATE POLICY "Users can update process assignments" ON public.lead_process_assignments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE id = lead_process_assignments.lead_id
    )
  );

-- Create indexes for performance
CREATE INDEX idx_lead_process_assignments_lead_id ON public.lead_process_assignments(lead_id);
CREATE INDEX idx_lead_process_assignments_process_id ON public.lead_process_assignments(process_id);
CREATE INDEX idx_lead_process_assignments_status ON public.lead_process_assignments(status);
CREATE INDEX idx_lead_processes_aggression_level ON public.lead_processes(aggression_level);
CREATE INDEX idx_lead_processes_is_active ON public.lead_processes(is_active);
