
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { 
  calculateInventoryDemandPredictions,
  getInventoryDemandPredictions,
  getVehicleVelocityTracking,
  generateInventoryAlerts,
  type InventoryDemandPrediction,
  type VehicleVelocityTracking
} from '@/services/predictive/inventoryDemandService';
import { useToast } from '@/hooks/use-toast';
import InventoryMetricsCards from './inventory-demand/InventoryMetricsCards';
import InventoryChartsSection from './inventory-demand/InventoryChartsSection';
import InventoryAlertsSection from './inventory-demand/InventoryAlertsSection';

const InventoryDemandDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [predictions, setPredictions] = useState<InventoryDemandPrediction[]>([]);
  const [velocityData, setVelocityData] = useState<VehicleVelocityTracking[]>([]);
  const [alerts, setAlerts] = useState<{ slowMoving: any[], highDemand: any[], priceAdjustments: any[] }>({
    slowMoving: [],
    highDemand: [],
    priceAdjustments: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [predictionData, velocityTracking, alertData] = await Promise.all([
        getInventoryDemandPredictions(),
        getVehicleVelocityTracking(),
        generateInventoryAlerts()
      ]);

      setPredictions(predictionData);
      setVelocityData(velocityTracking);
      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory demand data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNewPredictions = async () => {
    try {
      setCalculating(true);
      await calculateInventoryDemandPredictions();
      await loadDashboardData();
      
      toast({
        title: "Success",
        description: "Inventory demand predictions updated successfully"
      });
    } catch (error) {
      console.error('Error calculating predictions:', error);
      toast({
        title: "Error",
        description: "Failed to calculate new predictions",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Demand Prediction</h1>
          <p className="text-gray-600">AI-powered inventory demand analysis and velocity tracking</p>
        </div>
        <Button onClick={calculateNewPredictions} disabled={calculating}>
          {calculating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Update Predictions
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <>
          <InventoryMetricsCards predictions={predictions} alerts={alerts} />
          <InventoryChartsSection predictions={predictions} velocityData={velocityData} />
          <InventoryAlertsSection alerts={alerts} />
        </>
      )}
    </div>
  );
};

export default InventoryDemandDashboard;
