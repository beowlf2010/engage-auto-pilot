
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, BookOpen, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import QualityMetricsCards from './QualityMetricsCards';
import ComplianceMonitoringPanel from './ComplianceMonitoringPanel';
import TrainingRecommendationsPanel from './TrainingRecommendationsPanel';
import MessageQualityAnalysis from './MessageQualityAnalysis';

interface QualityMetrics {
  totalQualityScores: number;
  avgQualityScore: number;
  complianceViolations: number;
  trainingRecommendations: number;
  messagesReviewed: number;
  autoApprovalRate: number;
}

const QualityControlDashboard = () => {
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalQualityScores: 0,
    avgQualityScore: 0,
    complianceViolations: 0,
    trainingRecommendations: 0,
    messagesReviewed: 0,
    autoApprovalRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchQualityMetrics();
    const interval = setInterval(fetchQualityMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchQualityMetrics = async () => {
    try {
      // Get conversation quality scores
      const { data: qualityScores } = await supabase
        .from('conversation_quality_scores')
        .select('overall_score')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get compliance violations
      const { data: violations } = await supabase
        .from('compliance_violations')
        .select('id')
        .eq('status', 'open');

      // Get training recommendations
      const { data: recommendations } = await supabase
        .from('training_recommendations')
        .select('id')
        .eq('completion_status', 'pending');

      // Calculate metrics
      const totalScores = qualityScores?.length || 0;
      const avgScore = totalScores > 0 
        ? qualityScores.reduce((sum, score) => sum + score.overall_score, 0) / totalScores 
        : 0;

      setMetrics({
        totalQualityScores: totalScores,
        avgQualityScore: Math.round(avgScore * 10) / 10,
        complianceViolations: violations?.length || 0,
        trainingRecommendations: recommendations?.length || 0,
        messagesReviewed: totalScores,
        autoApprovalRate: avgScore >= 7.0 ? 85 : 65
      });
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityStatus = () => {
    if (metrics.avgQualityScore >= 8.0) return { color: 'text-green-600', label: 'Excellent', variant: 'default' as const };
    if (metrics.avgQualityScore >= 7.0) return { color: 'text-blue-600', label: 'Good', variant: 'secondary' as const };
    if (metrics.avgQualityScore >= 6.0) return { color: 'text-yellow-600', label: 'Fair', variant: 'outline' as const };
    return { color: 'text-red-600', label: 'Needs Improvement', variant: 'destructive' as const };
  };

  const qualityStatus = getQualityStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality Control Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor AI message quality, compliance, and training recommendations
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={qualityStatus.variant} className="flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>{qualityStatus.label}</span>
          </Badge>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>{metrics.autoApprovalRate}% Auto-Approved</span>
          </Badge>
          
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quality Status Alert */}
      {metrics.complianceViolations > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{metrics.complianceViolations} compliance violations</strong> require immediate attention.
            Review the compliance monitoring panel below.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <QualityMetricsCards metrics={metrics} loading={loading} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Training</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Quality Trend (7 days)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Quality Score</span>
                    <span className={`font-bold ${qualityStatus.color}`}>
                      {metrics.avgQualityScore}/10
                    </span>
                  </div>
                  <Progress value={metrics.avgQualityScore * 10} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="text-2xl font-bold">{metrics.messagesReviewed}</div>
                      <div className="text-xs text-muted-foreground">Messages Reviewed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{metrics.autoApprovalRate}%</div>
                      <div className="text-xs text-muted-foreground">Auto-Approval Rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Review Compliance Violations ({metrics.complianceViolations})
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Training Recommendations ({metrics.trainingRecommendations})
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Run Quality Analysis
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Quality Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceMonitoringPanel />
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <TrainingRecommendationsPanel />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <MessageQualityAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QualityControlDashboard;
