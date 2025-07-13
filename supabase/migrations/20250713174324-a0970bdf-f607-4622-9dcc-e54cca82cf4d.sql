-- Temporarily disable RLS on conversations table to allow managers to see all conversations
-- This is a temporary fix while we investigate the auth.uid() issue

ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;