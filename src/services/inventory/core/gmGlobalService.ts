
import { supabase } from '@/integrations/supabase/client';

export interface GMGlobalByStatus {
  available: number;
  inTransit: number;
  inProduction: number;
  placed: number;
}

export const getGMGlobalOrderCounts = async (): Promise<{ 
  gmGlobalData: any[], 
  gmGlobalByStatus: GMGlobalByStatus 
}> => {
  const { data: gmGlobalData } = await supabase
    .from('inventory')
    .select('status')
    .eq('source_report', 'orders_all');
  
  let gmGlobalAvailable = 0;
  let gmGlobalInProduction = 0;
  let gmGlobalInTransit = 0;
  let gmGlobalPlaced = 0;
  
  if (gmGlobalData) {
    gmGlobalData.forEach(vehicle => {
      const statusNum = parseInt(vehicle.status);
      
      if (statusNum === 6000) {
        gmGlobalAvailable++;
      } else if (statusNum >= 5000 && statusNum <= 5999) {
        gmGlobalAvailable++;
      } else if (statusNum >= 3800 && statusNum <= 4999) {
        gmGlobalInTransit++;
      } else if (statusNum >= 2500 && statusNum <= 3799) {
        gmGlobalInProduction++;
      } else if (statusNum >= 2000 && statusNum <= 2499) {
        gmGlobalPlaced++;
      }
    });
  }

  return {
    gmGlobalData: gmGlobalData || [],
    gmGlobalByStatus: {
      available: gmGlobalAvailable,
      inTransit: gmGlobalInTransit,
      inProduction: gmGlobalInProduction,
      placed: gmGlobalPlaced,
    }
  };
};
