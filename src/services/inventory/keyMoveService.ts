
import { supabase } from "@/integrations/supabase/client";

export async function logKeyMove({ inventoryId, movedBy, location, actionType, notes }: {
  inventoryId: string,
  movedBy: string,
  location?: string,
  actionType?: string,
  notes?: string
}) {
  const { data, error } = await supabase
    .from("key_moves")
    .insert([{
      inventory_id: inventoryId,
      moved_by: movedBy,
      location: location ?? null,
      action_type: actionType ?? "checked_out",
      notes: notes ?? null
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchKeyMoves(inventoryId: string) {
  const { data, error } = await supabase
    .from("key_moves")
    .select(`
      *,
      profiles: moved_by (first_name, last_name)
    `)
    .eq("inventory_id", inventoryId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
