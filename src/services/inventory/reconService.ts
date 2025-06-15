
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
