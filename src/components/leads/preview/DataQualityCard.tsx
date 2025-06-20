
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, CheckCircle, XCircle, Check, AlertTriangle } from 'lucide-react';

interface DataQualityCardProps {
  displayDataQuality: any;
  debugInfo: any;
  overrides: any;
  isGenerating: boolean;
  onNameOverride: () => void;
  onVehicleOverride: () => void;
  onRegenerateWithOverrides: () => void;
}

const DataQualityCard: React.FC<DataQualityCardProps> = ({
  displayDataQuality,
  debugInfo,
  overrides,
  isGenerating,
  onNameOverride,
  onVehicleOverride,
  onRegenerateWithOverrides
}) => {
  const getQualityScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'personal_with_vehicle':
        return 'Personal greeting with specific vehicle';
      case 'personal_generic_vehicle':
        return 'Personal greeting with generic vehicle message';
      case 'generic_with_vehicle':
        return 'Generic greeting with specific vehicle';
      case 'fully_generic':
        return 'Fully generic greeting (data quality issues detected)';
      default:
        return strategy;
    }
  };

  if (!displayDataQuality) return null;

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-3">
        <div className="text-xs space-y-2">
          <div className="font-medium text-gray-700 flex items-center gap-2">
            <Bot className="w-3 h-3" />
            Data Quality Analysis
            {(overrides.nameApproved || overrides.vehicleApproved) && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                User Overrides Applied
              </Badge>
            )}
          </div>
          
          {/* Overall Quality Score */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Overall Quality Score:</span>
            <Badge 
              variant="outline" 
              className={getQualityScoreColor(displayDataQuality.overallQualityScore)}
            >
              {Math.round(displayDataQuality.overallQualityScore * 100)}% - {getQualityScoreLabel(displayDataQuality.overallQualityScore)}
            </Badge>
          </div>

          {/* Message Strategy */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Message Strategy:</span>
            <span className="font-medium text-blue-600 text-xs">
              {getStrategyDescription(displayDataQuality.messageStrategy)}
            </span>
          </div>

          {/* Name Analysis with Override Controls */}
          <div className="border-t pt-2">
            <div className="flex items-center gap-2 mb-1">
              {displayDataQuality.nameValidation.isValidPersonalName ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <span className="font-medium text-gray-700 text-xs">Name Analysis</span>
              {displayDataQuality.nameValidation.userOverride && (
                <Badge variant="outline" className="text-green-600 text-xs py-0">
                  User Approved
                </Badge>
              )}
            </div>
            <div className="text-gray-600 pl-5 mb-2">
              "{debugInfo.originalFirstName}" detected as: <span className="font-medium">{debugInfo.dataQuality.nameValidation.detectedType}</span>
              {' '}({Math.round(debugInfo.dataQuality.nameValidation.confidence * 100)}% confidence)
            </div>
            {!displayDataQuality.nameValidation.isValidPersonalName && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNameOverride}
                className="ml-5 h-6 text-xs px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                {overrides.nameApproved ? "Remove Override" : "Approve as Personal Name"}
              </Button>
            )}
          </div>

          {/* Vehicle Interest Analysis with Override Controls */}
          <div className="border-t pt-2">
            <div className="flex items-center gap-2 mb-1">
              {displayDataQuality.vehicleValidation.isValidVehicleInterest ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <span className="font-medium text-gray-700 text-xs">Vehicle Interest Analysis</span>
              {displayDataQuality.vehicleValidation.userOverride && (
                <Badge variant="outline" className="text-green-600 text-xs py-0">
                  User Approved
                </Badge>
              )}
            </div>
            <div className="text-gray-600 pl-5 mb-2">
              "{debugInfo.originalVehicleInterest || 'Not specified'}" - {debugInfo.dataQuality.vehicleValidation.detectedIssue}
              {' '}({Math.round(debugInfo.dataQuality.vehicleValidation.confidence * 100)}% confidence)
            </div>
            {debugInfo.dataQuality.vehicleValidation.detectedIssue === 'corruption' && (
              <div className="text-orange-600 font-medium pl-5 mt-1 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Corrupted vehicle data detected - using fallback message
              </div>
            )}
            {!displayDataQuality.vehicleValidation.isValidVehicleInterest && (
              <Button
                variant="outline"
                size="sm"
                onClick={onVehicleOverride}
                className="ml-5 h-6 text-xs px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                {overrides.vehicleApproved ? "Remove Override" : "Approve as Valid Vehicle"}
              </Button>
            )}
          </div>

          {/* Regenerate with overrides button */}
          {(overrides.nameApproved || overrides.vehicleApproved) && (
            <div className="border-t pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerateWithOverrides()}
                disabled={isGenerating}
                className="h-6 text-xs px-2"
              >
                🔄 Regenerate Message with Overrides
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataQualityCard;
