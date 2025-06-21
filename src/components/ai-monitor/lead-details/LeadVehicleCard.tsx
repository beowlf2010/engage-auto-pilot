
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car } from 'lucide-react';

interface LeadVehicleCardProps {
  vehicleInterest: string;
}

const LeadVehicleCard: React.FC<LeadVehicleCardProps> = ({ vehicleInterest }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Car className="h-4 w-4" />
          Vehicle Interest
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{vehicleInterest}</p>
      </CardContent>
    </Card>
  );
};

export default LeadVehicleCard;
