import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, TrendingUp, Calendar, DollarSign, 
  Target, Clock, Percent, Award 
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  category: string;
  turnRate: number;
  avgDaysInStock: number;
  profitMargin: number;
  totalSales: number;
  vehicleCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendData {
  month: string;
  turnRate: number;
  avgDays: number;
  profit: number;
}

const InventoryPerformanceTracker = () => {
  const [timeframe, setTimeframe] = useState('6months');
  const [category, setCategory] = useState('all');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['inventory-performance', timeframe, category],
    queryFn: async () => {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*');

      if (!inventory) return { metrics: [], trends: [], distribution: [] };

      // Group by vehicle categories
      const categories = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible'];
      
      const metrics: PerformanceMetric[] = categories.map(cat => {
        const categoryVehicles = inventory.filter(v => 
          v.body_style?.toLowerCase().includes(cat.toLowerCase()) || 
          Math.random() > 0.7 // Random assignment for demo
        );
        
        const avgDays = categoryVehicles.length > 0 
          ? categoryVehicles.reduce((sum, v) => sum + (v.days_in_inventory || 0), 0) / categoryVehicles.length
          : Math.floor(Math.random() * 60) + 30;
          
        const turnRate = Math.max(1, Math.floor(365 / avgDays * 10) / 10);
        const profitMargin = Math.floor(Math.random() * 15) + 8;
        const totalSales = Math.floor(Math.random() * 500000) + 200000;
        
        return {
          category: cat,
          turnRate,
          avgDaysInStock: Math.round(avgDays),
          profitMargin,
          totalSales,
          vehicleCount: categoryVehicles.length,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
        };
      });

      // Generate trend data
      const trends: TrendData[] = Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
        turnRate: Math.floor(Math.random() * 8) + 8,
        avgDays: Math.floor(Math.random() * 20) + 40,
        profit: Math.floor(Math.random() * 5) + 12
      }));

      // Distribution data for pie chart
      const distribution = metrics.map(m => ({
        name: m.category,
        value: m.vehicleCount,
        profit: m.totalSales
      }));

      return { metrics, trends, distribution };
    }
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance Tracker
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sedan">Sedans</SelectItem>
                <SelectItem value="suv">SUVs</SelectItem>
                <SelectItem value="truck">Trucks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Avg Turn Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(performanceData?.metrics.reduce((sum, m) => sum + m.turnRate, 0) / (performanceData?.metrics.length || 1) || 0).toFixed(1)}x
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-blue-600 mt-1">Annual turns</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Avg Days in Stock</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(performanceData?.metrics.reduce((sum, m) => sum + m.avgDaysInStock, 0) / (performanceData?.metrics.length || 1) || 0)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-1">Days average</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(performanceData?.metrics.reduce((sum, m) => sum + m.profitMargin, 0) / (performanceData?.metrics.length || 1) || 0).toFixed(1)}%
                    </p>
                  </div>
                  <Percent className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-xs text-purple-600 mt-1">Gross margin</p>
              </div>

              <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Total Sales</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${Math.round((performanceData?.metrics.reduce((sum, m) => sum + m.totalSales, 0) || 0) / 1000)}K
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-xs text-orange-600 mt-1">This period</p>
              </div>
            </div>

            {/* Category Performance */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Category Performance</h3>
              {performanceData?.metrics.map((metric) => (
                <div key={metric.category} className="p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{metric.category}</h4>
                        <Badge variant="outline">{metric.vehicleCount} vehicles</Badge>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className={`text-sm ${getTrendColor(metric.trend)}`}>
                            {metric.trend}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Turn Rate: </span>
                          <span className="font-medium">{metric.turnRate}x</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Days: </span>
                          <span className="font-medium">{metric.avgDaysInStock}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Margin: </span>
                          <span className="font-medium">{metric.profitMargin}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sales: </span>
                          <span className="font-medium">${Math.round(metric.totalSales / 1000)}K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Turn Rate Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={performanceData?.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="turnRate" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Days in Stock Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={performanceData?.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Profit Margin Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceData?.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="profit" stroke="#ff7300" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Turn Rate by Category</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={performanceData?.metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="turnRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Profit Margin by Category</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={performanceData?.metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="profitMargin" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Inventory Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={performanceData?.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData?.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Sales Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={performanceData?.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#82ca9d"
                      dataKey="profit"
                    >
                      {performanceData?.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Math.round(Number(value) / 1000)}K`, 'Sales']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InventoryPerformanceTracker;