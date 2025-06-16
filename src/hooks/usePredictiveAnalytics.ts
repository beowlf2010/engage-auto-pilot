
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getSalesForecasts,
  type SalesForecast
} from '@/services/predictive/salesForecastingService';
import { 
  getInventoryDemandPredictions,
  type InventoryDemandPrediction
} from '@/services/predictive/inventoryDemandService';
import { 
  getMarketIntelligence,
  type MarketIntelligence
} from '@/services/predictive/marketIntelligenceService';

interface PredictiveAnalyticsData {
  salesForecasts: SalesForecast[];
  inventoryDemandPredictions: InventoryDemandPrediction[];
  marketIntelligence: MarketIntelligence[];
  isLoading: boolean;
  error: string | null;
}

export const usePredictiveAnalytics = () => {
  const { toast } = useToast();
  const [data, setData] = useState<PredictiveAnalyticsData>({
    salesForecasts: [],
    inventoryDemandPredictions: [],
    marketIntelligence: [],
    isLoading: true,
    error: null
  });

  const loadData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [forecasts, demandPredictions, intelligence] = await Promise.allSettled([
        getSalesForecasts('monthly').catch(() => []),
        getInventoryDemandPredictions().catch(() => []),
        getMarketIntelligence().catch(() => [])
      ]);

      setData({
        salesForecasts: forecasts.status === 'fulfilled' ? forecasts.value : [],
        inventoryDemandPredictions: demandPredictions.status === 'fulfilled' ? demandPredictions.value : [],
        marketIntelligence: intelligence.status === 'fulfilled' ? intelligence.value : [],
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading predictive analytics data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data';
      
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      toast({
        title: "Error",
        description: "Failed to load predictive analytics data",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    refresh
  };
};
