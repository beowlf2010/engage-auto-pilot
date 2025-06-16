
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { type InventoryDemandPrediction } from '@/services/predictive/inventoryDemandService';

interface InventoryMetricsCardsProps {
  predictions: InventoryDemandPrediction[];
  alerts: {
    slowMoving: any[];
    highDemand: any[];
    priceAdjustments: any[];
  };
}

const InventoryMetricsCards: React.FC<InventoryMetricsCardsProps> = ({ predictions, alerts }) => {
  const avgDaysToSell = Math.round(
    predictions.reduce((sum, p) => sum + (p.predictedDaysToSell || 0), 0) / predictions.length
  ) || 0;

  return (
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
            {avgDaysToSell}
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
  );
};

export default InventoryMetricsCards;
