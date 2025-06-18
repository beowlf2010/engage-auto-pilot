
import { supabase } from '@/integrations/supabase/client';

export const cleanLeadVehicleInterest = async (leadId: string) => {
  try {
    // Get the current lead data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('vehicle_interest')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      console.error('Error fetching lead:', fetchError);
      return false;
    }

    if (!lead.vehicle_interest) return true;

    // Clean the vehicle interest field
    const cleaned = lead.vehicle_interest
      .replace(/"/g, '') // Remove all quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (cleaned !== lead.vehicle_interest) {
      // Update the lead with cleaned data
      const { error: updateError } = await supabase
        .from('leads')
        .update({ vehicle_interest: cleaned })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead vehicle interest:', updateError);
        return false;
      }

      console.log(`✅ Cleaned vehicle interest for lead ${leadId}: "${lead.vehicle_interest}" -> "${cleaned}"`);
    }

    return true;
  } catch (error) {
    console.error('Error in cleanLeadVehicleInterest:', error);
    return false;
  }
};

// Function to clean all leads with malformed vehicle interest data
export const cleanAllLeadVehicleInterests = async () => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, vehicle_interest')
      .not('vehicle_interest', 'is', null);

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    let cleanedCount = 0;
    
    for (const lead of leads || []) {
      if (lead.vehicle_interest && lead.vehicle_interest.includes('"')) {
        const cleaned = lead.vehicle_interest
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const { error: updateError } = await supabase
          .from('leads')
          .update({ vehicle_interest: cleaned })
          .eq('id', lead.id);

        if (!updateError) {
          cleanedCount++;
          console.log(`✅ Cleaned lead ${lead.id}: "${lead.vehicle_interest}" -> "${cleaned}"`);
        }
      }
    }

    console.log(`🧹 Cleaned ${cleanedCount} lead records`);
  } catch (error) {
    console.error('Error cleaning lead data:', error);
  }
};
