
import { getActiveVehicleCounts } from './activeInventoryService';

export interface VehicleCounts {
  totalVehicles: number;
  regularNewTotal: number;
  regularNewAvailable: number;
  usedTotal: number;
  usedAvailable: number;
  usedSold: number;
  soldVehicles: number;
}

export const getVehicleCounts = async (): Promise<VehicleCounts> => {
  // Use the active vehicle counting service to get accurate counts
  return await getActiveVehicleCounts();
};
