
import { getActiveGMGlobalOrderCounts } from './activeInventoryService';

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
  // Use the active GM Global counting service to exclude sold vehicles
  return await getActiveGMGlobalOrderCounts();
};
