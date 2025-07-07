
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assessLeadDataQuality, type DataQualityAssessment } from '@/services/unifiedDataQualityService';

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
  const [dataQuality, setDataQuality] = useState<DataQualityAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assessQuality = async () => {
      setIsLoading(true);
      try {
        const assessment = await assessLeadDataQuality(firstName, vehicleInterest);
        setDataQuality(assessment);
      } catch (error) {
        console.error('Error assessing data quality:', error);
        // Fallback to simple assessment if unified service fails
        setDataQuality({
          overallQualityScore: 0.5,
          nameValidation: {
            isValidPersonalName: Boolean(firstName && firstName.length > 1),
            confidence: 0.5,
            detectedType: 'unknown',
            suggestions: { useGenericGreeting: true }
          },
          vehicleValidation: {
            isValidVehicleInterest: Boolean(vehicleInterest && vehicleInterest.length > 5),
            confidence: 0.5,
            detectedIssue: 'Assessment failed'
          },
          messageStrategy: 'fully_generic',
          recommendations: {
            usePersonalGreeting: false,
            useSpecificVehicle: false
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    assessQuality();
  }, [firstName, vehicleInterest]);

  if (isLoading || !dataQuality) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-gray-300 rounded animate-pulse" />
          <Badge className="text-xs bg-gray-100 text-gray-500 border-0">
            Analyzing...
          </Badge>
        </div>
      </div>
    );
  }

  // Convert 0-1 score to percentage
  const qualityScore = Math.round(dataQuality.overallQualityScore * 100);
  
  const getQualityBadge = () => {
    if (qualityScore >= 80) {
      return { icon: CheckCircle, text: 'Excellent', color: 'bg-green-100 text-green-800' };
    }
    if (qualityScore >= 60) {
      return { icon: CheckCircle, text: 'Good', color: 'bg-green-100 text-green-800' };
    }
    if (qualityScore >= 40) {
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
        {qualityScore}% confidence
      </div>
      
      {!dataQuality.nameValidation.isValidPersonalName && (
        <div className="text-xs text-red-500">
          Name needs review
        </div>
      )}
      
      {!dataQuality.vehicleValidation.isValidVehicleInterest && dataQuality.vehicleValidation.detectedIssue !== 'None' && (
        <div className="text-xs text-orange-500">
          {dataQuality.vehicleValidation.detectedIssue}
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
