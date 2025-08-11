-- Remove permissive public policy exposing conversation data
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='conversation_summaries' 
      AND policyname='Allow all operations on conversation_summaries'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations on conversation_summaries" ON public.conversation_summaries';
  END IF;
END $$;