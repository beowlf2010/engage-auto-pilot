
-- Create a table for storing message templates
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS for message templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Policy for viewing templates (own templates or shared ones)
CREATE POLICY "Users can view own templates and shared templates" 
  ON public.message_templates 
  FOR SELECT 
  USING (created_by = auth.uid() OR is_shared = true);

-- Policy for creating templates
CREATE POLICY "Users can create templates" 
  ON public.message_templates 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

-- Policy for updating own templates
CREATE POLICY "Users can update own templates" 
  ON public.message_templates 
  FOR UPDATE 
  USING (created_by = auth.uid());

-- Policy for deleting own templates
CREATE POLICY "Users can delete own templates" 
  ON public.message_templates 
  FOR DELETE 
  USING (created_by = auth.uid());

-- Add indexes for better performance
CREATE INDEX idx_message_templates_category ON public.message_templates(category);
CREATE INDEX idx_message_templates_created_by ON public.message_templates(created_by);
CREATE INDEX idx_message_templates_shared ON public.message_templates(is_shared) WHERE is_shared = true;

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.message_templates 
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$;
