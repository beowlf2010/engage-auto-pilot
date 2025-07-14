-- Temporarily disable AI automation until SMS pipeline is working
INSERT INTO ai_emergency_settings (ai_disabled, disable_reason)
VALUES (true, 'SMS pipeline failures detected - investigating and fixing before re-enabling')
ON CONFLICT (id) DO UPDATE SET
  ai_disabled = true,
  disable_reason = 'SMS pipeline failures detected - investigating and fixing before re-enabling',
  disabled_at = now(),
  updated_at = now();