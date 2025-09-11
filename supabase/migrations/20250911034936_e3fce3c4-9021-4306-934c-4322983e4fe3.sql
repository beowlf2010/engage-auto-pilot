-- Add dealership field to profiles table and update current user's profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dealership_name text;

-- Update the current user's profile to reflect new role and dealership
DO $$
BEGIN
  -- First try to update existing profile
  UPDATE public.profiles 
  SET 
    role = 'manager',
    dealership_name = 'U-J Chevrolet',
    first_name = COALESCE(first_name, 'Used Car'),
    last_name = COALESCE(last_name, 'Manager'),
    updated_at = now()
  WHERE id = auth.uid();
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, 
      email, 
      first_name, 
      last_name, 
      role, 
      dealership_name,
      created_at,
      updated_at
    ) 
    SELECT 
      auth.uid(),
      COALESCE(auth.email(), 'manager@u-jchevrolet.com'),
      'Used Car',
      'Manager', 
      'manager',
      'U-J Chevrolet',
      now(),
      now()
    WHERE auth.uid() IS NOT NULL;
  END IF;
  
  -- Ensure user has manager role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'manager'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update dealership settings
  INSERT INTO public.settings (key, value, updated_at)
  VALUES ('DEALERSHIP_NAME', 'U-J Chevrolet', now())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
    
  INSERT INTO public.settings (key, value, updated_at)
  VALUES ('DEALERSHIP_LOCATION', 'Used Car Department', now())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END $$;