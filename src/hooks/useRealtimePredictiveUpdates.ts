
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealtimePredictiveUpdatesProps {
  onSalesForecastUpdate: () => void;
  onInventoryDemandUpdate: () => void;
  onMarketIntelligenceUpdate: () => void;
}

export const useRealtimePredictiveUpdates = ({
  onSalesForecastUpdate,
  onInventoryDemandUpdate,
  onMarketIntelligenceUpdate
}: RealtimePredictiveUpdatesProps) => {
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  const handlePredictiveUpdate = useCallback((payload: any, table: string) => {
    console.log(`Predictive update for ${table}:`, payload);

    switch (table) {
      case 'sales_forecasts':
        onSalesForecastUpdate();
        toast({
          title: "📈 Sales Forecast Updated",
          description: "New sales predictions are available",
          duration: 3000,
        });
        break;
      case 'inventory_demand_predictions':
        onInventoryDemandUpdate();
        toast({
          title: "📦 Inventory Demand Updated",
          description: "Demand predictions have been recalculated",
          duration: 3000,
        });
        break;
      case 'market_intelligence':
        onMarketIntelligenceUpdate();
        toast({
          title: "🎯 Market Intelligence Updated",
          description: "New market insights available",
          duration: 3000,
        });
        break;
    }
  }, [onSalesForecastUpdate, onInventoryDemandUpdate, onMarketIntelligenceUpdate, toast]);

  useEffect(() => {
    if (channelRef.current) {
      try {
        console.log('Removing existing predictive analytics channel');
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error('Error removing existing channel:', error);
      }
      channelRef.current = null;
    }

    const channelName = `predictive-analytics-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_forecasts'
        },
        (payload) => handlePredictiveUpdate(payload, 'sales_forecasts')
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales_forecasts'
        },
        (payload) => handlePredictiveUpdate(payload, 'sales_forecasts')
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_demand_predictions'
        },
        (payload) => handlePredictiveUpdate(payload, 'inventory_demand_predictions')
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_demand_predictions'
        },
        (payload) => handlePredictiveUpdate(payload, 'inventory_demand_predictions')
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_intelligence'
        },
        (payload) => handlePredictiveUpdate(payload, 'market_intelligence')
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_intelligence'
        },
        (payload) => handlePredictiveUpdate(payload, 'market_intelligence')
      );

    channel.subscribe((status) => {
      console.log('Predictive analytics channel status:', status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        console.log('Predictive analytics channel subscribed successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Predictive analytics channel error');
        channelRef.current = null;
      } else if (status === 'CLOSED') {
        console.log('Predictive analytics channel closed');
        channelRef.current = null;
      }
    });

    return () => {
      if (channelRef.current) {
        try {
          console.log('Cleaning up predictive analytics channel');
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.error('Error removing predictive analytics channel:', error);
        }
      }
    };
  }, [handlePredictiveUpdate]);

  return null;
};
