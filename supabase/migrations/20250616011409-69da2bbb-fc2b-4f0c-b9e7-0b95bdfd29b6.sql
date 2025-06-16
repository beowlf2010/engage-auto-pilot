
-- Create table for storing exported message data
CREATE TABLE public.message_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  export_name TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'vin',
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_leads INTEGER NOT NULL DEFAULT 0,
  export_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for message import mapping
CREATE TABLE public.message_import_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  export_id UUID REFERENCES public.message_exports(id) ON DELETE CASCADE,
  external_lead_id TEXT NOT NULL,
  internal_lead_id UUID REFERENCES public.leads(id),
  external_message_id TEXT,
  internal_message_id UUID REFERENCES public.conversations(id),
  mapping_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing historical message data for analytics
CREATE TABLE public.historical_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  original_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'vin',
  message_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.message_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_import_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_messages ENABLE ROW LEVEL SECURITY;

-- Policies for message_exports
CREATE POLICY "Users can view their own exports" ON public.message_exports
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create exports" ON public.message_exports
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own exports" ON public.message_exports
  FOR UPDATE USING (created_by = auth.uid());

-- Policies for message_import_mapping
CREATE POLICY "Users can view import mappings" ON public.message_import_mapping
  FOR SELECT USING (true);

CREATE POLICY "System can manage import mappings" ON public.message_import_mapping
  FOR ALL USING (true);

-- Policies for historical_messages
CREATE POLICY "Users can view historical messages" ON public.historical_messages
  FOR SELECT USING (true);

CREATE POLICY "System can manage historical messages" ON public.historical_messages
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_message_exports_created_by ON public.message_exports(created_by);
CREATE INDEX idx_message_exports_source ON public.message_exports(source_system);
CREATE INDEX idx_import_mapping_export_id ON public.message_import_mapping(export_id);
CREATE INDEX idx_import_mapping_external_lead ON public.message_import_mapping(external_lead_id);
CREATE INDEX idx_historical_messages_lead_id ON public.historical_messages(lead_id);
CREATE INDEX idx_historical_messages_sent_at ON public.historical_messages(sent_at);
