
-- Fix the make_current_user_admin function to properly handle app_role enum type
DROP FUNCTION IF EXISTS public.make_current_user_admin();

CREATE OR REPLACE FUNCTION public.make_current_user_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct INSERT with proper enum casting to avoid RLS recursion
  INSERT INTO user_roles (user_id, role) 
  VALUES (auth.uid(), 'admin'::app_role) 
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'User promoted to admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.make_current_user_admin() TO authenticated;
