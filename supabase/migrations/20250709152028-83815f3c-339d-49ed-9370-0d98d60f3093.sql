-- Add sold customer tracking to upload_history table
ALTER TABLE public.upload_history 
ADD COLUMN sold_customers_count integer DEFAULT 0,
ADD COLUMN sold_customers_data jsonb DEFAULT '[]'::jsonb,
ADD COLUMN post_sale_assignments_made integer DEFAULT 0;

-- Create index for better performance when querying sold customers
CREATE INDEX idx_upload_history_sold_customers ON public.upload_history (sold_customers_count) WHERE sold_customers_count > 0;

-- Add comment for documentation
COMMENT ON COLUMN public.upload_history.sold_customers_count IS 'Count of customers marked as sold in this upload';
COMMENT ON COLUMN public.upload_history.sold_customers_data IS 'Details of sold customers uploaded including names, sources, and assignment info';
COMMENT ON COLUMN public.upload_history.post_sale_assignments_made IS 'Count of sold customers assigned to post-sale processes';