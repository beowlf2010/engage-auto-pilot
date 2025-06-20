
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Clock, Send, X, Loader2, AlertTriangle, CheckCircle, XCircle, Check } from 'lucide-react';
import { useAIMessagePreview } from '@/hooks/useAIMessagePreview';

interface EnhancedAIPreviewProps {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  isOpen: boolean;
  onClose: () => void;
  onAIEnabled: () => void;
  autoGenerate?: boolean;
}

const EnhancedAIPreview: React.FC<EnhancedAIPreviewProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  isOpen,
  onClose,
  onAIEnabled,
  autoGenerate = false
}) => {
  const {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    debugInfo,
    overrides,
    generatePreview,
    sendNow,
    cancel,
    handleNameOverride,
    handleVehicleOverride,
    regenerateWithOverrides
  } = useAIMessagePreview({ 
    leadId, 
    onMessageSent: () => {
      onAIEnabled();
      onClose();
    }
  });

  // Auto-generate message when modal opens if autoGenerate is true
  useEffect(() => {
    if (isOpen && autoGenerate && !isGenerating && !generatedMessage) {
      generatePreview();
    }
  }, [isOpen, autoGenerate, isGenerating, generatedMessage, generatePreview]);

  const handleSendMessage = async () => {
    await sendNow();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  // Calculate next message time (24 hours from now) using milliseconds to prevent year rollover
  const nextMessageTime = new Date();
  nextMessageTime.setTime(nextMessageTime.getTime() + (24 * 60 * 60 * 1000));

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

  // Use finalDataQuality if overrides are applied, otherwise use original
  const displayDataQuality = debugInfo?.finalDataQuality || debugInfo?.dataQuality;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Enable AI for {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                <div className="text-sm text-gray-600">Analyzing data quality & generating message...</div>
              </div>
            </div>
          )}

          {!isGenerating && generatedMessage && (
            <>
              {/* Enhanced Data Quality Information with Override Controls */}
              {displayDataQuality && (
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
                            onClick={handleNameOverride}
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
                            onClick={handleVehicleOverride}
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
                            onClick={regenerateWithOverrides}
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
              )}

              {/* Message preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    AI Generated Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="text-sm">{generatedMessage}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling info */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">
                        Next AI message scheduled for:
                      </div>
                      <div className="text-green-700">
                        {nextMessageTime.toLocaleDateString()} at{' '}
                        {nextMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send & Enable AI
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSending}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          )}

          {!isGenerating && !generatedMessage && (
            <>
              {/* Introduction */}
              <div className="text-sm text-gray-600">
                Finn AI will analyze data quality and send a personalized initial message to {leadName} 
                {vehicleInterest && ` about their interest in ${vehicleInterest}`}.
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={generatePreview}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Generate Message
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAIPreview;
