-- Fix RLS policy violation by making update_template_performance a SECURITY DEFINER function
-- This allows automated template performance tracking to bypass RLS

CREATE OR REPLACE FUNCTION public.update_template_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_record_id UUID;
BEGIN
  -- Only process AI-generated messages
  IF NEW.ai_generated = true AND NEW.body IS NOT NULL THEN
    -- Check if a record with this template content already exists
    SELECT id INTO existing_record_id
    FROM public.ai_template_performance 
    WHERE template_content = NEW.body 
    AND template_variant = 'default'
    LIMIT 1;
    
    IF existing_record_id IS NOT NULL THEN
      -- Update existing record
      UPDATE public.ai_template_performance
      SET usage_count = usage_count + 1,
          last_used_at = NEW.sent_at,
          updated_at = now()
      WHERE id = existing_record_id;
    ELSE
      -- Insert new record
      INSERT INTO public.ai_template_performance (
        template_content, 
        template_variant, 
        template_stage,
        usage_count,
        last_used_at,
        created_at,
        updated_at
      )
      VALUES (
        NEW.body,
        'default',
        'follow_up',
        1,
        NEW.sent_at,
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;