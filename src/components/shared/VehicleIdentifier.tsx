
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Car, ExternalLink } from "lucide-react";

interface VehicleIdentifierProps {
  stockNumber?: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  showIcon?: boolean;
  showExternalIcon?: boolean;
  className?: string;
  variant?: "link" | "badge" | "text";
}

const VehicleIdentifier = ({
  stockNumber,
  vin,
  year,
  make,
  model,
  showIcon = false,
  showExternalIcon = false,
  className = "",
  variant = "link"
}: VehicleIdentifierProps) => {
  const identifier = stockNumber || vin;
  const vehicleTitle = year && make && model ? `${year} ${make} ${model}` : '';
  
  if (!identifier) {
    return <span className="text-slate-500">No Stock #</span>;
  }

  const content = (
    <span className={`flex items-center space-x-1 ${className}`}>
      {showIcon && <Car className="w-4 h-4" />}
      <span className="font-medium">{stockNumber ? `#${stockNumber}` : vin}</span>
      {vehicleTitle && <span className="text-sm text-slate-600">({vehicleTitle})</span>}
      {showExternalIcon && <ExternalLink className="w-3 h-3" />}
    </span>
  );

  if (variant === "text") {
    return content;
  }

  if (variant === "badge") {
    return (
      <Link to={`/vehicle-detail/${identifier}`}>
        <Badge variant="outline" className={`hover:bg-blue-50 cursor-pointer ${className}`}>
          {content}
        </Badge>
      </Link>
    );
  }

  return (
    <Link 
      to={`/vehicle-detail/${identifier}`}
      className={`text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      {content}
    </Link>
  );
};

export default VehicleIdentifier;
