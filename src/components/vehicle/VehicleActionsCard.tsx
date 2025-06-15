
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface VehicleActionsCardProps {
  stockNumber?: string;
  sourceReport?: string;
}

const VehicleActionsCard: React.FC<VehicleActionsCardProps> = ({ stockNumber, sourceReport }) => (
  <Card className="p-6">
    <h3 className="text-lg font-medium text-slate-800 mb-4">Actions</h3>
    <div className="space-y-2">
      {stockNumber && (
        <Link to={`/financial-dashboard?search=${stockNumber}`}>
          <Button className="w-full" variant="outline">
            View Financial Details
          </Button>
        </Link>
      )}
      <Button className="w-full" variant="outline">
        <Eye className="w-4 h-4 mr-2" />
        View Full Data
      </Button>
      {sourceReport && (
        <Button className="w-full" variant="outline">
          Source: {sourceReport.replace('_', ' ').toUpperCase()}
        </Button>
      )}
    </div>
  </Card>
);

export default VehicleActionsCard;
