
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VehicleInfoCardProps {
  vehicle: any;
  getStatusColor?: (status: string) => string;
}

const VehicleInfoCard: React.FC<VehicleInfoCardProps> = ({ vehicle, getStatusColor }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-800">Vehicle Information</h3>
        <Badge className={getStatusColor ? getStatusColor(vehicle.status) : ""}>
          {vehicle.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">Year</p>
          <p className="text-slate-800">{vehicle.year}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Make</p>
          <p className="text-slate-800">{vehicle.make}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Model</p>
          <p className="text-slate-800">{vehicle.model}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Trim</p>
          <p className="text-slate-800">{vehicle.trim || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Body Style</p>
          <p className="text-slate-800">{vehicle.body_style || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Mileage</p>
          <p className="text-slate-800">
            {vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Exterior Color</p>
          <p className="text-slate-800">{vehicle.color_exterior || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Interior Color</p>
          <p className="text-slate-800">{vehicle.color_interior || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Engine</p>
          <p className="text-slate-800">{vehicle.engine || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Transmission</p>
          <p className="text-slate-800">{vehicle.transmission || 'N/A'}</p>
        </div>
      </div>
    </Card>
  );
};

export default VehicleInfoCard;
