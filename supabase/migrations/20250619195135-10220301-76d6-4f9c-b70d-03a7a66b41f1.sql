
-- Create user notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  personal_phone TEXT,
  sms_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  browser_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_hours_start INTEGER NOT NULL DEFAULT 8,
  notification_hours_end INTEGER NOT NULL DEFAULT 19,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create notification log table to track sent alerts
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  lead_id UUID REFERENCES public.leads,
  conversation_id UUID REFERENCES public.conversations,
  notification_type TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent'
);

-- Add personal phone to profiles table
ALTER TABLE public.profiles 
ADD COLUMN personal_phone TEXT,
ADD COLUMN notification_preferences_id UUID REFERENCES public.user_notification_preferences(id);

-- Enable RLS on new tables
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
  ON public.user_notification_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
  ON public.user_notification_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
  ON public.user_notification_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for notification_log
CREATE POLICY "Users can view their own notification logs" 
  ON public.notification_log 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs" 
  ON public.notification_log 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to initialize user notification preferences
CREATE OR REPLACE FUNCTION public.initialize_user_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create notification preferences for new users
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_notification_preferences();
