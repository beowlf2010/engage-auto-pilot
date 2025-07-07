
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ThumbsUp, ThumbsDown, Brain } from 'lucide-react';

interface ValidationDecisionCardProps {
  firstName: string;
  vehicleInterest: string;
  nameValidation: any;
  vehicleValidation: any;
  nameDecision: 'approved' | 'denied' | '';
  vehicleDecision: 'approved' | 'denied' | '';
  onNameDecision: (decision: 'approved' | 'denied') => void;
  onVehicleDecision: (decision: 'approved' | 'denied') => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const ValidationDecisionCard: React.FC<ValidationDecisionCardProps> = ({
  firstName,
  vehicleInterest,
  nameValidation,
  vehicleValidation,
  nameDecision,
  vehicleDecision,
  onNameDecision,
  onVehicleDecision,
  onGenerate,
  isGenerating
}) => {
  // Fixed logic to properly check for valid decisions
  const canGenerate = nameDecision !== '' && vehicleDecision !== '' && nameDecision !== null && vehicleDecision !== null;

  // Safe access with fallbacks
  const safeFirstName = firstName || 'Unknown';
  const safeVehicleInterest = vehicleInterest || 'Not specified';
  const nameConfidence = nameValidation?.confidence || 0;
  const vehicleConfidence = vehicleValidation?.confidence || 0;
  const nameIsValid = nameValidation?.isValidPersonalName ?? false;
  const vehicleIsValid = vehicleValidation?.isValidVehicleInterest ?? false;

  // Validation thresholds and status
  const NAME_THRESHOLD = 0.6;
  const VEHICLE_THRESHOLD = 0.6;
  const namePassesThreshold = nameConfidence >= NAME_THRESHOLD;
  const vehiclePassesThreshold = vehicleConfidence >= VEHICLE_THRESHOLD;

  // Determine border colors based on validation status
  const getValidationBorderColor = (isValid: boolean, passesThreshold: boolean) => {
    if (isValid && passesThreshold) return 'border-green-200 bg-green-50/30';
    if (!isValid || !passesThreshold) return 'border-amber-200 bg-amber-50/30';
    return 'border-gray-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-4 h-4 text-blue-600" />
          Review & Approve Data Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name Decision */}
        <div className={`rounded-lg p-3 space-y-3 border-2 transition-colors ${getValidationBorderColor(nameIsValid, namePassesThreshold)}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Name: "{safeFirstName}"</span>
              {nameValidation?.userOverride && (
                <Badge variant="outline" className="ml-2 text-green-600">
                  Previously {nameValidation.timesApproved > nameValidation.timesRejected ? 'Approved' : 'Denied'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                {nameIsValid && namePassesThreshold ? (
                  <div className="flex items-center gap-1 text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    PASSES
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                    <XCircle className="w-4 h-4" />
                    REVIEW
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                AI: {Math.round(nameConfidence * 100)}%
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Detected as: <span className="font-medium">{nameValidation?.detectedType || 'Unknown'}</span>
              {nameValidation?.userOverride && (
                <span className="ml-2">
                  (Seen {nameValidation.timesSeen || 0} times, 
                   Approved {nameValidation.timesApproved || 0}, 
                   Denied {nameValidation.timesRejected || 0})
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Threshold: ≥{Math.round(NAME_THRESHOLD * 100)}%
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={nameDecision === 'approved' ? 'default' : 'outline'}
              onClick={() => onNameDecision('approved')}
              className="flex-1"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Approve as Personal Name
            </Button>
            <Button
              size="sm"
              variant={nameDecision === 'denied' ? 'destructive' : 'outline'}
              onClick={() => onNameDecision('denied')}
              className="flex-1"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              Deny (Not Personal)
            </Button>
          </div>
        </div>

        {/* Vehicle Decision */}
        <div className={`rounded-lg p-3 space-y-3 border-2 transition-colors ${getValidationBorderColor(vehicleIsValid, vehiclePassesThreshold)}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Vehicle: "{safeVehicleInterest}"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm">
                {vehicleIsValid && vehiclePassesThreshold ? (
                  <div className="flex items-center gap-1 text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    PASSES
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                    <XCircle className="w-4 h-4" />
                    REVIEW
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                AI: {Math.round(vehicleConfidence * 100)}%
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Detected issue: <span className="font-medium">{vehicleValidation?.detectedIssue || 'None'}</span>
            </div>
            <div className="text-xs text-gray-500">
              Threshold: ≥{Math.round(VEHICLE_THRESHOLD * 100)}%
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={vehicleDecision === 'approved' ? 'default' : 'outline'}
              onClick={() => onVehicleDecision('approved')}
              className="flex-1"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              Approve Vehicle Interest
            </Button>
            <Button
              size="sm"
              variant={vehicleDecision === 'denied' ? 'destructive' : 'outline'}
              onClick={() => onVehicleDecision('denied')}
              className="flex-1"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              Deny (Use Generic)
            </Button>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={onGenerate}
              disabled={!canGenerate || isGenerating}
              className="flex-1"
              size="lg"
            >
              {isGenerating ? 'Generating Message...' : 'Generate Message with My Decisions'}
            </Button>
          </div>
          {!canGenerate && (
            <p className="text-sm text-gray-500 text-center">
              Please make decisions for both name and vehicle to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationDecisionCard;
