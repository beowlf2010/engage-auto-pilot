import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  Users
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [qualityBreakdown, setQualityBreakdown] = useState<QualityBreakdown | null>(null);

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

    setIsEnabling(true);
    try {
      const leadsToEnable: string[] = [];
      
      if (tiers.includes('high')) {
        leadsToEnable.push(...qualityBreakdown.highQuality.leads.map(l => l.id));
      }
      if (tiers.includes('medium')) {
        leadsToEnable.push(...qualityBreakdown.mediumQuality.leads.map(l => l.id));
      }
      if (tiers.includes('poor')) {
        leadsToEnable.push(...qualityBreakdown.poorQuality.leads.map(l => l.id));
      }

      if (leadsToEnable.length === 0) return;

      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_opt_in: true,
          ai_stage: 'ready_for_contact',
          next_ai_send_at: new Date().toISOString(),
          ai_sequence_paused: false,
          ai_pause_reason: null
        })
        .in('id', leadsToEnable);

      if (error) throw error;

      toast({
        title: "AI messaging enabled",
        description: `Successfully enabled AI messaging for ${leadsToEnable.length} leads.`,
      });

      setShowDialog(false);
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
      return assessment?.vehicleValidation.detectedIssue.includes('Generic');
    }).length;

    const noVehicleCount = allProblematicLeads.filter(lead => {
      const assessment = mediumQuality.assessments.get(lead.id) || poorQuality.assessments.get(lead.id);
      return assessment?.vehicleValidation.detectedIssue.includes('No vehicle');
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

  return (
    <>
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
                </Button>

                <Button
                  variant="outline"
                  onClick={() => enableAIForTier(['high', 'medium', 'poor'])}
                  disabled={isEnabling}
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                >
                  Enable AI for All Leads ({leadsWithoutAI.length}) - Not Recommended
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
    </>
  );
};

export default EnhancedBulkAIOptIn;