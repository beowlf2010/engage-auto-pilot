
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Plus, DollarSign, TrendingUp } from 'lucide-react';
import TradeManagementSection from '../trades/TradeManagementSection';
import { getTradeVehiclesByLeadId } from '@/services/tradeVehicleService';
import type { TradeVehicle } from '@/types/trade';

interface TradeInfoPanelProps {
  leadId: string;
  leadName: string;
  hasTradeVehicle?: boolean;
}

const TradeInfoPanel = ({ leadId, leadName, hasTradeVehicle }: TradeInfoPanelProps) => {
  const [tradeVehicles, setTradeVehicles] = useState<TradeVehicle[]>([]);
  const [showFullManagement, setShowFullManagement] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradeVehicles();
  }, [leadId]);

  const loadTradeVehicles = async () => {
    try {
      setLoading(true);
      const vehicles = await getTradeVehiclesByLeadId(leadId);
      setTradeVehicles(vehicles);
    } catch (error) {
      console.error('Error loading trade vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showFullManagement) {
    return (
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowFullManagement(false)}
          className="mb-4"
        >
          ← Back to Summary
        </Button>
        <TradeManagementSection leadId={leadId} leadName={leadName} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Car className="h-5 w-5" />
            <span>Trade Information</span>
          </div>
          {tradeVehicles.length > 0 && (
            <Badge variant="secondary">{tradeVehicles.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
        ) : tradeVehicles.length === 0 ? (
          <div className="text-center py-4">
            <Car className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500 mb-3">No trade vehicles added</p>
            <Button size="sm" onClick={() => setShowFullManagement(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Trade Vehicle
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {tradeVehicles.slice(0, 2).map((vehicle) => (
                <div key={vehicle.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-gray-600">
                        {vehicle.mileage?.toLocaleString()} miles • {vehicle.condition}
                      </p>
                    </div>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              ))}
              
              {tradeVehicles.length > 2 && (
                <p className="text-xs text-gray-500 text-center">
                  +{tradeVehicles.length - 2} more vehicles
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button size="sm" onClick={() => setShowFullManagement(true)} className="flex-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                Manage Trades
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeInfoPanel;
