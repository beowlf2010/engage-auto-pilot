
import { supabase } from "@/integrations/supabase/client";

export const getMonthlyRetailSummary = async () => {
  const { data, error } = await supabase
    .from('v_monthly_retail_summary')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching monthly retail summary:', error);
    return {
      new_units_mtd: 0,
      new_gross_mtd: 0,
      used_units_mtd: 0,
      used_gross_mtd: 0,
      total_units_mtd: 0,
      total_profit_mtd: 0
    };
  }

  return {
    new_units_mtd: data?.new_units_mtd || 0,
    new_gross_mtd: data?.new_gross_mtd || 0,
    used_units_mtd: data?.used_units_mtd || 0,
    used_gross_mtd: data?.used_gross_mtd || 0,
    total_units_mtd: data?.total_units_mtd || 0,
    total_profit_mtd: data?.total_profit_mtd || 0
  };
};
