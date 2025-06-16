
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { 
  calculateInventoryDemandPredictions,
  getInventoryDemandPredictions,
  getVehicleVelocityTracking,
  generateInventoryAlerts,
  type InventoryDemandPrediction,
  type VehicleVelocityTracking
} from '@/services/predictive/inventoryDemandService';
import { useToast } from '@/hooks/use-toast';

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

  const demandDistribution = [
    { name: 'High Demand (70+)', value: predictions.filter(p => p.demandScore >= 70).length, color: '#22c55e' },
    { name: 'Medium Demand (40-69)', value: predictions.filter(p => p.demandScore >= 40 && p.demandScore < 70).length, color: '#f59e0b' },
    { name: 'Low Demand (<40)', value: predictions.filter(p => p.demandScore < 40).length, color: '#ef4444' }
  ];

  const velocityChartData = velocityData.slice(0, 15).map(v => ({
    vehicle: `${v.make} ${v.model}`,
    avgDays: v.avgDaysToSell,
    totalSold: v.totalSold,
    currentCount: v.currentInventoryCount
  }));

  const priceCompetitivenessData = [
    { name: 'Below Market', value: predictions.filter(p => p.priceCompetitiveness === 'below').length, color: '#22c55e' },
    { name: 'Market Price', value: predictions.filter(p => p.priceCompetitiveness === 'market').length, color: '#3b82f6' },
    { name: 'Above Market', value: predictions.filter(p => p.priceCompetitiveness === 'above').length, color: '#ef4444' }
  ];

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-green-600">
                  {predictions.filter(p => p.demandScore >= 70).length}
                </div>
                <div className="text-sm text-gray-600">High Demand Vehicles</div>
                <Badge variant="outline" className="mt-2">
                  Score ≥70
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-red-600">
                  {alerts.slowMoving.length}
                </div>
                <div className="text-sm text-gray-600">Slow Moving Units</div>
                <Badge variant="outline" className="mt-2">
                  Needs attention
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(predictions.reduce((sum, p) => sum + (p.predictedDaysToSell || 0), 0) / predictions.length) || 0}
                </div>
                <div className="text-sm text-gray-600">Avg Days to Sell</div>
                <Badge variant="outline" className="mt-2">
                  Predicted
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600">
                  {alerts.priceAdjustments.length}
                </div>
                <div className="text-sm text-gray-600">Price Adjustments</div>
                <Badge variant="outline" className="mt-2">
                  Recommended
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demand Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={demandDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {demandDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Competitiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priceCompetitivenessData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priceCompetitivenessData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Velocity Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={velocityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicle" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgDays" fill="#3b82f6" name="Avg Days to Sell" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Slow Moving Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slowMoving.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{item.year} {item.make} {item.model}</p>
                      <p className="text-sm text-gray-600">VIN: {item.vin?.slice(-6)}</p>
                      <p className="text-sm text-gray-600">{item.days_in_inventory} days in inventory</p>
                      <Badge variant="destructive" className="mt-1">
                        Demand Score: {item.demandScore}
                      </Badge>
                    </div>
                  ))}
                  {alerts.slowMoving.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No slow-moving inventory</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">High Demand Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.highDemand.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{item.year} {item.make} {item.model}</p>
                      <p className="text-sm text-gray-600">VIN: {item.vin?.slice(-6)}</p>
                      <p className="text-sm text-gray-600">Price: ${item.price?.toLocaleString()}</p>
                      <Badge variant="default" className="mt-1">
                        Demand Score: {item.demandScore}
                      </Badge>
                    </div>
                  ))}
                  {alerts.highDemand.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No high demand alerts</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Price Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.priceAdjustments.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="font-medium">{item.year} {item.make} {item.model}</p>
                      <p className="text-sm text-gray-600">Current: ${item.price?.toLocaleString()}</p>
                      <Badge 
                        variant={item.priceCompetitiveness === 'above' ? 'destructive' : 'default'}
                        className="mt-1"
                      >
                        {item.priceCompetitiveness} market
                      </Badge>
                    </div>
                  ))}
                  {alerts.priceAdjustments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No price adjustments needed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryDemandDashboard;
