
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  DollarSign,
  AlertTriangle,
  Target,
  Brain
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { calculateVehicleHotness, type VehicleIntelligence } from '@/services/inventory/ai/inventoryIntelligenceService';

interface VehicleHotnessScoreProps {
  vehicleId: string;
  compact?: boolean;
}

const getHotnessColor = (score: number) => {
  if (score >= 80) return 'bg-red-500 text-white';
  if (score >= 60) return 'bg-orange-500 text-white';
  if (score >= 40) return 'bg-yellow-500 text-black';
  return 'bg-blue-500 text-white';
};

const getHotnessIcon = (score: number) => {
  if (score >= 80) return <Zap className="w-3 h-3" />;
  if (score >= 60) return <TrendingUp className="w-3 h-3" />;
  if (score >= 40) return <Minus className="w-3 h-3" />;
  return <TrendingDown className="w-3 h-3" />;
};

const getPriceRecommendationIcon = (rec: string) => {
  switch (rec) {
    case 'increase':
      return <TrendingUp className="w-3 h-3 text-green-600" />;
    case 'decrease':
      return <TrendingDown className="w-3 h-3 text-red-600" />;
    default:
      return <Minus className="w-3 h-3 text-gray-600" />;
  }
};

const getMarketPositionColor = (position: string) => {
  switch (position) {
    case 'hot':
      return 'text-red-600 bg-red-50';
    case 'warm':
      return 'text-orange-600 bg-orange-50';
    case 'cold':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const VehicleHotnessScore = ({ vehicleId, compact = false }: VehicleHotnessScoreProps) => {
  const { data: intelligence, isLoading } = useQuery({
    queryKey: ['vehicle-hotness', vehicleId],
    queryFn: () => calculateVehicleHotness(vehicleId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        {!compact && <span className="text-sm text-gray-500">Analyzing...</span>}
      </div>
    );
  }

  if (!intelligence) {
    return compact ? null : (
      <div className="flex items-center space-x-2 text-gray-500">
        <Brain className="w-4 h-4" />
        <span className="text-sm">No AI data</span>
      </div>
    );
  }

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-1">
            <Badge className={`${getHotnessColor(intelligence.hotnessScore)} flex items-center space-x-1`}>
              {getHotnessIcon(intelligence.hotnessScore)}
              <span>{intelligence.hotnessScore}</span>
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <VehicleIntelligenceDetails intelligence={intelligence} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardContent className="pt-4">
        <VehicleIntelligenceDetails intelligence={intelligence} />
      </CardContent>
    </Card>
  );
};

const VehicleIntelligenceDetails = ({ intelligence }: { intelligence: VehicleIntelligence }) => {
  return (
    <div className="space-y-4">
      {/* Hotness Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <span className="font-medium">AI Hotness Score</span>
        </div>
        <Badge className={`${getMarketPositionColor(intelligence.marketPosition)}`}>
          {intelligence.hotnessScore}/100 - {intelligence.marketPosition}
        </Badge>
      </div>

      {/* Predictions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <div>
            <p className="text-xs text-gray-600">Est. Days to Sell</p>
            <p className="font-medium">{intelligence.predictedDaysToSell}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <div>
            <p className="text-xs text-gray-600">Price Action</p>
            <div className="flex items-center space-x-1">
              {getPriceRecommendationIcon(intelligence.priceRecommendation)}
              <span className="font-medium capitalize">{intelligence.priceRecommendation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Analysis */}
      <div className="border-t pt-3">
        <p className="font-medium text-sm mb-2">Market Analysis</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Market Price:</span>
            <span>${intelligence.competitiveAnalysis.avgMarketPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Position:</span>
            <Badge variant="outline" className="text-xs">
              {intelligence.competitiveAnalysis.pricePosition} market
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Demand:</span>
            <Badge variant="outline" className="text-xs">
              {intelligence.competitiveAnalysis.marketDemand}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Recommendations */}
      {intelligence.actionRecommendations.length > 0 && (
        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2 flex items-center space-x-1">
            <Target className="w-3 h-3" />
            <span>Recommendations</span>
          </p>
          <ul className="space-y-1">
            {intelligence.actionRecommendations.slice(0, 3).map((rec, index) => (
              <li key={index} className="text-xs text-gray-700 flex items-start space-x-1">
                <span className="text-purple-600">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Factors */}
      {intelligence.riskFactors.length > 0 && (
        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2 flex items-center space-x-1 text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Risk Factors</span>
          </p>
          <ul className="space-y-1">
            {intelligence.riskFactors.map((risk, index) => (
              <li key={index} className="text-xs text-orange-700 flex items-start space-x-1">
                <span className="text-orange-600">⚠</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VehicleHotnessScore;
