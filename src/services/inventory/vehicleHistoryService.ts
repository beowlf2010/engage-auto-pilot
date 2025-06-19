
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/utils/inventoryMapper';

export interface VehicleHistoryEntry {
  id?: string;
  vin?: string;
  stock_number?: string;
  gm_order_number?: string;
  make: string;
  model: string;
  year?: number;
  status: string;
  history_type: 'order' | 'inventory' | 'sale' | 'update';
  source_report: string;
  source_data: any;
  upload_history_id?: string;
  created_at?: string;
}

export interface VehicleMasterRecord {
  id?: string;
  vin?: string;
  stock_number?: string;
  gm_order_number?: string;
  make: string;
  model: string;
  year?: number;
  current_status: string;
  order_data?: any;
  inventory_data?: any;
  sale_data?: any;
  data_quality_score?: number;
}

export interface DuplicateDetectionResult {
  duplicateCount: number;
  duplicates: Array<{
    master_vehicle_id: string;
    duplicate_inventory_id: string;
    match_type: string;
    confidence_score: number;
  }>;
}

export class VehicleHistoryService {
  
  async recordVehicleHistory(
    vehicles: InventoryItem[],
    uploadHistoryId: string,
    sourceReport: string
  ): Promise<void> {
    console.log(`Recording vehicle history for ${vehicles.length} vehicles from ${sourceReport}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-history-processor', {
        body: {
          action: 'record_history',
          vehicles,
          uploadHistoryId,
          sourceReport
        }
      });

      if (error) {
        console.error('Error calling vehicle-history-processor:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to record vehicle history');
      }

      console.log(`Successfully recorded ${data.recorded} vehicle history entries`);
    } catch (error) {
      console.error('Error in recordVehicleHistory:', error);
      throw error;
    }
  }

  async upsertVehicleMasterRecords(
    vehicles: InventoryItem[],
    sourceReport: string
  ): Promise<string[]> {
    console.log(`Upserting ${vehicles.length} vehicle master records from ${sourceReport}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-history-processor', {
        body: {
          action: 'upsert_masters',
          vehicles,
          uploadHistoryId: '', // Not needed for this action
          sourceReport
        }
      });

      if (error) {
        console.error('Error calling vehicle-history-processor:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to upsert vehicle master records');
      }

      console.log(`Successfully upserted ${data.upserted} vehicle master records`);
      return data.masterIds || [];
    } catch (error) {
      console.error('Error in upsertVehicleMasterRecords:', error);
      return [];
    }
  }

  async detectDuplicates(uploadHistoryId: string): Promise<DuplicateDetectionResult> {
    console.log(`Detecting duplicates for upload: ${uploadHistoryId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-history-processor', {
        body: {
          action: 'detect_duplicates',
          uploadHistoryId
        }
      });

      if (error) {
        console.error('Error calling vehicle-history-processor:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('Duplicate detection failed:', data?.error);
        return { duplicateCount: 0, duplicates: [] };
      }

      console.log(`Detected ${data.duplicateCount} duplicates`);
      
      return {
        duplicateCount: data.duplicateCount,
        duplicates: data.duplicates || []
      };
    } catch (error) {
      console.error('Error in duplicate detection:', error);
      return { duplicateCount: 0, duplicates: [] };
    }
  }

  // Batch process all operations in a single call for better performance
  async processBatch(
    vehicles: InventoryItem[],
    uploadHistoryId: string,
    sourceReport: string
  ): Promise<{
    historyRecorded: number;
    masterRecordsUpserted: number;
    duplicatesDetected: number;
  }> {
    console.log(`Starting batch processing for ${vehicles.length} vehicles`);
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-history-processor', {
        body: {
          action: 'batch_process',
          vehicles,
          uploadHistoryId,
          sourceReport
        }
      });

      if (error) {
        console.error('Error calling vehicle-history-processor:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process batch');
      }

      console.log(`Batch processing complete:`, data);
      
      return {
        historyRecorded: data.historyRecorded || 0,
        masterRecordsUpserted: data.masterRecordsUpserted || 0,
        duplicatesDetected: data.duplicatesDetected || 0
      };
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }
  }

  async getVehicleHistory(vehicleId: string): Promise<VehicleHistoryEntry[]> {
    const { data, error } = await supabase
      .from('vehicle_history')
      .select('*')
      .or(`vin.eq.${vehicleId},stock_number.eq.${vehicleId},gm_order_number.eq.${vehicleId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle history:', error);
      throw error;
    }

    // Transform the data to match our interface with proper type casting
    return (data || []).map(item => ({
      ...item,
      history_type: item.history_type as 'order' | 'inventory' | 'sale' | 'update'
    }));
  }

  async getVehicleMasterRecord(vehicleId: string): Promise<VehicleMasterRecord | null> {
    const { data, error } = await supabase
      .from('vehicle_master')
      .select('*')
      .or(`vin.eq.${vehicleId},stock_number.eq.${vehicleId},gm_order_number.eq.${vehicleId}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching vehicle master record:', error);
      throw error;
    }

    return data;
  }

  private determineHistoryType(sourceReport: string): 'order' | 'inventory' | 'sale' | 'update' {
    if (sourceReport.includes('order') || sourceReport === 'gm_global') {
      return 'order';
    } else if (sourceReport.includes('sale') || sourceReport.includes('financial')) {
      return 'sale';
    } else if (sourceReport.includes('inventory') || sourceReport.includes('main_view')) {
      return 'inventory';
    } else {
      return 'update';
    }
  }
}

export const vehicleHistoryService = new VehicleHistoryService();
