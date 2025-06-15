import { supabase } from "@/integrations/supabase/client";

export async function fetchReconServiceLines(inventoryId: string) {
  const { data, error } = await supabase
    .from("recon_service_lines")
    .select("*")
    .eq("inventory_id", inventoryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addReconServiceLine(inventoryId: string, description: string, assignedTo?: string, dueDate?: string) {
  const { data, error } = await supabase
    .from("recon_service_lines")
    .insert([
      {
        inventory_id: inventoryId,
        description,
        assigned_to: assignedTo ?? null,
        due_date: dueDate ?? null,
      }
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReconServiceLine(lineId: string, updates: Partial<{ status: string; cost: number; due_date: string; assigned_to: string }>) {
  const { data, error } = await supabase
    .from("recon_service_lines")
    .update(updates)
    .eq("id", lineId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReconApprovals(serviceLineId: string) {
  const { data, error } = await supabase
    .from("recon_approvals")
    .select("*, profiles: user_id (first_name, last_name)")
    .eq("service_line_id", serviceLineId);
  if (error) throw error;
  return data;
}

export async function upsertReconApproval({ serviceLineId, userId, status, notes }: {
  serviceLineId: string;
  userId: string;
  status: string;
  notes?: string;
}) {
  // Upsert for unique (service_line_id, user_id)
  const { data, error } = await supabase
    .from("recon_approvals")
    .upsert(
      [{
        service_line_id: serviceLineId,
        user_id: userId,
        approval_status: status,
        notes: notes ?? null,
      }],
      { onConflict: "service_line_id, user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReconAttachments(serviceLineId: string) {
  const { data, error } = await supabase
    .from("recon_attachments")
    .select("*")
    .eq("service_line_id", serviceLineId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addReconAttachment(serviceLineId: string, url: string, uploadedBy?: string) {
  const { data, error } = await supabase
    .from("recon_attachments")
    .insert([
      { service_line_id: serviceLineId, url, uploaded_by: uploadedBy ?? null }
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}
