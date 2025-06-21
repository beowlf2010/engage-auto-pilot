
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
  nameDecision: 'approved' | 'denied' | '' | null;
  vehicleDecision: 'approved' | 'denied' | '' | null;
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
  const canGenerate = nameDecision !== null && nameDecision !== '' && vehicleDecision !== null && vehicleDecision !== '';

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
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Name: "{firstName}"</span>
              {nameValidation?.userOverride && (
                <Badge variant="outline" className="ml-2 text-green-600">
                  Previously {nameValidation.timesApproved > nameValidation.timesRejected ? 'Approved' : 'Denied'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              {nameValidation?.isValidPersonalName ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              AI: {Math.round((nameValidation?.confidence || 0) * 100)}%
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Detected as: <span className="font-medium">{nameValidation?.detectedType}</span>
            {nameValidation?.userOverride && (
              <span className="ml-2">
                (Seen {nameValidation.timesSeen} times, 
                 Approved {nameValidation.timesApproved}, 
                 Denied {nameValidation.timesRejected})
              </span>
            )}
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
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Vehicle: "{vehicleInterest || 'Not specified'}"</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              {vehicleValidation?.isValidVehicleInterest ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              AI: {Math.round((vehicleValidation?.confidence || 0) * 100)}%
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Detected issue: <span className="font-medium">{vehicleValidation?.detectedIssue}</span>
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
        <div className="pt-2">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? 'Generating Message...' : 'Generate Message with My Decisions'}
          </Button>
          {!canGenerate && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please make decisions for both name and vehicle to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationDecisionCard;
