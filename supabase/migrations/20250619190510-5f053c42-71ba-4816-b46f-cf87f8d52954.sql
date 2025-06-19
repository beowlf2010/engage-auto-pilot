
-- Fix the update_template_performance function to use manual upsert logic
-- instead of ON CONFLICT which requires a unique constraint that doesn't exist
CREATE OR REPLACE FUNCTION public.update_template_performance()
RETURNS TRIGGER AS $$
DECLARE
  existing_record_id UUID;
BEGIN
  -- Update template performance when AI-generated conversations are created
  IF NEW.ai_generated = true THEN
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
        usage_count,
        last_used_at
      )
      VALUES (
        NEW.body,
        'default',
        1,
        NEW.sent_at
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
