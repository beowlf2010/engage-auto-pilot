-- EMERGENCY NUCLEAR PURGE - DELETE EVERYTHING IMMEDIATELY
-- This will forcefully remove all data

BEGIN;

-- Step 1: Disable all foreign key constraints temporarily
SET session_replication_role = replica;

-- Step 2: Delete EVERYTHING from all tables (except keep anonymous lead)
DELETE FROM public.ai_learning_outcomes;
DELETE FROM public.ai_context_learning;
DELETE FROM public.phone_numbers WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_conversation_context WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_conversation_notes WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_conversation_preferences WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_generated_messages WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_message_history WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_lead_scores WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_notifications WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_inventory_matches WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_message_feedback WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_quality_scores WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_engagement_predictions WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_churn_predictions WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_learning_insights WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;
DELETE FROM public.ai_message_schedule WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;

-- Step 3: Reassign all conversations to the anonymous lead
UPDATE public.conversations 
SET lead_id = '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid 
WHERE lead_id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;

-- Step 4: DELETE ALL LEADS except the anonymous one
DELETE FROM public.leads WHERE id != '2ffab119-ccf7-40ba-b204-2b58c2cc87b1'::uuid;

-- Step 5: Delete all inventory and upload history
DELETE FROM public.inventory;
DELETE FROM public.upload_history;

-- Step 6: Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

COMMIT;