
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  getComplianceViolations,
  reviewComplianceViolation,
  type ComplianceViolation
} from '@/services/complianceMonitoringService';
import {
  getTrainingRecommendations,
  generateTrainingRecommendations,
  type TrainingRecommendation
} from '@/services/trainingRecommendationsService';

interface ComplianceQualityPanelProps {
  leadId: string;
  conversationId?: string;
}

const ComplianceQualityPanel = ({ leadId, conversationId }: ComplianceQualityPanelProps) => {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, [leadId, conversationId]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      
      // Fetch compliance violations
      const allViolations = await getComplianceViolations();
      const leadViolations = allViolations.filter(v => v.leadId === leadId);
      setViolations(leadViolations);

      // Fetch training recommendations
      const allRecommendations = await getTrainingRecommendations();
      setRecommendations(allRecommendations);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewViolation = async (violationId: string, status: 'resolved' | 'false_positive') => {
    try {
      const success = await reviewComplianceViolation(violationId, status, 'current-user');
      if (success) {
        await fetchComplianceData();
        toast({
          title: "Violation Reviewed",
          description: `Violation marked as ${status}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to review violation",
        variant: "destructive"
      });
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      await generateTrainingRecommendations('current-salesperson');
      await fetchComplianceData();
      toast({
        title: "Recommendations Generated",
        description: "New training recommendations have been created",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            Loading compliance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compliance Violations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Compliance Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              No compliance violations detected
            </div>
          ) : (
            <div className="space-y-3">
              {violations.map((violation) => (
                <div key={violation.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant={getSeverityColor(violation.severity)}>
                        {violation.severity}
                      </Badge>
                      <span className="ml-2 font-medium">{violation.violationType}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewViolation(violation.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewViolation(violation.id, 'false_positive')}
                      >
                        False Positive
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {violation.description}
                  </p>
                  <div className="text-xs bg-muted p-2 rounded">
                    <strong>Detected content:</strong> {violation.detectedContent}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Confidence: {Math.round(violation.confidenceScore * 100)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Training Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button onClick={handleGenerateRecommendations} className="w-full">
              Generate New Recommendations
            </Button>
            
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No training recommendations available
              </p>
            ) : (
              recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {rec.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {rec.skillsFocus.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceQualityPanel;
