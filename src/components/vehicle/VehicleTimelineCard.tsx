
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VehicleTimelineCardProps {
  vehicle: any;
}

const VehicleTimelineCard: React.FC<VehicleTimelineCardProps> = ({ vehicle }) => (
  <Card className="p-6">
    <div className="flex items-center space-x-2 mb-4">
      <Calendar className="w-5 h-5 text-slate-600" />
      <h3 className="text-lg font-medium text-slate-800">Timeline</h3>
    </div>
    <div className="space-y-3">
      {vehicle.first_seen_at && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">First Seen</span>
          <span className="text-sm font-medium text-slate-800">
            {formatDistanceToNow(new Date(vehicle.first_seen_at), { addSuffix: true })}
          </span>
        </div>
      )}
      {vehicle.last_seen_at && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Last Seen</span>
          <span className="text-sm font-medium text-slate-800">
            {formatDistanceToNow(new Date(vehicle.last_seen_at), { addSuffix: true })}
          </span>
        </div>
      )}
      {vehicle.sold_at && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Sold</span>
          <span className="text-sm font-medium text-slate-800">
            {formatDistanceToNow(new Date(vehicle.sold_at), { addSuffix: true })}
          </span>
        </div>
      )}
      {vehicle.days_in_inventory !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Days in Inventory</span>
          <span className="text-sm font-medium text-slate-800">
            {vehicle.days_in_inventory} days
          </span>
        </div>
      )}
      {vehicle.deals.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Total Deals</span>
          <span className="text-sm font-medium text-slate-800">
            {vehicle.deals.length}
          </span>
        </div>
      )}
      {vehicle.leads_count > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Linked Leads</span>
          <span className="text-sm font-medium text-slate-800">
            {vehicle.leads_count}
          </span>
        </div>
      )}
    </div>
  </Card>
);

export default VehicleTimelineCard;
