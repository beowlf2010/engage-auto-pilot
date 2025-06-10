
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('sales', 'manager', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table with proper phone number structure
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT,
  email_alt TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  vehicle_interest TEXT NOT NULL,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_vin TEXT,
  source TEXT NOT NULL DEFAULT 'Manual Entry',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'engaged', 'paused', 'closed', 'lost')),
  salesperson_id UUID REFERENCES public.profiles(id),
  ai_opt_in BOOLEAN NOT NULL DEFAULT true,
  ai_stage TEXT,
  next_ai_send_at TIMESTAMP WITH TIME ZONE,
  do_not_call BOOLEAN NOT NULL DEFAULT false,
  do_not_email BOOLEAN NOT NULL DEFAULT false,
  do_not_mail BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create phone_numbers table for multi-phone support
CREATE TABLE public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cell', 'day', 'eve')),
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'failed', 'opted_out')),
  last_attempt TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table for chat history
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_memory table for AI context
CREATE TABLE public.conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'objection', 'timeline', 'context')),
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers and admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

-- RLS Policies for leads
CREATE POLICY "Sales can view their assigned leads" ON public.leads
  FOR SELECT USING (salesperson_id = auth.uid());

CREATE POLICY "Managers and admins can view all leads" ON public.leads
  FOR SELECT USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Sales can update their assigned leads" ON public.leads
  FOR UPDATE USING (salesperson_id = auth.uid());

CREATE POLICY "Managers and admins can update all leads" ON public.leads
  FOR UPDATE USING (public.get_current_user_role() IN ('manager', 'admin'));

CREATE POLICY "Managers and admins can insert leads" ON public.leads
  FOR INSERT WITH CHECK (public.get_current_user_role() IN ('manager', 'admin'));

-- RLS Policies for phone_numbers
CREATE POLICY "Users can view phone numbers for accessible leads" ON public.phone_numbers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

CREATE POLICY "Users can manage phone numbers for accessible leads" ON public.phone_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations for accessible leads" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

CREATE POLICY "Users can manage conversations for accessible leads" ON public.conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

-- RLS Policies for conversation_memory
CREATE POLICY "Users can view memory for accessible leads" ON public.conversation_memory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

CREATE POLICY "Users can manage memory for accessible leads" ON public.conversation_memory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'admin'))
    )
  );

-- Create trigger function for user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'first_name', 'User'),
    COALESCE(new.raw_user_meta_data ->> 'last_name', 'Name')
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_leads_salesperson_id ON public.leads(salesperson_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_phone_numbers_lead_id ON public.phone_numbers(lead_id);
CREATE INDEX idx_phone_numbers_primary ON public.phone_numbers(lead_id, is_primary);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_conversation_memory_lead_id ON public.conversation_memory(lead_id);

-- Create function to normalize phone numbers to E.164 format
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  digits_only TEXT;
BEGIN
  -- Remove all non-digit characters
  digits_only := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Handle 10-digit numbers - add +1
  IF length(digits_only) = 10 THEN
    RETURN '+1' || digits_only;
  END IF;
  
  -- Handle 11-digit numbers starting with 1
  IF length(digits_only) = 11 AND left(digits_only, 1) = '1' THEN
    RETURN '+' || digits_only;
  END IF;
  
  -- Return original if unknown format
  RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Create function to set primary phone
CREATE OR REPLACE FUNCTION public.set_primary_phone(p_lead_id UUID, p_phone_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Remove primary flag from all phones for this lead
  UPDATE public.phone_numbers 
  SET is_primary = false 
  WHERE lead_id = p_lead_id;
  
  -- Set the specified phone as primary
  UPDATE public.phone_numbers 
  SET is_primary = true 
  WHERE id = p_phone_id AND lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
