
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
    
    const historyEntries: VehicleHistoryEntry[] = vehicles.map(vehicle => ({
      vin: vehicle.vin,
      stock_number: vehicle.stock_number,
      gm_order_number: vehicle.gm_order_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      history_type: this.determineHistoryType(sourceReport),
      source_report: sourceReport,
      source_data: vehicle,
      upload_history_id: uploadHistoryId
    }));

    // Insert history entries in batches
    const batchSize = 100;
    for (let i = 0; i < historyEntries.length; i += batchSize) {
      const batch = historyEntries.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('vehicle_history')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting vehicle history batch:', error);
        throw error;
      }
    }

    console.log(`Successfully recorded ${historyEntries.length} vehicle history entries`);
  }

  async upsertVehicleMasterRecords(
    vehicles: InventoryItem[],
    sourceReport: string
  ): Promise<string[]> {
    console.log(`Upserting ${vehicles.length} vehicle master records from ${sourceReport}`);
    
    const masterIds: string[] = [];
    
    for (const vehicle of vehicles) {
      try {
        const { data, error } = await supabase
          .rpc('upsert_vehicle_master', {
            p_vin: vehicle.vin,
            p_stock_number: vehicle.stock_number,
            p_gm_order_number: vehicle.gm_order_number,
            p_make: vehicle.make,
            p_model: vehicle.model,
            p_year: vehicle.year,
            p_status: vehicle.status,
            p_source_report: sourceReport,
            p_data: vehicle
          });

        if (error) {
          console.error('Error upserting vehicle master:', error);
          continue;
        }

        if (data) {
          masterIds.push(data);
        }
      } catch (error) {
        console.error('Error in upsert_vehicle_master:', error);
      }
    }

    console.log(`Successfully upserted ${masterIds.length} vehicle master records`);
    return masterIds;
  }

  async detectDuplicates(uploadHistoryId: string): Promise<DuplicateDetectionResult> {
    console.log(`Detecting duplicates for upload: ${uploadHistoryId}`);
    
    try {
      const { data, error } = await supabase
        .rpc('detect_vehicle_duplicates', {
          p_upload_history_id: uploadHistoryId
        });

      if (error) {
        console.error('Error detecting duplicates:', error);
        throw error;
      }

      const duplicateCount = data || 0;

      // Fetch the detected duplicates
      const { data: duplicates, error: fetchError } = await supabase
        .from('vehicle_duplicates')
        .select('master_vehicle_id, duplicate_inventory_id, match_type, confidence_score')
        .eq('resolved', false)
        .in('duplicate_inventory_id', 
          await this.getInventoryIdsByUpload(uploadHistoryId)
        );

      if (fetchError) {
        console.error('Error fetching duplicates:', fetchError);
        throw fetchError;
      }

      console.log(`Detected ${duplicateCount} duplicates`);
      
      return {
        duplicateCount,
        duplicates: duplicates || []
      };
    } catch (error) {
      console.error('Error in duplicate detection:', error);
      return { duplicateCount: 0, duplicates: [] };
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

    return data || [];
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

  private async getInventoryIdsByUpload(uploadHistoryId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('id')
      .eq('upload_history_id', uploadHistoryId);

    if (error) {
      console.error('Error fetching inventory IDs:', error);
      return [];
    }

    return (data || []).map(item => item.id);
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
