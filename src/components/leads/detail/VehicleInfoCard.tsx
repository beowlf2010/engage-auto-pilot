
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { LeadDetailData } from '@/services/leadDetailService';

interface VehicleInfoCardProps {
  lead: LeadDetailData;
}

const VehicleInfoCard = ({ lead }: VehicleInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Car className="w-5 h-5 mr-2" />
          Vehicle Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Interest:</span>
            <p className="text-sm">{lead.vehicleInterest}</p>
          </div>
          {lead.vehicleYear && (
            <div>
              <span className="text-sm font-medium text-gray-700">Year:</span>
              <p className="text-sm">{lead.vehicleYear}</p>
            </div>
          )}
          {lead.vehicleMake && (
            <div>
              <span className="text-sm font-medium text-gray-700">Make:</span>
              <p className="text-sm">{lead.vehicleMake}</p>
            </div>
          )}
          {lead.vehicleModel && (
            <div>
              <span className="text-sm font-medium text-gray-700">Model:</span>
              <p className="text-sm">{lead.vehicleModel}</p>
            </div>
          )}
          {lead.vehicleVIN && (
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">VIN:</span>
              <p className="text-sm font-mono">{lead.vehicleVIN}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleInfoCard;
