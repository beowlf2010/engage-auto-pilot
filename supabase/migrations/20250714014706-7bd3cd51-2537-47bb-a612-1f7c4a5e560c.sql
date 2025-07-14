-- Emergency disable all AI automation to prevent automatic responses
UPDATE ai_emergency_settings 
SET ai_disabled = true, 
    disable_reason = 'User requested stopping automatic OK replies',
    disabled_at = now(),
    updated_at = now()
WHERE id = '237cbf27-f24a-46a8-945c-164af4ae9035';

-- Deactivate all AI message templates to prevent automatic responses
UPDATE ai_message_templates 
SET is_active = false, 
    updated_at = now()
WHERE is_active = true;

-- Ensure no leads are scheduled for AI sending
UPDATE leads 
SET ai_opt_in = false,
    ai_stage = 'paused',
    next_ai_send_at = NULL,
    updated_at = now()
WHERE ai_opt_in = true OR ai_stage != 'paused';