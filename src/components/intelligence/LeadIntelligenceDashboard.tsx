import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Brain,
  TrendingUp,
  Target,
  Users,
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  Clock,
  MessageSquare,
  Activity,
  Zap,
  Shield
} from 'lucide-react';
import { enhancedLeadIntelligenceEngine } from '@/services/enhancedLeadIntelligenceEngine';
import type { LeadIntelligenceProfile, IntelligenceMetrics } from '@/types/leadIntelligence';
import CompetitiveIntelligencePanel from '@/components/intelligence/CompetitiveIntelligencePanel';

const LeadIntelligenceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<IntelligenceMetrics>({
    totalProfilesAnalyzed: 0,
    highIntentLeads: 0,
    behaviorPatternsDetected: 0,
    competitorThreats: 0,
    averageIntelligenceScore: 0,
    topIntentSignals: [],
    competitorAnalysis: []
  });
  const [selectedProfile, setSelectedProfile] = useState<LeadIntelligenceProfile | null>(null);
  const [searchLeadId, setSearchLeadId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const intelligenceMetrics = await enhancedLeadIntelligenceEngine.getIntelligenceMetrics();
      setMetrics(intelligenceMetrics);
    } catch (error) {
      console.error('Error loading intelligence metrics:', error);
    }
  };

  const handleAnalyzeLead = async () => {
    if (!searchLeadId.trim()) return;

    setIsAnalyzing(true);
    try {
      const profile = await enhancedLeadIntelligenceEngine.analyzeLeadIntelligence(searchLeadId.trim());
      setSelectedProfile(profile);
    } catch (error) {
      console.error('Error analyzing lead:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getIntentCategoryColor = (category: string) => {
    switch (category) {
      case 'ready_to_buy': return 'text-green-600';
      case 'deciding': return 'text-blue-600';
      case 'comparing': return 'text-yellow-600';
      case 'researching': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'very_high': return 'text-green-600';
      case 'high': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk > 0.7) return 'text-red-600';
    if (risk > 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enhanced Lead Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Deep behavioral analysis, intent detection, and competitive intelligence
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter Lead ID"
              value={searchLeadId}
              onChange={(e) => setSearchLeadId(e.target.value)}
              className="w-48"
            />
            <Button 
              onClick={handleAnalyzeLead}
              disabled={isAnalyzing || !searchLeadId.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profiles Analyzed</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProfilesAnalyzed}</div>
            <p className="text-xs text-muted-foreground">
              Deep intelligence profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Intent Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.highIntentLeads}</div>
            <p className="text-xs text-muted-foreground">
              Ready to buy signals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behavior Patterns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.behaviorPatternsDetected}</div>
            <p className="text-xs text-muted-foreground">
              Detected patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitor Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.competitorThreats}</div>
            <p className="text-xs text-muted-foreground">
              Active competitive risks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Intelligence Overview</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!selectedProfile}>
            {selectedProfile ? 'Lead Analysis' : 'Select Lead'}
          </TabsTrigger>
          <TabsTrigger value="signals">Intent Signals</TabsTrigger>
          <TabsTrigger value="competitors">Competitive Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Intelligence Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Intelligence Score Overview</CardTitle>
              <CardDescription>Average intelligence score across all analyzed leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-2xl font-bold">{metrics.averageIntelligenceScore}</span>
                  </div>
                  <Progress value={metrics.averageIntelligenceScore} className="h-3" />
                </div>
                <Badge variant={metrics.averageIntelligenceScore > 70 ? "default" : "secondary"}>
                  {metrics.averageIntelligenceScore > 70 ? 'High Quality' : 'Moderate Quality'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Top Intent Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Intent Signals</CardTitle>
                <CardDescription>Most common buying signals detected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.topIntentSignals.map((signal, index) => (
                  <div key={signal.signal} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{signal.signal.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{signal.count}</div>
                      <div className="text-xs text-muted-foreground">
                        {(signal.averageStrength * 100).toFixed(0)}% strength
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competitive Analysis</CardTitle>
                <CardDescription>Competitor mentions and threat levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.competitorAnalysis.map((comp) => (
                  <div key={comp.competitor} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{comp.competitor}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${getRiskColor(comp.threatLevel)}`}>
                        {(comp.threatLevel * 100).toFixed(0)}% threat
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {comp.mentionTrend}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {selectedProfile ? (
            <>
              {/* Lead Intelligence Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Intelligence Profile</CardTitle>
                  <CardDescription>Comprehensive analysis for Lead {selectedProfile.leadId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{selectedProfile.intelligenceScore}</div>
                      <div className="text-sm text-muted-foreground">Intelligence Score</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getEngagementColor(selectedProfile.behaviorProfile.engagementLevel)}`}>
                        {selectedProfile.behaviorProfile.engagementLevel.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">Engagement Level</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getIntentCategoryColor(selectedProfile.intentProfile.intentCategory)}`}>
                        {selectedProfile.intentProfile.intentCategory.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">Intent Category</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Behavior & Intent Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Behavior Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Communication Style:</span>
                      <Badge variant="outline">{selectedProfile.behaviorProfile.communicationStyle}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Decision Style:</span>
                      <Badge variant="outline">{selectedProfile.behaviorProfile.decisionMakingStyle}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Engagement Trend:</span>
                      <Badge variant={selectedProfile.behaviorProfile.trendsAnalysis.engagementTrend === 'increasing' ? 'default' : 'secondary'}>
                        {selectedProfile.behaviorProfile.trendsAnalysis.engagementTrend}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Patterns Detected:</span>
                      <span className="font-medium">{selectedProfile.behaviorProfile.behaviorPatterns.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Intent Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Intent Score:</span>
                      <span className="font-bold">{selectedProfile.intentProfile.overallIntentScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Time to Decision:</span>
                      <span className="font-medium">{selectedProfile.intentProfile.timeToDecision} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Buying Signals:</span>
                      <span className="font-medium">{selectedProfile.intentProfile.buyingSignals.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Price Sensitivity:</span>
                      <Badge variant="outline">{selectedProfile.intentProfile.priceRange.sensitivity}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors & Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Churn Risk:</span>
                        <span className={`font-bold ${getRiskColor(selectedProfile.riskFactors.churnRisk)}`}>
                          {(selectedProfile.riskFactors.churnRisk * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.riskFactors.churnRisk * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Competitor Risk:</span>
                        <span className={`font-bold ${getRiskColor(selectedProfile.riskFactors.competitorRisk)}`}>
                          {(selectedProfile.riskFactors.competitorRisk * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.riskFactors.competitorRisk * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Price Risk:</span>
                        <span className={`font-bold ${getRiskColor(selectedProfile.riskFactors.priceRisk)}`}>
                          {(selectedProfile.riskFactors.priceRisk * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.riskFactors.priceRisk * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Upsell Potential:</span>
                        <span className="font-bold text-green-600">
                          {(selectedProfile.opportunities.upsellPotential * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.opportunities.upsellPotential * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Referral Potential:</span>
                        <span className="font-bold text-blue-600">
                          {(selectedProfile.opportunities.referralPotential * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.opportunities.referralPotential * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Loyalty Potential:</span>
                        <span className="font-bold text-purple-600">
                          {(selectedProfile.opportunities.loyaltyPotential * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={selectedProfile.opportunities.loyaltyPotential * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Recommendations</CardTitle>
                  <CardDescription>AI-generated recommendations based on intelligence analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-red-600">Immediate Actions</h4>
                      <ul className="space-y-2">
                        {selectedProfile.actionRecommendations.immediate.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Zap className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-yellow-600">Short-term Actions</h4>
                      <ul className="space-y-2">
                        {selectedProfile.actionRecommendations.shortTerm.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">Long-term Actions</h4>
                      <ul className="space-y-2">
                        {selectedProfile.actionRecommendations.longTerm.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Lead Selected</h3>
                  <p className="text-muted-foreground">
                    Enter a Lead ID and click Analyze to view detailed intelligence
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intent Signal Analytics</CardTitle>
              <CardDescription>Detailed analysis of buying intent signals across all leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Intent Signal Details</h3>
                <p className="text-muted-foreground">
                  Comprehensive intent signal analysis and trends
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <CompetitiveIntelligencePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadIntelligenceDashboard;