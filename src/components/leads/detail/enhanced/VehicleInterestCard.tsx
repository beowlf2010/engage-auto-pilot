
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign } from "lucide-react";
import { LeadDetailData } from '@/services/leadDetailService';

interface VehicleInterestCardProps {
  lead: LeadDetailData;
}

const VehicleInterestCard = ({ lead }: VehicleInterestCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Car className="w-5 h-5 mr-2" />
          Vehicle Interest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Interest:</span>
          <p className="text-sm mt-1">{lead.vehicleInterest || 'Not specified'}</p>
        </div>
        
        {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
          <div>
            <span className="text-sm font-medium text-gray-700">Specific Vehicle:</span>
            <p className="text-sm mt-1">
              {[lead.vehicleYear, lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}
            </p>
          </div>
        )}

        {(lead.preferredPriceMin || lead.preferredPriceMax) && (
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <span className="text-sm font-medium text-gray-700">Budget Range:</span>
              <p className="text-sm">
                {lead.preferredPriceMin && `$${lead.preferredPriceMin.toLocaleString()}`}
                {lead.preferredPriceMin && lead.preferredPriceMax && ' - '}
                {lead.preferredPriceMax && `$${lead.preferredPriceMax.toLocaleString()}`}
              </p>
            </div>
          </div>
        )}

        {lead.vehicleVin && (
          <div>
            <span className="text-sm font-medium text-gray-700">VIN:</span>
            <p className="text-sm font-mono mt-1">{lead.vehicleVin}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleInterestCard;
