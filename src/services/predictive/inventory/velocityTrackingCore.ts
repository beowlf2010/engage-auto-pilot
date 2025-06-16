
import { supabase } from '@/integrations/supabase/client';

export interface VehicleVelocityTracking {
  id: string;
  make: string;
  model: string;
  year?: number;
  bodyStyle?: string;
  avgDaysToSell: number;
  totalSold: number;
  currentInventoryCount: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  lastSaleDate?: string;
  createdAt: string;
  updatedAt: string;
}

const isValidVelocityTrend = (trend: string): trend is 'increasing' | 'stable' | 'decreasing' => {
  return ['increasing', 'stable', 'decreasing'].includes(trend);
};

// Get vehicle velocity tracking data
export const getVehicleVelocityTracking = async (): Promise<VehicleVelocityTracking[]> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_velocity_tracking')
      .select('*')
      .order('avg_days_to_sell', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      make: item.make,
      model: item.model,
      year: item.year,
      bodyStyle: item.body_style,
      avgDaysToSell: item.avg_days_to_sell,
      totalSold: item.total_sold,
      currentInventoryCount: item.current_inventory_count,
      velocityTrend: isValidVelocityTrend(item.velocity_trend) ? item.velocity_trend : 'stable',
      lastSaleDate: item.last_sale_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting vehicle velocity tracking:', error);
    return [];
  }
};
