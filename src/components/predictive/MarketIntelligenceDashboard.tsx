
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { 
  generateMarketIntelligence,
  getMarketIntelligence,
  performCompetitiveAnalysis,
  getCompetitiveAnalysis,
  getMarketInsightsDashboard,
  type MarketIntelligence,
  type CompetitiveAnalysis
} from '@/services/predictive/marketIntelligenceService';
import { useToast } from '@/hooks/use-toast';

const MarketIntelligenceDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [intelligence, setIntelligence] = useState<MarketIntelligence[]>([]);
  const [competitive, setCompetitive] = useState<CompetitiveAnalysis[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [intelligenceData, competitiveData, dashboard] = await Promise.all([
        getMarketIntelligence(),
        getCompetitiveAnalysis(),
        getMarketInsightsDashboard()
      ]);

      setIntelligence(intelligenceData);
      setCompetitive(competitiveData);
      setDashboardData(dashboard);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load market intelligence data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewAnalysis = async () => {
    try {
      setGenerating(true);
      await Promise.all([
        generateMarketIntelligence(),
        performCompetitiveAnalysis()
      ]);
      
      await loadDashboardData();
      
      toast({
        title: "Success",
        description: "Market analysis updated successfully"
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate new analysis",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-600';
      case 'decreasing': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const currentIntelligence = intelligence[0];
  
  const trendData = intelligence.slice(0, 12).reverse().map(item => ({
    date: new Date(item.analysisDate).toLocaleDateString(),
    demandTrend: item.demandTrend === 'increasing' ? 1 : item.demandTrend === 'decreasing' ? -1 : 0,
    priceTrend: item.priceTrend === 'increasing' ? 1 : item.priceTrend === 'decreasing' ? -1 : 0,
    competitivePressure: item.competitivePressure === 'high' ? 3 : item.competitivePressure === 'moderate' ? 2 : 1
  }));

  const competitivePositioning = Object.entries(dashboardData?.competitivePositioning || {}).map(([key, value]) => ({
    position: key === 'below' ? 'Below Market' : key === 'above' ? 'Above Market' : 'At Market',
    count: value as number
  }));

  const radarData = currentIntelligence ? [
    {
      subject: 'Demand',
      value: currentIntelligence.demandTrend === 'increasing' ? 80 : currentIntelligence.demandTrend === 'stable' ? 60 : 40
    },
    {
      subject: 'Pricing',
      value: currentIntelligence.priceTrend === 'increasing' ? 80 : currentIntelligence.priceTrend === 'stable' ? 60 : 40
    },
    {
      subject: 'Inventory',
      value: currentIntelligence.inventoryLevels === 'low' ? 40 : currentIntelligence.inventoryLevels === 'normal' ? 60 : 80
    },
    {
      subject: 'Competition',
      value: currentIntelligence.competitivePressure === 'low' ? 80 : currentIntelligence.competitivePressure === 'moderate' ? 60 : 40
    },
    {
      subject: 'Seasonal',
      value: currentIntelligence.seasonalFactor * 80
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Intelligence</h1>
          <p className="text-gray-600">AI-powered market analysis and competitive insights</p>
        </div>
        <Button onClick={generateNewAnalysis} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Update Analysis
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
          {/* Key Trends */}
          {currentIntelligence && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Demand Trend</p>
                      <p className={`text-lg font-bold ${getTrendColor(currentIntelligence.demandTrend)}`}>
                        {currentIntelligence.demandTrend}
                      </p>
                    </div>
                    {getTrendIcon(currentIntelligence.demandTrend)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Price Trend</p>
                      <p className={`text-lg font-bold ${getTrendColor(currentIntelligence.priceTrend)}`}>
                        {currentIntelligence.priceTrend}
                      </p>
                    </div>
                    {getTrendIcon(currentIntelligence.priceTrend)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Inventory Levels</p>
                      <p className="text-lg font-bold">
                        {currentIntelligence.inventoryLevels}
                      </p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Competitive Pressure</p>
                      <p className="text-lg font-bold">
                        {currentIntelligence.competitivePressure}
                      </p>
                    </div>
                    <Badge variant={
                      currentIntelligence.competitivePressure === 'high' ? 'destructive' :
                      currentIntelligence.competitivePressure === 'moderate' ? 'default' : 'secondary'
                    }>
                      {currentIntelligence.competitivePressure}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[-1, 3]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="demandTrend" stroke="#22c55e" strokeWidth={2} name="Demand" />
                    <Line type="monotone" dataKey="priceTrend" stroke="#3b82f6" strokeWidth={2} name="Price" />
                    <Line type="monotone" dataKey="competitivePressure" stroke="#ef4444" strokeWidth={2} name="Competition" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Health Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Market Health" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Competitive Positioning</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={competitivePositioning}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="position" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Market Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <p>Total Inventory: {dashboardData.marketMetrics.totalInventory}</p>
                        <p>Average Price: ${dashboardData.marketMetrics.avgPrice?.toLocaleString()}</p>
                        <p>Seasonal Factor: {dashboardData.marketMetrics.seasonalFactor?.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Economic Indicators</h4>
                      {currentIntelligence && Object.keys(currentIntelligence.economicIndicators).length > 0 ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(currentIntelligence.economicIndicators).map(([key, value]) => (
                            <p key={key}>{key}: {String(value)}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No economic indicators available</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {currentIntelligence && currentIntelligence.recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {currentIntelligence.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No recommendations available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Competitive Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Competitive Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Vehicle</th>
                      <th className="text-left p-2">Our Price</th>
                      <th className="text-left p-2">Competitor Avg</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Market Share</th>
                      <th className="text-left p-2">Analysis Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitive.slice(0, 10).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">
                          {item.vehicleYear} {item.vehicleMake} {item.vehicleModel}
                        </td>
                        <td className="p-2">
                          ${item.ourPrice?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="p-2">
                          ${item.competitorAvgPrice?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="p-2">
                          <Badge variant={
                            item.pricePosition === 'above' ? 'destructive' :
                            item.pricePosition === 'below' ? 'default' : 'secondary'
                          }>
                            {item.pricePosition}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {(item.marketShareEstimate * 100).toFixed(1)}%
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(item.analysisDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MarketIntelligenceDashboard;
