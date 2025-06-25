
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataQualityIndicatorProps {
  leadId: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  onEditClick?: (leadId: string) => void;
}

const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  leadId,
  firstName,
  lastName,
  vehicleInterest,
  onEditClick
}) => {
  // This would normally check against original upload data
  // For now, we'll do some basic validation
  const hasValidName = firstName && lastName && firstName.length > 1 && lastName.length > 1;
  const hasValidVehicle = vehicleInterest && vehicleInterest !== 'Unknown' && vehicleInterest.length > 5;
  const hasGenericVehicle = vehicleInterest?.includes('Make Unknown') || vehicleInterest?.includes('Model Unknown');
  
  const getQualityScore = () => {
    let score = 0;
    if (hasValidName) score += 50;
    if (hasValidVehicle && !hasGenericVehicle) score += 50;
    return score;
  };

  const qualityScore = getQualityScore();
  
  const getQualityBadge = () => {
    if (qualityScore >= 80) {
      return { icon: CheckCircle, text: 'Good', color: 'bg-green-100 text-green-800' };
    }
    if (qualityScore >= 50) {
      return { icon: AlertTriangle, text: 'Needs Review', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { icon: AlertTriangle, text: 'Poor', color: 'bg-red-100 text-red-800' };
  };

  const quality = getQualityBadge();
  const Icon = quality.icon;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        <Badge className={`text-xs ${quality.color} border-0`}>
          {quality.text}
        </Badge>
      </div>
      
      <div className="text-xs text-gray-500">
        {qualityScore}% complete
      </div>
      
      {!hasValidName && (
        <div className="text-xs text-red-500">
          Name incomplete
        </div>
      )}
      
      {hasGenericVehicle && (
        <div className="text-xs text-orange-500">
          Vehicle generic
        </div>
      )}
      
      {onEditClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditClick(leadId)}
          className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit Data
        </Button>
      )}
    </div>
  );
};

export default DataQualityIndicator;
