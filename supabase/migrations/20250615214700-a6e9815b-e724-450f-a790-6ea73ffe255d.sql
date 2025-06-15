
-- 1. Table for storing consent proof (one row per lead per channel/type)
CREATE TABLE IF NOT EXISTS public.lead_consent_proof (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  consent_channel TEXT NOT NULL, -- e.g. 'sms', 'email', 'phone', 'web'
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_method TEXT NOT NULL, -- e.g. 'web_form', 'call', 'in_person'
  consent_text TEXT, -- copy of consent language at time of capture
  ip_address TEXT,
  user_agent TEXT,
  captured_by UUID, -- optional, staff user_id who recorded it
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table for logging all consent-related events (opt-in, opt-out, re-consent, suppression, etc.)
CREATE TABLE IF NOT EXISTS public.lead_consent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- e.g. 'opt-in', 'opt-out', 're-consent', 'auto-block'
  channel TEXT NOT NULL, -- 'sms', 'email'
  event_metadata JSONB,
  performed_by UUID,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Suppression list for opt-outs and automatic blocks
CREATE TABLE IF NOT EXISTS public.compliance_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'sms', 'email'
  contact TEXT NOT NULL, -- phone or email
  lead_id UUID, -- if matched to a known lead
  reason TEXT, -- e.g. 'STOP received', 'unsubscribe', 'bounced', 'manual block'
  details TEXT,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table for storing customizable legal policies and terms
CREATE TABLE IF NOT EXISTS public.legal_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Privacy Policy', 'Terms of Service', etc.
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  disclosure_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Settings for compliance (e.g. message windows, default disclaimers)
CREATE TABLE IF NOT EXISTS public.compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_window_start TIME NOT NULL DEFAULT '08:00',
  message_window_end TIME NOT NULL DEFAULT '19:00',
  sms_disclaimer TEXT,
  email_disclaimer TEXT,
  policy_links JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RLS security
ALTER TABLE public.lead_consent_proof ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_consent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (example: Admins/managers see all; others only their leads, or nothing)
CREATE POLICY "Admins and managers see all lead consent" ON public.lead_consent_proof
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers audit log" ON public.lead_consent_audit
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers control suppressions" ON public.compliance_suppression_list
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "All can view legal disclosures" ON public.legal_disclosures
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers edit compliance settings" ON public.compliance_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- (Optional: Add insert/update/delete policies as needed for management UI later)
