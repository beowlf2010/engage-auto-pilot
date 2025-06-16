
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Star, GraduationCap, RefreshCw } from 'lucide-react';
import ComplianceViolationCard from '@/components/compliance/ComplianceViolationCard';
import QualityScoreCard from '@/components/quality/QualityScoreCard';
import TrainingRecommendationCard from '@/components/training/TrainingRecommendationCard';
import { 
  getComplianceViolations, 
  reviewComplianceViolation,
  ComplianceViolation 
} from '@/services/complianceMonitoringService';
import { 
  getQualityScores, 
  generateQualityScore,
  ConversationQualityScore 
} from '@/services/qualityScoringService';
import { 
  getTrainingRecommendations,
  generateTrainingRecommendations,
  updateTrainingRecommendationStatus,
  TrainingRecommendation 
} from '@/services/trainingRecommendationsService';

interface ComplianceQualityPanelProps {
  leadId: string;
  conversationId?: string;
  salespersonId?: string;
}

const ComplianceQualityPanel = ({ leadId, conversationId, salespersonId }: ComplianceQualityPanelProps) => {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [qualityScores, setQualityScores] = useState<ConversationQualityScore[]>([]);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [leadId, salespersonId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load compliance violations
      const violationsData = await getComplianceViolations(leadId);
      setViolations(violationsData);

      // Load quality scores
      const qualityData = await getQualityScores(leadId);
      setQualityScores(qualityData);

      // Load training recommendations if salesperson is assigned
      if (salespersonId) {
        const recommendationsData = await getTrainingRecommendations(salespersonId);
        setRecommendations(recommendationsData);
      }
    } catch (error) {
      console.error('Error loading compliance and quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViolationReview = async (violationId: string, status: 'resolved' | 'false_positive') => {
    if (salespersonId) {
      const success = await reviewComplianceViolation(violationId, status, salespersonId);
      if (success) {
        setViolations(prev => 
          prev.map(v => 
            v.id === violationId 
              ? { ...v, status, reviewed: true, reviewedBy: salespersonId, reviewedAt: new Date().toISOString() }
              : v
          )
        );
      }
    }
  };

  const handleGenerateQualityScore = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const newScore = await generateQualityScore(conversationId, leadId);
      if (newScore) {
        setQualityScores(prev => [newScore, ...prev]);
      }
    } catch (error) {
      console.error('Error generating quality score:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!salespersonId) return;
    
    setLoading(true);
    try {
      const newRecommendations = await generateTrainingRecommendations(salespersonId);
      setRecommendations(prev => [...newRecommendations, ...prev]);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationStatusUpdate = async (
    recommendationId: string, 
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    const success = await updateTrainingRecommendationStatus(recommendationId, status);
    if (success) {
      setRecommendations(prev =>
        prev.map(r => 
          r.id === recommendationId 
            ? { ...r, completionStatus: status, updatedAt: new Date().toISOString() }
            : r
        )
      );
    }
  };

  const openViolations = violations.filter(v => v.status === 'open');
  const pendingRecommendations = recommendations.filter(r => r.completionStatus !== 'completed');

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Compliance & Quality
          </span>
          <div className="flex items-center gap-2">
            {openViolations.length > 0 && (
              <Badge variant="destructive">{openViolations.length} violations</Badge>
            )}
            {pendingRecommendations.length > 0 && (
              <Badge variant="secondary">{pendingRecommendations.length} recommendations</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="compliance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Compliance
              {openViolations.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {openViolations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training
              {pendingRecommendations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {pendingRecommendations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Compliance Violations</h3>
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {violations.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No compliance violations detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {violations.map(violation => (
                  <ComplianceViolationCard
                    key={violation.id}
                    violation={violation}
                    onReview={handleViolationReview}
                    showActions={violation.status === 'open'}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Quality Scores</h3>
              <div className="flex gap-2">
                {conversationId && (
                  <Button variant="outline" size="sm" onClick={handleGenerateQualityScore} disabled={loading}>
                    <Star className="h-3 w-3 mr-1" />
                    Analyze Quality
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {qualityScores.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No quality scores available</p>
                {conversationId && (
                  <Button 
                    variant="outline" 
                    className="mt-3" 
                    onClick={handleGenerateQualityScore}
                    disabled={loading}
                  >
                    Generate Quality Score
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {qualityScores.map(score => (
                  <QualityScoreCard key={score.id} qualityScore={score} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Training Recommendations</h3>
              <div className="flex gap-2">
                {salespersonId && (
                  <Button variant="outline" size="sm" onClick={handleGenerateRecommendations} disabled={loading}>
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {!salespersonId ? (
              <div className="text-center py-6 text-gray-500">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No salesperson assigned to view training recommendations</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No training recommendations available</p>
                <Button 
                  variant="outline" 
                  className="mt-3" 
                  onClick={handleGenerateRecommendations}
                  disabled={loading}
                >
                  Generate Recommendations
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map(recommendation => (
                  <TrainingRecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onStatusUpdate={handleRecommendationStatusUpdate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ComplianceQualityPanel;
