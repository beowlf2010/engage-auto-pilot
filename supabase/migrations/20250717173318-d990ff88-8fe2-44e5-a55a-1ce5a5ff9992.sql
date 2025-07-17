-- Create AI system profile for automation messages
INSERT INTO public.profiles (id, email, first_name, last_name, role, profile_slug) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ai-system@dealership.com', 
  'AI',
  'System',
  'admin',
  'ai-system'
) 
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  profile_slug = EXCLUDED.profile_slug;