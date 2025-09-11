-- Add dealership field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dealership_name text;