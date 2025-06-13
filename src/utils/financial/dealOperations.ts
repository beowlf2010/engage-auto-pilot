
import { supabase } from "@/integrations/supabase/client";

export const updateDealType = async (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale') => {
  const { error } = await supabase
    .from('deals')
    .update({ deal_type: newType })
    .eq('id', dealId);

  if (error) {
    throw new Error(`Failed to update deal type: ${error.message}`);
  }
};
