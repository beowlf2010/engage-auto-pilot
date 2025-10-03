-- Delete all leads except Thomas Bailey (2f01a493-abe4-466b-8a07-3e98d8927005)

-- Delete from all related tables first
DELETE FROM public.phone_numbers WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.conversations WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_conversation_context WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_conversation_notes WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_conversation_preferences WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_generated_messages WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_inventory_matches WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_lead_scores WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_learning_insights WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_message_analytics WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_message_approval_queue WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_message_history WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_message_feedback WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_quality_scores WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_engagement_predictions WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_churn_predictions WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_notifications WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_context_learning WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_learning_outcomes WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';
DELETE FROM public.ai_message_schedule WHERE lead_id != '2f01a493-abe4-466b-8a07-3e98d8927005';

-- Delete the leads themselves
DELETE FROM public.leads WHERE id != '2f01a493-abe4-466b-8a07-3e98d8927005';