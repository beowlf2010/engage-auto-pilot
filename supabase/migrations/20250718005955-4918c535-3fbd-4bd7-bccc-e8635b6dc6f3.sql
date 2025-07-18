-- Fix compliance_suppression_list table missing columns
-- This is causing all AI automation leads to fail with "column created_at does not exist" error

-- Add missing created_at and updated_at columns to compliance_suppression_list table
ALTER TABLE public.compliance_suppression_list 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update any existing records to have proper timestamps
UPDATE public.compliance_suppression_list 
SET created_at = now(), updated_at = now() 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Make the columns NOT NULL after setting defaults
ALTER TABLE public.compliance_suppression_list 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_compliance_suppression_updated_at_trigger ON public.compliance_suppression_list;
CREATE TRIGGER update_compliance_suppression_updated_at_trigger
  BEFORE UPDATE ON public.compliance_suppression_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_suppression_updated_at();

-- Add indexes for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_compliance_suppression_created_at 
ON public.compliance_suppression_list(created_at);

CREATE INDEX IF NOT EXISTS idx_compliance_suppression_updated_at 
ON public.compliance_suppression_list(updated_at);