
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { getInventoryForAIMessaging } from "@/services/inventory/inventoryQueries";
import type { LeadDetailData } from "@/services/leadDetailService";

interface InventoryValidationPanelProps {
  lead: LeadDetailData;
}

const InventoryValidationPanel: React.FC<InventoryValidationPanelProps> = ({ lead }) => {
  const [matchingInventory, setMatchingInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const inventory = await getInventoryForAIMessaging(lead.id);
        setMatchingInventory(inventory);
      } catch (error) {
        console.error('Error fetching matching inventory:', error);
        setMatchingInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [lead.id]);

  const hasMatchingInventory = matchingInventory.length > 0;
  const inventoryWithValidModels = matchingInventory.filter(v => v.model && v.model !== 'Unknown');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5" />
          Inventory Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-gray-600">Checking inventory...</div>
        ) : (
          <>
            {/* Inventory Status Alert */}
            <Alert className={hasMatchingInventory ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {hasMatchingInventory ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription className={hasMatchingInventory ? "text-green-800" : "text-red-800"}>
                  {hasMatchingInventory 
                    ? `${inventoryWithValidModels.length} matching vehicles available`
                    : "No matching inventory found"
                  }
                </AlertDescription>
              </div>
            </Alert>

            {/* Customer Interest */}
            <div className="space-y-2">
              <div className="font-medium text-sm">Customer Interest</div>
              <div className="text-sm bg-gray-100 p-2 rounded">
                {lead.vehicleInterest}
              </div>
              {(lead.vehicleMake || lead.vehicleModel || lead.vehicleYear) && (
                <div className="flex flex-wrap gap-1">
                  {lead.vehicleYear && <Badge variant="outline">{lead.vehicleYear}</Badge>}
                  {lead.vehicleMake && <Badge variant="outline">{lead.vehicleMake}</Badge>}
                  {lead.vehicleModel && <Badge variant="outline">{lead.vehicleModel}</Badge>}
                </div>
              )}
            </div>

            {/* Matching Inventory */}
            {inventoryWithValidModels.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Available Vehicles</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {inventoryWithValidModels.slice(0, 5).map((vehicle) => (
                    <div key={vehicle.id} className="text-sm p-2 bg-blue-50 rounded border">
                      <div className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      {vehicle.trim && (
                        <div className="text-gray-600">{vehicle.trim}</div>
                      )}
                      {vehicle.price && (
                        <div className="text-green-600 font-medium">
                          ${vehicle.price.toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Stock: {vehicle.stock_number} | VIN: {vehicle.vin?.slice(-6)}
                      </div>
                    </div>
                  ))}
                  {inventoryWithValidModels.length > 5 && (
                    <div className="text-xs text-gray-600 text-center">
                      +{inventoryWithValidModels.length - 5} more vehicles
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Safety Warning */}
            {!hasMatchingInventory && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>AI Safety Mode:</strong> No matching inventory found. AI will not claim specific vehicles are available.
                </AlertDescription>
              </Alert>
            )}

            {/* Inventory Issues */}
            {matchingInventory.length > inventoryWithValidModels.length && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {matchingInventory.length - inventoryWithValidModels.length} vehicles have missing/unknown model data
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryValidationPanel;
