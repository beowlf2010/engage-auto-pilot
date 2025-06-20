
-- Create a table for lead notes
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint to leads table
ALTER TABLE public.lead_notes 
ADD CONSTRAINT fk_lead_notes_lead_id 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Enable RLS for lead notes
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Policy for viewing notes (users can view notes they created)
CREATE POLICY "Users can view their own notes" 
  ON public.lead_notes 
  FOR SELECT 
  USING (created_by = auth.uid());

-- Policy for creating notes
CREATE POLICY "Users can create notes" 
  ON public.lead_notes 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

-- Policy for updating own notes
CREATE POLICY "Users can update their own notes" 
  ON public.lead_notes 
  FOR UPDATE 
  USING (created_by = auth.uid());

-- Policy for deleting own notes
CREATE POLICY "Users can delete their own notes" 
  ON public.lead_notes 
  FOR DELETE 
  USING (created_by = auth.uid());

-- Add indexes for better performance
CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created_by ON public.lead_notes(created_by);
CREATE INDEX idx_lead_notes_created_at ON public.lead_notes(created_at DESC);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_lead_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on updates
CREATE TRIGGER trigger_update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_notes_updated_at();
