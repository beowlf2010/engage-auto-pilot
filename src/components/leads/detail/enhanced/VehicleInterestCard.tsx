
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, DollarSign, Calendar, Wrench } from "lucide-react";
import type { LeadDetailData } from "@/services/leadDetailService";

interface VehicleInterestCardProps {
  lead: LeadDetailData;
}

const VehicleInterestCard: React.FC<VehicleInterestCardProps> = ({ lead }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5" />
          Vehicle Interest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Interest */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Looking For</div>
          <div className="text-lg font-medium">{lead.vehicleInterest}</div>
          
          {/* Specific Details */}
          {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
            <div className="flex flex-wrap gap-2">
              {lead.vehicleYear && (
                <Badge variant="outline">{lead.vehicleYear}</Badge>
              )}
              {lead.vehicleMake && (
                <Badge variant="outline">{lead.vehicleMake}</Badge>
              )}
              {lead.vehicleModel && (
                <Badge variant="outline">{lead.vehicleModel}</Badge>
              )}
            </div>
          )}
          
          {lead.vehicleVIN && (
            <div className="text-sm text-gray-600">
              VIN: {lead.vehicleVIN}
            </div>
          )}
        </div>

        {/* Price Preferences */}
        {(lead.preferredPriceMin || lead.preferredPriceMax) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">Price Range</span>
            </div>
            <div className="text-sm">
              {lead.preferredPriceMin && lead.preferredPriceMax ? (
                `${formatCurrency(lead.preferredPriceMin)} - ${formatCurrency(lead.preferredPriceMax)}`
              ) : lead.preferredPriceMin ? (
                `Starting at ${formatCurrency(lead.preferredPriceMin)}`
              ) : lead.preferredPriceMax ? (
                `Up to ${formatCurrency(lead.preferredPriceMax)}`
              ) : null}
            </div>
          </div>
        )}

        {/* Trade Vehicle Information */}
        {lead.hasTradeVehicle && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">Trade Vehicle</span>
            </div>
            {lead.tradeInVehicle && (
              <div className="text-sm">{lead.tradeInVehicle}</div>
            )}
            {lead.tradePayoffAmount && (
              <div className="text-sm text-gray-600">
                Payoff Amount: {formatCurrency(lead.tradePayoffAmount)}
              </div>
            )}
            <Badge variant="secondary" className="text-xs">Has Trade</Badge>
          </div>
        )}

        {/* Additional Preferences */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Additional Info</div>
          <div className="text-sm text-gray-600">
            Source: {lead.source}
          </div>
          <Badge variant="outline" className="text-xs">
            Status: {lead.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleInterestCard;
