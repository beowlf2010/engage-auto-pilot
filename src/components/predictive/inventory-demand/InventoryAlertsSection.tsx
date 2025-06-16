
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InventoryAlertsSectionProps {
  alerts: {
    slowMoving: any[];
    highDemand: any[];
    priceAdjustments: any[];
  };
}

const InventoryAlertsSection: React.FC<InventoryAlertsSectionProps> = ({ alerts }) => {
  return (
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
  );
};

export default InventoryAlertsSection;
