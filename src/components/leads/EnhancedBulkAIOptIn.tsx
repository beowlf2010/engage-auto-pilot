import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  Users,
  Shield
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { assessLeadDataQuality, type DataQualityAssessment } from '@/services/unifiedDataQualityService';
import BatchControlDialog from './BatchControlDialog';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_interest?: string;
  ai_opt_in?: boolean;
}

interface QualityTier {
  leads: Lead[];
  assessments: Map<string, DataQualityAssessment>;
}

interface QualityBreakdown {
  highQuality: QualityTier;
  mediumQuality: QualityTier;
  poorQuality: QualityTier;
}

interface EnhancedBulkAIOptInProps {
  selectedLeads: Lead[];
  onComplete: () => void;
}

const EnhancedBulkAIOptIn: React.FC<EnhancedBulkAIOptInProps> = ({
  selectedLeads,
  onComplete
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [qualityBreakdown, setQualityBreakdown] = useState<QualityBreakdown | null>(null);
  const [selectedTierLeads, setSelectedTierLeads] = useState<Lead[]>([]);

  // Count how many leads don't have AI enabled
  const leadsWithoutAI = selectedLeads.filter(lead => !lead.ai_opt_in);

  const analyzeLeadQuality = async () => {
    setIsAnalyzing(true);
    
    try {
      const assessments = new Map<string, DataQualityAssessment>();
      
      // Analyze each lead
      for (const lead of leadsWithoutAI) {
        const assessment = await assessLeadDataQuality(
          lead.first_name,
          lead.vehicle_interest
        );
        assessments.set(lead.id, assessment);
      }

      // Categorize leads by quality
      const highQuality: QualityTier = { leads: [], assessments: new Map() };
      const mediumQuality: QualityTier = { leads: [], assessments: new Map() };
      const poorQuality: QualityTier = { leads: [], assessments: new Map() };

      for (const lead of leadsWithoutAI) {
        const assessment = assessments.get(lead.id)!;
        const { overallQualityScore } = assessment;

        if (overallQualityScore > 0.7) {
          highQuality.leads.push(lead);
          highQuality.assessments.set(lead.id, assessment);
        } else if (overallQualityScore >= 0.4) {
          mediumQuality.leads.push(lead);
          mediumQuality.assessments.set(lead.id, assessment);
        } else {
          poorQuality.leads.push(lead);
          poorQuality.assessments.set(lead.id, assessment);
        }
      }

      setQualityBreakdown({ highQuality, mediumQuality, poorQuality });
      setShowDialog(true);
    } catch (error) {
      console.error('Error analyzing lead quality:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze lead quality. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enableAIForTier = async (tiers: ('high' | 'medium' | 'poor')[]) => {
    if (!qualityBreakdown) return;

    const leadsToEnable: Lead[] = [];
    
    if (tiers.includes('high')) {
      leadsToEnable.push(...qualityBreakdown.highQuality.leads);
    }
    if (tiers.includes('medium')) {
      leadsToEnable.push(...qualityBreakdown.mediumQuality.leads);
    }
    if (tiers.includes('poor')) {
      leadsToEnable.push(...qualityBreakdown.poorQuality.leads);
    }

    if (leadsToEnable.length === 0) return;

    // Check if we should show batch control dialog
    const SAFE_BATCH_SIZE = 50;
    if (leadsToEnable.length > SAFE_BATCH_SIZE) {
      setSelectedTierLeads(leadsToEnable);
      setShowDialog(false);
      setShowBatchDialog(true);
      return;
    }

    // Process directly if small enough
    await processBatch(leadsToEnable.map(l => l.id));
  };

  const processBatch = async (leadIds: string[]) => {
    setIsEnabling(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: true,
          ai_stage: 'ready_for_contact',
          next_ai_send_at: new Date().toISOString(),
          ai_sequence_paused: false,
          ai_pause_reason: null
        })
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: "AI messaging enabled",
        description: `Successfully enabled AI messaging for ${leadIds.length} leads.`,
      });

      setShowDialog(false);
      setShowBatchDialog(false);
      onComplete();
      
    } catch (error) {
      console.error('Error enabling AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to enable AI messaging for selected leads",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const getCommonIssues = () => {
    if (!qualityBreakdown) return [];

    const issues: string[] = [];
    const { mediumQuality, poorQuality } = qualityBreakdown;
    
    const allProblematicLeads = [...mediumQuality.leads, ...poorQuality.leads];
    const genericVehicleCount = allProblematicLeads.filter(lead => {
      const assessment = mediumQuality.assessments.get(lead.id) || poorQuality.assessments.get(lead.id);
      return assessment?.vehicleValidation?.detectedIssue?.includes('Generic') || false;
    }).length;

    const noVehicleCount = allProblematicLeads.filter(lead => {
      const assessment = mediumQuality.assessments.get(lead.id) || poorQuality.assessments.get(lead.id);
      return assessment?.vehicleValidation?.detectedIssue?.includes('No vehicle') || false;
    }).length;

    if (genericVehicleCount > 0) {
      issues.push(`${genericVehicleCount} leads have generic vehicle interests (e.g., "car", "truck")`);
    }
    if (noVehicleCount > 0) {
      issues.push(`${noVehicleCount} leads have no vehicle interest specified`);
    }

    return issues;
  };

  if (leadsWithoutAI.length === 0) {
    return null;
  }

  // Show warning for large selections
  const shouldShowWarning = leadsWithoutAI.length > 50;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={analyzeLeadQuality}
          disabled={isAnalyzing}
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Bot className="w-4 h-4 mr-2" />
          {isAnalyzing ? 'Analyzing Quality...' : `Smart Enable AI (${leadsWithoutAI.length})`}
        </Button>
        {shouldShowWarning && (
          <div className="relative group">
            <Shield className="w-4 h-4 text-orange-500" />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Large batch - will use batch controls
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Lead Quality Analysis
            </DialogTitle>
            <DialogDescription>
              We've analyzed the data quality of your selected leads to optimize AI messaging effectiveness.
            </DialogDescription>
          </DialogHeader>

          {qualityBreakdown && (
            <div className="space-y-4">
              {/* Batch size warning for large selections */}
              {leadsWithoutAI.length > 50 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Large selection detected:</strong> You have {leadsWithoutAI.length} leads selected. 
                    For safety, batches over 50 leads will be processed using our batch control system 
                    to prevent overwhelming recipients.
                  </AlertDescription>
                </Alert>
              )}

              {/* High Quality Tier */}
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">High Quality Leads</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {qualityBreakdown.highQuality.leads.length} leads
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-green-700 mb-2">
                  These leads have specific vehicle interests and valid names. Perfect for AI messaging.
                </p>
                {qualityBreakdown.highQuality.leads.length > 0 && (
                  <div className="text-xs text-green-600">
                    Examples: {qualityBreakdown.highQuality.leads.slice(0, 3).map(l => 
                      `${l.first_name} (${l.vehicle_interest})`
                    ).join(', ')}
                    {qualityBreakdown.highQuality.leads.length > 3 && '...'}
                  </div>
                )}
              </div>

              {/* Medium Quality Tier */}
              <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Medium Quality Leads</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {qualityBreakdown.mediumQuality.leads.length} leads
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-yellow-700">
                  These leads have either good names OR specific vehicle interests, but not both.
                </p>
              </div>

              {/* Poor Quality Tier */}
              <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Poor Quality Leads</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {qualityBreakdown.poorQuality.leads.length} leads
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-red-700 mb-2">
                  These leads have generic or missing information that may result in ineffective AI messaging.
                </p>
                {getCommonIssues().length > 0 && (
                  <div className="text-xs text-red-600">
                    Common issues: {getCommonIssues().join('; ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => enableAIForTier(['high'])}
                    disabled={isEnabling || qualityBreakdown.highQuality.leads.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Enable AI for High Quality Only ({qualityBreakdown.highQuality.leads.length})
                  </Button>
                  <span className="text-sm text-muted-foreground">Recommended</span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => enableAIForTier(['high', 'medium'])}
                  disabled={isEnabling || (qualityBreakdown.highQuality.leads.length + qualityBreakdown.mediumQuality.leads.length) === 0}
                  className="w-full"
                >
                  Enable AI for High + Medium Quality ({qualityBreakdown.highQuality.leads.length + qualityBreakdown.mediumQuality.leads.length})
                  {(qualityBreakdown.highQuality.leads.length + qualityBreakdown.mediumQuality.leads.length) > 50 && (
                    <span className="ml-2 text-xs text-orange-600">(Will use batch controls)</span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => enableAIForTier(['high', 'medium', 'poor'])}
                  disabled={isEnabling}
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                >
                  Enable AI for All Leads ({leadsWithoutAI.length})
                  {leadsWithoutAI.length > 50 ? (
                    <span className="ml-2 text-xs">(Will use batch controls)</span>
                  ) : (
                    <span className="ml-2 text-xs">- Not Recommended</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Control Dialog */}
      <BatchControlDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        leadsToProcess={selectedTierLeads}
        onProcessBatch={processBatch}
        isProcessing={isEnabling}
      />
    </>
  );
};

export default EnhancedBulkAIOptIn;