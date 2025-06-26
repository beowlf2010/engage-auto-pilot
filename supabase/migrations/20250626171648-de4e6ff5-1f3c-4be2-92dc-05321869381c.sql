
-- First, let's create a function to safely get or create user profiles
CREATE OR REPLACE FUNCTION public.ensure_user_profile(p_user_id uuid, p_email text, p_first_name text DEFAULT 'User', p_last_name text DEFAULT 'Name')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id FROM public.profiles WHERE id = p_user_id;
  
  IF profile_id IS NULL THEN
    -- Create new profile
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (p_user_id, p_email, p_first_name, p_last_name, 'manager')
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;

-- Function to ensure user has manager role for CSV uploads
CREATE OR REPLACE FUNCTION public.ensure_manager_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert manager role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Enhanced RLS policy for leads that handles profile creation
DROP POLICY IF EXISTS "Users with manager or admin role can insert leads" ON public.leads;
CREATE POLICY "Users with manager or admin role can insert leads" ON public.leads
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'manager')
    )
  );

-- Enhanced RLS policy for phone_numbers that handles profile creation
DROP POLICY IF EXISTS "Users with manager or admin role can insert phone numbers" ON public.phone_numbers;
CREATE POLICY "Users with manager or admin role can insert phone numbers" ON public.phone_numbers
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = phone_numbers.lead_id 
      AND (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
      )
    )
  );

-- Create a function to initialize user for CSV operations
CREATE OR REPLACE FUNCTION public.initialize_user_for_csv(p_user_id uuid, p_email text, p_first_name text DEFAULT 'User', p_last_name text DEFAULT 'Name')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  profile_created boolean := false;
  role_created boolean := false;
BEGIN
  -- Ensure profile exists
  PERFORM public.ensure_user_profile(p_user_id, p_email, p_first_name, p_last_name);
  profile_created := true;
  
  -- Ensure manager role exists
  PERFORM public.ensure_manager_role(p_user_id);
  role_created := true;
  
  -- Return status
  result := jsonb_build_object(
    'success', true,
    'profile_created', profile_created,
    'role_created', role_created,
    'user_id', p_user_id,
    'message', 'User initialized successfully for CSV operations'
  );
  
  RETURN result;
END;
$$;
