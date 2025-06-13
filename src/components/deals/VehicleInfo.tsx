
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Car, Eye, AlertCircle } from "lucide-react";

interface Vehicle {
  id: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price?: number;
  status: string;
  condition: string;
}

interface VehicleInfoProps {
  vehicle?: Vehicle;
  stockNumber?: string;
}

const VehicleInfo = ({ vehicle, stockNumber }: VehicleInfoProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!vehicle && stockNumber) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Car className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-800">Vehicle Information</h3>
        </div>
        
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">Vehicle not found in inventory</p>
          <p className="text-sm text-slate-500 mb-4">Stock #: {stockNumber}</p>
          <p className="text-xs text-slate-400">This deal may be for a vehicle that was sold or is no longer in inventory</p>
        </div>
      </Card>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Car className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-800">Vehicle Information</h3>
        </div>
        <Link to={`/vehicle-detail/${vehicle.vin || stockNumber}`}>
          <Button variant="outline" size="sm" className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>View Full Detail</span>
          </Button>
        </Link>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-semibold text-slate-800">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h4>
            {vehicle.trim && (
              <p className="text-slate-600">{vehicle.trim}</p>
            )}
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(vehicle.status)}>
              {vehicle.status}
            </Badge>
            <div className="text-sm text-slate-500 mt-1">
              {vehicle.condition}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Stock Number:</span>
            <div className="font-medium">{stockNumber || 'N/A'}</div>
          </div>
          <div>
            <span className="text-slate-600">VIN:</span>
            <div className="font-medium font-mono text-xs">{vehicle.vin || 'N/A'}</div>
          </div>
          {vehicle.price && (
            <div>
              <span className="text-slate-600">List Price:</span>
              <div className="font-medium text-green-600">{formatPrice(vehicle.price)}</div>
            </div>
          )}
          <div>
            <span className="text-slate-600">Condition:</span>
            <div className="font-medium capitalize">{vehicle.condition}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VehicleInfo;
