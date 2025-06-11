
import { supabase } from '@/integrations/supabase/client';

export interface PricingDisclaimer {
  id: string;
  name: string;
  disclaimer_text: string;
  disclaimer_type: 'general' | 'internet_price' | 'trade_value' | 'financing' | 'lease';
  is_active: boolean;
}

export const getPricingDisclaimers = async () => {
  try {
    const { data, error } = await supabase
      .from('pricing_disclaimers')
      .select('*')
      .eq('is_active', true)
      .order('disclaimer_type');

    if (error) throw error;
    return data as PricingDisclaimer[];
  } catch (error) {
    console.error('Error fetching disclaimers:', error);
    return [];
  }
};
