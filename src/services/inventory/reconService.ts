
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
  console.log(`📝 [RECON SERVICE] Upserting recon approval: service line ${serviceLineId}, user ${userId}, status ${status}`);
  
  try {
    // Check if approval already exists
    const { data: existing, error: checkError } = await supabase
      .from("recon_approvals")
      .select('id')
      .eq('service_line_id', serviceLineId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ [RECON SERVICE] Error checking existing approval:', checkError);
      throw checkError;
    }

    if (existing) {
      // Update existing approval
      console.log(`🔄 [RECON SERVICE] Updating existing approval ${existing.id}`);
      const { data, error: updateError } = await supabase
        .from("recon_approvals")
        .update({
          approval_status: status,
          notes: notes ?? null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [RECON SERVICE] Error updating approval:', updateError);
        throw updateError;
      }
      console.log(`✅ [RECON SERVICE] Updated approval successfully`);
      return data;
    } else {
      // Insert new approval
      console.log(`✨ [RECON SERVICE] Creating new approval`);
      const { data, error: insertError } = await supabase
        .from("recon_approvals")
        .insert({
          service_line_id: serviceLineId,
          user_id: userId,
          approval_status: status,
          notes: notes ?? null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [RECON SERVICE] Error inserting approval:', insertError);
        throw insertError;
      }
      console.log(`✅ [RECON SERVICE] Created approval successfully`);
      return data;
    }
  } catch (error) {
    console.error('❌ [RECON SERVICE] Error in upsertReconApproval:', error);
    throw error;
  }
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
