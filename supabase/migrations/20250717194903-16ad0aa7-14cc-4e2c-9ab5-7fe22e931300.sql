-- Ensure compliance_suppression_list table exists and has proper structure
CREATE TABLE IF NOT EXISTS compliance_suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact text NOT NULL,
  type text NOT NULL CHECK (type IN ('sms', 'email')),
  reason text NOT NULL,
  details text,
  lead_id uuid REFERENCES leads(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_suppression_contact_type 
ON compliance_suppression_list(contact, type);

CREATE INDEX IF NOT EXISTS idx_compliance_suppression_lead_id 
ON compliance_suppression_list(lead_id);

-- Enable RLS for security
ALTER TABLE compliance_suppression_list ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Authenticated users can manage suppression list" 
ON compliance_suppression_list 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_suppression_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_compliance_suppression_updated_at_trigger ON compliance_suppression_list;
CREATE TRIGGER update_compliance_suppression_updated_at_trigger
  BEFORE UPDATE ON compliance_suppression_list
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_suppression_updated_at();

-- Create lead_consent_audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_consent_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  event_type text NOT NULL,
  channel text NOT NULL,
  event_metadata jsonb DEFAULT '{}',
  performed_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for lead_consent_audit
CREATE INDEX IF NOT EXISTS idx_lead_consent_audit_lead_id 
ON lead_consent_audit(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_consent_audit_event_type 
ON lead_consent_audit(event_type);

-- Enable RLS for lead_consent_audit
ALTER TABLE lead_consent_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for lead_consent_audit
CREATE POLICY IF NOT EXISTS "Authenticated users can manage consent audit" 
ON lead_consent_audit 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);