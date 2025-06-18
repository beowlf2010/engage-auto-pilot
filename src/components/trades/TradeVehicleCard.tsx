
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Edit, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import type { TradeVehicle, TradeValuation } from '@/types/trade';

interface TradeVehicleCardProps {
  tradeVehicle: TradeVehicle;
  latestValuation?: TradeValuation;
  onEdit: () => void;
  onValue: () => void;
  onScheduleAppraisal: () => void;
}

const TradeVehicleCard = ({ tradeVehicle, latestValuation, onEdit, onValue, onScheduleAppraisal }: TradeVehicleCardProps) => {
  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'very_good': return 'bg-blue-100 text-blue-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-orange-100 text-orange-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCondition = (condition?: string) => {
    return condition?.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') || 'Unknown';
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="h-5 w-5" />
            <span>{tradeVehicle.year} {tradeVehicle.make} {tradeVehicle.model}</span>
          </div>
          <Badge className={getConditionColor(tradeVehicle.condition)}>
            {formatCondition(tradeVehicle.condition)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Trim:</span> {tradeVehicle.trim || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Mileage:</span> {tradeVehicle.mileage?.toLocaleString() || 'N/A'} miles
          </div>
          <div>
            <span className="font-medium">Exterior:</span> {tradeVehicle.exteriorColor || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Interior:</span> {tradeVehicle.interiorColor || 'N/A'}
          </div>
        </div>

        {tradeVehicle.vin && (
          <div className="text-sm">
            <span className="font-medium">VIN:</span> 
            <span className="font-mono ml-2">{tradeVehicle.vin}</span>
          </div>
        )}

        {(tradeVehicle.accidentHistory || tradeVehicle.liensOutstanding) && (
          <div className="flex items-center space-x-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {tradeVehicle.accidentHistory && 'Accident History'}
              {tradeVehicle.accidentHistory && tradeVehicle.liensOutstanding && ' • '}
              {tradeVehicle.liensOutstanding && 'Outstanding Liens'}
            </span>
          </div>
        )}

        {latestValuation && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-800">Latest Valuation</span>
              <Badge variant="outline" className="text-green-700">
                {latestValuation.valuationSource.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-green-700">Trade-in:</span> 
                <span className="font-medium ml-1">{formatCurrency(latestValuation.tradeInValue)}</span>
              </div>
              <div>
                <span className="text-green-700">Retail:</span> 
                <span className="font-medium ml-1">{formatCurrency(latestValuation.retailValue)}</span>
              </div>
            </div>
            {latestValuation.estimatedValue && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <span className="text-green-700">Our Estimate:</span> 
                <span className="font-bold ml-1 text-green-800">{formatCurrency(latestValuation.estimatedValue)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onValue}>
            <DollarSign className="h-4 w-4 mr-1" />
            {latestValuation ? 'Update Value' : 'Get Value'}
          </Button>
          <Button variant="outline" size="sm" onClick={onScheduleAppraisal}>
            <Calendar className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeVehicleCard;
