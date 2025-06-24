
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Zap, Target, Users, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  enhancedProcessService, 
  SOURCE_BUCKET_CONFIGS, 
  LEAD_TYPE_OVERLAYS 
} from '@/services/enhancedProcessService';
import { 
  SourceBucket, 
  LeadTypeId, 
  LeadStatusNormalized, 
  ProcessAssignmentLogic 
} from '@/types/enhancedLeadProcess';

interface EnhancedProcessSelectorProps {
  leadId: string;
  leadSource?: string;
  leadType?: string;
  leadStatus?: string;
  currentProcessId?: string;
  onProcessAssigned: (processId: string, logic: ProcessAssignmentLogic) => void;
}

const EnhancedProcessSelector: React.FC<EnhancedProcessSelectorProps> = ({
  leadId,
  leadSource = '',
  leadType,
  leadStatus = 'new',
  currentProcessId,
  onProcessAssigned
}) => {
  const [selectedBucket, setSelectedBucket] = useState<SourceBucket | null>(null);
  const [selectedType, setSelectedType] = useState<LeadTypeId | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatusNormalized>('new');
  const [recommendation, setRecommendation] = useState<ProcessAssignmentLogic | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Generate recommendation on load and when inputs change
  useEffect(() => {
    const logic = enhancedProcessService.getRecommendedProcess(
      leadSource,
      leadType,
      leadStatus
    );
    setRecommendation(logic);
    
    // Auto-populate selections based on recommendation
    setSelectedBucket(logic.sourceBucket);
    setSelectedType(logic.leadType);
    setSelectedStatus(logic.status);
  }, [leadSource, leadType, leadStatus]);

  const handleAssignProcess = async () => {
    if (!selectedBucket || !selectedType || !recommendation) return;
    
    setIsAssigning(true);
    try {
      // Create the enhanced process template
      const processTemplate = await enhancedProcessService.createEnhancedProcess(
        selectedBucket,
        selectedType,
        selectedStatus
      );
      
      // Call parent handler
      onProcessAssigned(processTemplate.id, recommendation);
      
      toast({
        title: "Process Assigned",
        description: `Assigned ${processTemplate.name} with ${processTemplate.aggression}/5 aggression`,
      });
    } catch (error) {
      console.error('Error assigning process:', error);
      toast({
        title: "Error",
        description: "Failed to assign enhanced process",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const getAggressionColor = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || colors[3];
  };

  const bucketConfig = selectedBucket ? SOURCE_BUCKET_CONFIGS[selectedBucket] : null;
  const typeOverlay = selectedType ? LEAD_TYPE_OVERLAYS[selectedType] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Enhanced Process Assignment
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Recommendation */}
        {recommendation && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">AI Recommendation</span>
              <Badge className={getAggressionColor(bucketConfig?.aggression || 3)}>
                {bucketConfig?.aggression}/5 Aggression
              </Badge>
              <Badge variant="outline">
                {Math.round(recommendation.confidence * 100)}% Confidence
              </Badge>
            </div>
            <p className="text-sm text-purple-700">
              {bucketConfig?.name} + {typeOverlay?.name} approach based on "{leadSource}"
            </p>
          </div>
        )}

        {/* Source Bucket Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Source Bucket</label>
          <Select 
            value={selectedBucket || ''} 
            onValueChange={(value) => setSelectedBucket(value as SourceBucket)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source bucket" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SOURCE_BUCKET_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{config.name}</span>
                    <Badge className={getAggressionColor(config.aggression)}>
                      {config.aggression}/5
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bucketConfig && (
            <p className="text-xs text-gray-600">{bucketConfig.tone}</p>
          )}
        </div>

        {/* Lead Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Lead Type</label>
          <Select 
            value={selectedType || ''} 
            onValueChange={(value) => setSelectedType(value as LeadTypeId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select lead type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_TYPE_OVERLAYS).map(([key, overlay]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{overlay.name}</span>
                    <span className="text-xs text-gray-500">({overlay.typicalCTA})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeOverlay && (
            <p className="text-xs text-gray-600">{typeOverlay.talkingPoint}</p>
          )}
        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Lead Status</label>
          <Select 
            value={selectedStatus} 
            onValueChange={(value) => setSelectedStatus(value as LeadStatusNormalized)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New - Warm intro & discovery</SelectItem>
              <SelectItem value="working">Working - Drive next commitment</SelectItem>
              <SelectItem value="appt_set">Appointment Set - Confirm details</SelectItem>
              <SelectItem value="appt_done">Appointment Done - Next action</SelectItem>
              <SelectItem value="purchased">Purchased - Follow up & referral</SelectItem>
              <SelectItem value="lost">Lost - Graceful exit</SelectItem>
              <SelectItem value="lost_brief">Lost Brief - Minimal contact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Process Preview */}
        {bucketConfig && typeOverlay && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Process Preview</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Voice:</span>
                <p className="text-gray-600">{bucketConfig.voice}</p>
              </div>
              <div>
                <span className="font-medium">Primary CTA:</span>
                <p className="text-gray-600">{bucketConfig.primaryCTA}</p>
              </div>
              <div>
                <span className="font-medium">Talking Point:</span>
                <p className="text-gray-600">{typeOverlay.talkingPoint}</p>
              </div>
              <div>
                <span className="font-medium">Type CTA:</span>
                <p className="text-gray-600">{typeOverlay.typicalCTA}</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 border-t pt-2">
              Message Rules: ≤160 characters, ≤1 emoji, 08:00-19:00 send window
            </div>
          </div>
        )}

        {/* Assign Button */}
        <Button 
          onClick={handleAssignProcess}
          disabled={!selectedBucket || !selectedType || isAssigning}
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isAssigning ? 'Assigning Process...' : 'Assign Enhanced Process'}
        </Button>

        {/* Current Process Info */}
        {currentProcessId && (
          <div className="text-xs text-gray-500 text-center">
            Current: {currentProcessId}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedProcessSelector;
