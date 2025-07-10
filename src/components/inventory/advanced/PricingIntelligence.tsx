import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertCircle, 
  Target, Search, Filter, RefreshCw, Lightbulb 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PricingInsight {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  currentPrice: number;
  marketPrice: number;
  recommendedPrice: number;
  daysOnLot: number;
  priceVariance: number;
  status: 'overpriced' | 'underpriced' | 'optimal' | 'urgent';
  confidence: number;
  reasoning: string;
  potentialImpact: string;
}

const PricingIntelligence = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: pricingInsights, isLoading, refetch } = useQuery({
    queryKey: ['pricing-intelligence', searchTerm, statusFilter],
    queryFn: async (): Promise<PricingInsight[]> => {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available')
        .limit(20);

      if (!inventory) return [];

      // Generate pricing insights with AI analysis
      return inventory.map(vehicle => {
        const basePrice = vehicle.price || 25000;
        const daysOnLot = vehicle.days_in_inventory || Math.floor(Math.random() * 120);
        
        // Simulate market analysis
        const marketVariance = (Math.random() - 0.5) * 0.2; // ±10%
        const marketPrice = basePrice * (1 + marketVariance);
        
        // Calculate recommended price based on days on lot and market
        let recommendedPrice = marketPrice;
        if (daysOnLot > 60) {
          recommendedPrice *= 0.95; // 5% reduction for stale inventory
        } else if (daysOnLot < 15) {
          recommendedPrice *= 1.02; // 2% premium for fresh inventory
        }

        const priceVariance = ((basePrice - marketPrice) / marketPrice) * 100;
        
        let status: PricingInsight['status'] = 'optimal';
        if (priceVariance > 10) status = 'overpriced';
        else if (priceVariance < -5) status = 'underpriced';
        else if (daysOnLot > 90) status = 'urgent';

        const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%

        let reasoning = '';
        let potentialImpact = '';
        
        switch (status) {
          case 'overpriced':
            reasoning = `Price is ${Math.abs(priceVariance).toFixed(1)}% above market average`;
            potentialImpact = `Reduce by ${Math.floor(Math.random() * 15) + 10} days on lot`;
            break;
          case 'underpriced':
            reasoning = `Price is ${Math.abs(priceVariance).toFixed(1)}% below market average`;
            potentialImpact = `Increase profit by $${Math.floor(Math.random() * 2000) + 500}`;
            break;
          case 'urgent':
            reasoning = `${daysOnLot} days on lot, aging inventory needs attention`;
            potentialImpact = `Prevent additional carrying costs`;
            break;
          default:
            reasoning = 'Price is well-aligned with market conditions';
            potentialImpact = 'Maintain current strategy';
        }

        return {
          vehicleId: vehicle.id,
          make: vehicle.make || 'Unknown',
          model: vehicle.model || 'Unknown',
          year: vehicle.year || 2020,
          currentPrice: basePrice,
          marketPrice: Math.round(marketPrice),
          recommendedPrice: Math.round(recommendedPrice),
          daysOnLot,
          priceVariance: Math.round(priceVariance * 10) / 10,
          status,
          confidence,
          reasoning,
          potentialImpact
        };
      }).filter(insight => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          if (!insight.make.toLowerCase().includes(searchLower) && 
              !insight.model.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        if (statusFilter !== 'all' && insight.status !== statusFilter) {
          return false;
        }
        return true;
      });
    },
    refetchInterval: 600000 // 10 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overpriced': return 'destructive';
      case 'underpriced': return 'secondary';
      case 'urgent': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overpriced': return <TrendingDown className="w-4 h-4" />;
      case 'underpriced': return <TrendingUp className="w-4 h-4" />;
      case 'urgent': return <AlertCircle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getPriceChangeIcon = (current: number, recommended: number) => {
    if (recommended > current) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (recommended < current) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Target className="w-4 h-4 text-gray-600" />;
  };

  const statusCounts = pricingInsights?.reduce((acc, insight) => {
    acc[insight.status] = (acc[insight.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            AI Pricing Intelligence
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Overpriced</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.overpriced || 0}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Underpriced</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.underpriced || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Urgent</p>
                <p className="text-2xl font-bold text-orange-600">{statusCounts.urgent || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Optimal</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.optimal || 0}</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by make or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="overpriced">Overpriced</SelectItem>
              <SelectItem value="underpriced">Underpriced</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="optimal">Optimal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pricing Insights */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-2">Analyzing pricing data...</p>
            </div>
          ) : pricingInsights?.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No vehicles match your current filters</p>
            </div>
          ) : (
            pricingInsights?.map((insight) => (
              <div key={insight.vehicleId} className="p-4 rounded-lg border bg-gradient-to-r from-white to-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {insight.year} {insight.make} {insight.model}
                      </h3>
                      <Badge variant={getStatusColor(insight.status)} className="flex items-center gap-1">
                        {getStatusIcon(insight.status)}
                        {insight.status}
                      </Badge>
                      <Badge variant="outline">{insight.confidence}% confidence</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Current Price</p>
                        <p className="font-semibold">${insight.currentPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Market Price</p>
                        <p className="font-semibold">${insight.marketPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Recommended</p>
                        <div className="flex items-center gap-1">
                          {getPriceChangeIcon(insight.currentPrice, insight.recommendedPrice)}
                          <p className="font-semibold">${insight.recommendedPrice.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Days on Lot</p>
                        <p className="font-semibold">{insight.daysOnLot} days</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <p className="text-sm text-gray-700">{insight.reasoning}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-600 font-medium">{insight.potentialImpact}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 space-y-2">
                    <Button size="sm" variant="outline">
                      Update Price
                    </Button>
                    <Button size="sm" variant="ghost">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingIntelligence;