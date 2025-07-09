-- Add manager role to Robert Busby
INSERT INTO public.user_roles (user_id, role)
VALUES ('3c97b439-033c-4c0a-a637-8527cf67a69e', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;