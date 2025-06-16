
import { Button } from "@/components/ui/button";
import { Eye, Car } from "lucide-react";
import { Link } from "react-router-dom";

interface ActionsCellProps {
  stockNumber?: string;
}

const ActionsCell = ({ stockNumber }: ActionsCellProps) => {
  return (
    <div className="flex items-center space-x-2">
      {stockNumber && (
        <Link to={`/vehicle-detail/${stockNumber}`}>
          <Button variant="outline" size="sm">
            <Car className="w-4 h-4" />
            <span className="sr-only">View Vehicle</span>
          </Button>
        </Link>
      )}
      <Button variant="outline" size="sm">
        <Eye className="w-4 h-4" />
        <span className="sr-only">View Deal Details</span>
      </Button>
    </div>
  );
};

export default ActionsCell;
