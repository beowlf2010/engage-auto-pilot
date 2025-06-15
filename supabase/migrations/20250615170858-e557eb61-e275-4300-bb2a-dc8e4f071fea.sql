
-- 1. Log recon activity on vehicles (each row = an event/change)
CREATE TABLE public.recon_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g. 'stage_change', 'note', 'approval', 'decline', 'key_move'
  action_detail TEXT,        -- optional freeform text or JSON string with detail
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Per-vehicle recon “service lines” (item/issue, price, status, assignment)
CREATE TABLE public.recon_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  description TEXT NOT NULL,              -- e.g. “replace brake pads”
  status TEXT NOT NULL DEFAULT 'pending', -- e.g. 'pending', 'in_progress', 'approved', 'declined', 'completed'
  cost NUMERIC,                           -- estimated or final cost
  due_date DATE,                          -- ETA
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Approvals/declines per service line per user (one per user per line)
CREATE TABLE public.recon_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_line_id UUID NOT NULL REFERENCES recon_service_lines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  approval_status TEXT NOT NULL,          -- 'approved', 'declined'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_line_id, user_id)
);

-- 4. Key movement logs (linked to vehicles & optionally to users)
CREATE TABLE public.key_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  moved_by UUID REFERENCES profiles(id),
  location TEXT,                        -- e.g., “Service Desk”, “Lot A”, etc.
  action_type TEXT,                     -- e.g., “checked_out”, “returned”, “scanned”
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. File/photo attachments per recon service line
CREATE TABLE public.recon_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_line_id UUID NOT NULL REFERENCES recon_service_lines(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and basic access policies for all tables
ALTER TABLE public.recon_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_attachments ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to read/write their own actions
-- Example: recon_approvals
CREATE POLICY "Users can manage their own approvals"
  ON public.recon_approvals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Example: recon_service_lines (any authenticated can read, only profiles can insert/update)
CREATE POLICY "Authenticated can view recon lines"
  ON public.recon_service_lines
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles can manage recon lines"
  ON public.recon_service_lines
  FOR ALL
  TO authenticated
  USING (assigned_to = auth.uid() OR assigned_to IS NULL)
  WITH CHECK (assigned_to = auth.uid() OR assigned_to IS NULL);

-- You might want to adjust and create similar RLS for logs, moves, and attachments as needed.
