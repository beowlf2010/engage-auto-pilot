-- COMPLETE DATA PURGE FOR DEALERSHIP TRANSITION
-- This handles all foreign key constraints and deletes everything properly

BEGIN;

-- Step 1: Create/update anonymous lead for conversation preservation
INSERT INTO public.leads (
  id, first_name, last_name, email, source, status, 
  vehicle_interest, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Anonymous', 
  'Customer', 
  NULL, 
  'anonymized_system', 
  'archived',
  'Data purged for dealership transition',
  now(), 
  now()
) ON CONFLICT (id) DO UPDATE SET 
  source = 'anonymized_system',
  updated_at = now();

-- Step 2: Reassign all conversations to anonymous lead first
UPDATE public.conversations 
SET lead_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 3: Delete all AI learning and outcome data that references leads
DELETE FROM public.ai_learning_outcomes 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_context_learning 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 4: Delete all other AI-related data for non-anonymous leads
DELETE FROM public.phone_numbers 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_conversation_context 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_conversation_notes 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_conversation_preferences 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_generated_messages 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_message_history 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_lead_scores 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_notifications 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_inventory_matches 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_message_feedback 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_quality_scores 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_engagement_predictions 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_churn_predictions 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.ai_learning_insights 
WHERE lead_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 5: Delete all non-anonymous leads
DELETE FROM public.leads 
WHERE id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 6: Delete all inventory
DELETE FROM public.inventory;

-- Step 7: Delete all upload history
DELETE FROM public.upload_history;

-- Step 8: Update dealership settings
INSERT INTO public.settings (key, value, updated_at) 
VALUES ('DEALERSHIP_NAME', 'U-J Chevrolet', now())
ON CONFLICT (key) 
DO UPDATE SET value = 'U-J Chevrolet', updated_at = now();

INSERT INTO public.settings (key, value, updated_at) 
VALUES ('DEALERSHIP_LOCATION', 'Used Car Department', now())
ON CONFLICT (key) 
DO UPDATE SET value = 'Used Car Department', updated_at = now();

COMMIT;