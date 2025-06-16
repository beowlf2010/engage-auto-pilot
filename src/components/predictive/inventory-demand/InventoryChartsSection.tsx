
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { type InventoryDemandPrediction, type VehicleVelocityTracking } from '@/services/predictive/inventoryDemandService';

interface InventoryChartsSectionProps {
  predictions: InventoryDemandPrediction[];
  velocityData: VehicleVelocityTracking[];
}

const InventoryChartsSection: React.FC<InventoryChartsSectionProps> = ({ predictions, velocityData }) => {
  const demandDistribution = [
    { name: 'High Demand (70+)', value: predictions.filter(p => p.demandScore >= 70).length, color: '#22c55e' },
    { name: 'Medium Demand (40-69)', value: predictions.filter(p => p.demandScore >= 40 && p.demandScore < 70).length, color: '#f59e0b' },
    { name: 'Low Demand (<40)', value: predictions.filter(p => p.demandScore < 40).length, color: '#ef4444' }
  ];

  const priceCompetitivenessData = [
    { name: 'Below Market', value: predictions.filter(p => p.priceCompetitiveness === 'below').length, color: '#22c55e' },
    { name: 'Market Price', value: predictions.filter(p => p.priceCompetitiveness === 'market').length, color: '#3b82f6' },
    { name: 'Above Market', value: predictions.filter(p => p.priceCompetitiveness === 'above').length, color: '#ef4444' }
  ];

  const velocityChartData = velocityData.slice(0, 15).map(v => ({
    vehicle: `${v.make} ${v.model}`,
    avgDays: v.avgDaysToSell,
    totalSold: v.totalSold,
    currentCount: v.currentInventoryCount
  }));

  return (
    <>
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
    </>
  );
};

export default InventoryChartsSection;
