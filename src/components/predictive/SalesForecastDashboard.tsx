
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, DollarSign, Target, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  generateSalesForecast, 
  getSalesForecasts, 
  calculateLeadConversionPredictions, 
  getLeadConversionPredictions,
  generatePipelineForecast,
  type SalesForecast,
  type LeadConversionPrediction,
  type PipelineForecast
} from '@/services/predictive/salesForecastingService';
import { useToast } from '@/hooks/use-toast';

const SalesForecastDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [predictions, setPredictions] = useState<LeadConversionPrediction[]>([]);
  const [pipelineForecasts, setPipelineForecasts] = useState<PipelineForecast[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [forecastData, predictionData, pipelineData] = await Promise.all([
        getSalesForecasts(selectedPeriod),
        getLeadConversionPredictions(),
        generatePipelineForecast()
      ]);

      setForecasts(forecastData);
      setPredictions(predictionData);
      setPipelineForecasts(pipelineData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load forecast data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewForecast = async () => {
    try {
      setGenerating(true);
      await Promise.all([
        generateSalesForecast(selectedPeriod),
        calculateLeadConversionPredictions()
      ]);
      
      await loadDashboardData();
      
      toast({
        title: "Success",
        description: "New forecasts generated successfully"
      });
    } catch (error) {
      console.error('Error generating forecasts:', error);
      toast({
        title: "Error",
        description: "Failed to generate new forecasts",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const currentForecast = forecasts[0];
  const highProbabilityLeads = predictions.filter(p => p.conversionProbability > 0.7);
  const hotLeads = predictions.filter(p => p.temperatureScore > 70);

  const forecastChartData = forecasts.slice(0, 12).reverse().map(f => ({
    date: new Date(f.forecastDate).toLocaleDateString(),
    revenue: f.predictedRevenue,
    units: f.predictedUnits,
    confidence: f.confidenceScore * 100
  }));

  const temperatureDistribution = [
    { name: 'Hot (70+)', value: predictions.filter(p => p.temperatureScore >= 70).length, color: '#ef4444' },
    { name: 'Warm (40-69)', value: predictions.filter(p => p.temperatureScore >= 40 && p.temperatureScore < 70).length, color: '#f59e0b' },
    { name: 'Cold (<40)', value: predictions.filter(p => p.temperatureScore < 40).length, color: '#3b82f6' }
  ];

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Forecasting</h1>
          <p className="text-gray-600">AI-powered sales predictions and pipeline analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <Button onClick={generateNewForecast} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Generate Forecast
          </Button>
        </div>
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
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-green-600">
                  ${currentForecast ? (currentForecast.predictedRevenue / 1000).toFixed(0) : 0}K
                </div>
                <div className="text-sm text-gray-600">Predicted Revenue</div>
                {currentForecast && (
                  <Badge variant="outline" className="mt-2">
                    {(currentForecast.confidenceScore * 100).toFixed(0)}% confidence
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-blue-600">
                  {currentForecast?.predictedUnits || 0}
                </div>
                <div className="text-sm text-gray-600">Predicted Units</div>
                <Badge variant="outline" className="mt-2">
                  {selectedPeriod}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600">
                  {highProbabilityLeads.length}
                </div>
                <div className="text-sm text-gray-600">High Probability Leads</div>
                <Badge variant="outline" className="mt-2">
                  &gt;70% chance
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-red-600">
                  {hotLeads.length}
                </div>
                <div className="text-sm text-gray-600">Hot Leads</div>
                <Badge variant="outline" className="mt-2">
                  Temperature &gt;70
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="forecasts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="forecasts">Revenue Forecasts</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
              <TabsTrigger value="predictions">Lead Predictions</TabsTrigger>
            </TabsList>

            <TabsContent value="forecasts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecast Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={forecastChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                      <Line yAxisId="right" type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={2} name="Confidence (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {currentForecast && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Forecast Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Forecast Factors</h4>
                        <ul className="space-y-1">
                          {currentForecast.forecastFactors.map((factor, index) => (
                            <li key={index} className="text-sm text-gray-600">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Period Details</h4>
                        <p className="text-sm text-gray-600">Period: {currentForecast.forecastPeriod}</p>
                        <p className="text-sm text-gray-600">Generated: {new Date(currentForecast.createdAt).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Confidence: {(currentForecast.confidenceScore * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Temperature Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={temperatureDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {temperatureDistribution.map((entry, index) => (
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
                    <CardTitle>Pipeline Forecasts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pipelineForecasts.slice(0, 5).map((forecast) => (
                        <div key={forecast.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {forecast.salespersonId ? `Salesperson ${forecast.salespersonId.slice(0, 8)}` : 'Overall'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {forecast.predictedCloses} predicted closes
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                ${(forecast.predictedRevenue / 1000).toFixed(0)}K
                              </p>
                              <Badge variant="outline">
                                {forecast.confidenceLevel} confidence
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>High-Value Lead Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Lead ID</th>
                          <th className="text-left p-2">Conversion Probability</th>
                          <th className="text-left p-2">Temperature</th>
                          <th className="text-left p-2">Predicted Value</th>
                          <th className="text-left p-2">Close Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.slice(0, 10).map((prediction) => (
                          <tr key={prediction.id} className="border-b">
                            <td className="p-2 font-mono text-sm">
                              {prediction.leadId.slice(0, 8)}...
                            </td>
                            <td className="p-2">
                              <Badge 
                                variant={prediction.conversionProbability > 0.7 ? "default" : "secondary"}
                              >
                                {(prediction.conversionProbability * 100).toFixed(0)}%
                              </Badge>
                            </td>
                            <td className="p-2">
                              <div className={`w-full bg-gray-200 rounded-full h-2`}>
                                <div 
                                  className={`h-2 rounded-full ${
                                    prediction.temperatureScore > 70 ? 'bg-red-500' :
                                    prediction.temperatureScore > 40 ? 'bg-yellow-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${prediction.temperatureScore}%` }}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              ${prediction.predictedSaleAmount ? (prediction.predictedSaleAmount / 1000).toFixed(0) : 0}K
                            </td>
                            <td className="p-2 text-sm">
                              {prediction.predictedCloseDate ? 
                                new Date(prediction.predictedCloseDate).toLocaleDateString() : 
                                'TBD'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default SalesForecastDashboard;
