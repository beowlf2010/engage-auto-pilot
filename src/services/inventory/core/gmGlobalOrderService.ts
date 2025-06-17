
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface GMGlobalOrder {
  id: string;
  gm_order_number: string;
  customer_name: string;
  estimated_delivery_date: string;
  actual_delivery_date?: string;
  make: string;
  model: string;
  year: number;
  status: string;
  gm_status_description?: string;
  delivery_variance_days?: number;
  is_overdue: boolean;
}

export interface OrderDeliveryStats {
  totalOrders: number;
  deliveredOnTime: number;
  deliveredLate: number;
  stillPending: number;
  averageVarianceDays: number;
}

// Get GM Global orders by delivery timeline
export const getGMOrdersByDeliveryTimeline = async (
  startDate?: string,
  endDate?: string
): Promise<GMGlobalOrder[]> => {
  try {
    const { data, error } = await supabase.rpc('get_gm_orders_by_delivery_timeline', {
      p_start_date: startDate || new Date().toISOString().split('T')[0],
      p_end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching GM orders by delivery timeline:', error);
    toast({
      title: "Error",
      description: "Failed to fetch GM Global orders",
      variant: "destructive"
    });
    return [];
  }
};

// Get delivery performance statistics
export const getDeliveryPerformanceStats = async (): Promise<OrderDeliveryStats> => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        gm_order_number,
        estimated_delivery_date,
        actual_delivery_date,
        delivery_variance_days
      `)
      .not('gm_order_number', 'is', null)
      .not('estimated_delivery_date', 'is', null);

    if (error) throw error;

    const orders = data || [];
    const totalOrders = orders.length;
    
    let deliveredOnTime = 0;
    let deliveredLate = 0;
    let stillPending = 0;
    let totalVariance = 0;
    let varianceCount = 0;

    orders.forEach(order => {
      if (order.actual_delivery_date) {
        if (order.delivery_variance_days <= 0) {
          deliveredOnTime++;
        } else {
          deliveredLate++;
        }
        
        if (order.delivery_variance_days !== null) {
          totalVariance += order.delivery_variance_days;
          varianceCount++;
        }
      } else {
        const estimatedDate = new Date(order.estimated_delivery_date);
        const today = new Date();
        if (estimatedDate < today) {
          deliveredLate++; // Overdue
        } else {
          stillPending++;
        }
      }
    });

    return {
      totalOrders,
      deliveredOnTime,
      deliveredLate,
      stillPending,
      averageVarianceDays: varianceCount > 0 ? totalVariance / varianceCount : 0
    };
  } catch (error) {
    console.error('Error fetching delivery performance stats:', error);
    return {
      totalOrders: 0,
      deliveredOnTime: 0,
      deliveredLate: 0,
      stillPending: 0,
      averageVarianceDays: 0
    };
  }
};

// Update delivery variance for all orders
export const updateDeliveryVariances = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('calculate_delivery_variance');
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Delivery variances updated successfully",
    });
  } catch (error) {
    console.error('Error updating delivery variances:', error);
    toast({
      title: "Error",
      description: "Failed to update delivery variances",
      variant: "destructive"
    });
  }
};

// Get orders for specific customer
export const getOrdersForCustomer = async (customerName: string) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .ilike('customer_name', `%${customerName}%`)
      .order('order_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    toast({
      title: "Error",
      description: "Failed to fetch customer orders",
      variant: "destructive"
    });
    return [];
  }
};

// Get overdue orders
export const getOverdueOrders = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .not('gm_order_number', 'is', null)
      .lt('estimated_delivery_date', today)
      .is('actual_delivery_date', null)
      .order('estimated_delivery_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching overdue orders:', error);
    toast({
      title: "Error",
      description: "Failed to fetch overdue orders",
      variant: "destructive"
    });
    return [];
  }
};
