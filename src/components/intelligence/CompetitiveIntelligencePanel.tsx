import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Zap,
  Users,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  Brain
} from 'lucide-react';
import { competitiveIntelligenceService } from '@/services/competitiveIntelligenceService';
import type { CompetitiveLandscape, CompetitorThreat, CounterStrategy } from '@/services/competitiveIntelligenceService';

const CompetitiveIntelligencePanel: React.FC = () => {
  const [landscape, setLandscape] = useState<CompetitiveLandscape>({
    totalCompetitors: 0,
    activeThreat: 0,
    marketPosition: 'follower',
    competitiveStrength: 0,
    threatSummary: { immediate: [], emerging: [], monitored: [] }
  });
  const [counterStrategies, setCounterStrategies] = useState<CounterStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadCompetitiveData();
  }, []);

  const loadCompetitiveData = async () => {
    setIsLoading(true);
    try {
      const data = await competitiveIntelligenceService.getCompetitiveDashboardData();
      setLandscape(data.landscape);
      setCounterStrategies(data.counterStrategies);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading competitive data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'leader': return 'text-green-600';
      case 'challenger': return 'text-blue-600';
      case 'follower': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStrategyPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const renderThreatCard = (threat: CompetitorThreat) => (
    <Card key={threat.id} className={`border-l-4 ${getThreatLevelColor(threat.threatLevel)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{threat.competitorName}</CardTitle>
          <Badge variant="outline" className={getThreatLevelColor(threat.threatLevel)}>
            {threat.threatLevel}
          </Badge>
        </div>
        <CardDescription>
          Risk Score: {threat.riskScore}/100 • {threat.mentionFrequency} mentions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Threat Indicators</h4>
          <div className="flex flex-wrap gap-1">
            {threat.threatIndicators.map((indicator, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {indicator}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
          <div className="space-y-1">
            {threat.recommendations.slice(0, 2).map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Risk Level</span>
            <span className="font-medium">{threat.riskScore}%</span>
          </div>
          <Progress value={threat.riskScore} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

  const renderCounterStrategy = (strategy: CounterStrategy) => (
    <Card key={strategy.competitorName}>
      <CardHeader>
        <CardTitle className="capitalize">{strategy.competitorName} Counter-Strategy</CardTitle>
        <CardDescription>Strategic responses and competitive positioning</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Action Strategies</h4>
          <div className="space-y-2">
            {strategy.strategies.map((strat, idx) => (
              <div key={idx} className="flex items-start justify-between p-2 bg-muted/30 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getStrategyPriorityColor(strat.priority)}>
                      {strat.priority}
                    </Badge>
                    <span className="text-sm font-medium capitalize">{strat.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{strat.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Our Advantages</h4>
            <div className="space-y-1">
              {strategy.competitiveAdvantages.map((advantage, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span>{advantage}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Their Weaknesses</h4>
            <div className="space-y-1">
              {strategy.weaknesses.map((weakness, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  <span>{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Talking Points</h4>
          <div className="space-y-1">
            {strategy.recommendedTalkingPoints.slice(0, 3).map((point, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <MessageSquare className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">"{point}"</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Competitive Intelligence</h2>
          <p className="text-muted-foreground">
            Automatic competitor detection, sentiment analysis, and threat assessment
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button onClick={loadCompetitiveData} disabled={isLoading}>
            {isLoading ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Refresh Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{landscape.totalCompetitors}</div>
            <p className="text-xs text-muted-foreground">
              Detected mentions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{landscape.activeThreat}</div>
            <p className="text-xs text-muted-foreground">
              High/Critical level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Position</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getMarketPositionColor(landscape.marketPosition)}`}>
              {landscape.marketPosition}
            </div>
            <p className="text-xs text-muted-foreground">
              Competitive standing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitive Strength</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{landscape.competitiveStrength}</div>
            <p className="text-xs text-muted-foreground">
              Strength score
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="threats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="threats">Threat Assessment</TabsTrigger>
          <TabsTrigger value="strategies">Counter-Strategies</TabsTrigger>
          <TabsTrigger value="monitoring">Trend Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="space-y-6">
          {/* Critical & High Threats */}
          {(landscape.threatSummary.immediate.length > 0 || landscape.threatSummary.emerging.length > 0) && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {landscape.threatSummary.immediate.length} critical and {landscape.threatSummary.emerging.length} high-priority competitive threats detected. Immediate action recommended.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...landscape.threatSummary.immediate, ...landscape.threatSummary.emerging].map(renderThreatCard)}
              </div>
            </div>
          )}

          {/* Monitored Threats */}
          {landscape.threatSummary.monitored.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Monitored Competitors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {landscape.threatSummary.monitored.map(renderThreatCard)}
              </div>
            </div>
          )}

          {landscape.totalCompetitors === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Competitive Threats Detected</h3>
                <p className="text-muted-foreground">
                  Our AI is continuously monitoring conversations for competitor mentions.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <div className="space-y-4">
            {counterStrategies.length > 0 ? (
              counterStrategies.map(renderCounterStrategy)
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Counter-Strategies</h3>
                  <p className="text-muted-foreground">
                    Counter-strategies will be generated when competitive threats are detected.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trends</CardTitle>
                <CardDescription>Competitor sentiment analysis over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Sentiment</span>
                    <Badge variant="outline">Stable</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Threat Trajectory</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 text-sm">Decreasing</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Market Share Impact</span>
                    <span className="text-sm font-medium">Low Risk</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring Configuration</CardTitle>
                <CardDescription>Automatic detection settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mention Detection</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sentiment Analysis</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Threat Assessment</span>
                    <Badge variant="default">Real-time</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Strategy Generation</span>
                    <Badge variant="default">Automatic</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitiveIntelligencePanel;