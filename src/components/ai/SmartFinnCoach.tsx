import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Target, TrendingUp, AlertTriangle, 
  CheckCircle, Clock, Star, Zap, Users, 
  MessageSquare, Phone, DollarSign 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  analyzeConversationIntelligence, 
  generateSmartCoachingSuggestions,
  getMarketIntelligence,
  type SmartFinnAnalysis,
  type SmartCoachingSuggestion,
  type MarketIntelligence
} from '@/services/smartFinnAI';

interface SmartFinnCoachProps {
  leadId: string;
  onActionTaken?: (action: string) => void;
}

const SmartFinnCoach: React.FC<SmartFinnCoachProps> = ({ leadId, onActionTaken }) => {
  const [analysis, setAnalysis] = useState<SmartFinnAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<SmartCoachingSuggestion[]>([]);
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'coaching' | 'market'>('analysis');

  useEffect(() => {
    loadFinnIntelligence();
  }, [leadId]);

  const loadFinnIntelligence = async () => {
    try {
      setLoading(true);
      const [analysisData, suggestionsData, marketData] = await Promise.all([
        analyzeConversationIntelligence(leadId),
        generateSmartCoachingSuggestions(leadId),
        getMarketIntelligence()
      ]);
      
      setAnalysis(analysisData);
      setSuggestions(suggestionsData);
      setMarketIntel(marketData);
    } catch (error) {
      console.error('Error loading Finn intelligence:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI analysis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    onActionTaken?.(action);
    toast({
      title: 'Action Noted',
      description: `Finn will remember you took action: ${action}`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse" />
            Finn AI Intelligence Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Intelligence Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              Finn AI Intelligence
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'analysis' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('analysis')}
              >
                Analysis
              </Button>
              <Button
                variant={activeTab === 'coaching' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('coaching')}
              >
                Coaching
              </Button>
              <Button
                variant={activeTab === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('market')}
              >
                Market Intel
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {activeTab === 'analysis' && analysis && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.overallIntelligence}
                  </div>
                  <div className="text-sm text-gray-600">Intelligence Score</div>
                  <Progress value={analysis.overallIntelligence} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.buyingProbability}%
                  </div>
                  <div className="text-sm text-gray-600">Buy Probability</div>
                  <Progress value={analysis.buyingProbability} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getUrgencyColor(analysis.urgencyLevel)}`}>
                    {analysis.urgencyLevel.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">Urgency Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.buyingSignals.length}
                  </div>
                  <div className="text-sm text-gray-600">Buying Signals</div>
                </div>
              </div>

              <Separator />

              {/* Buying Signals */}
              {analysis.buyingSignals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Buying Signals Detected
                  </h4>
                  <div className="space-y-2">
                    {analysis.buyingSignals.map((signal, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium capitalize">
                            {signal.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-600">
                            "{signal.evidence}"
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default">
                            Strength: {signal.strength}/10
                          </Badge>
                          <div className="text-sm text-gray-500 mt-1">
                            {signal.confidence}% confident
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Objections */}
              {analysis.objections.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Objections to Address
                  </h4>
                  <div className="space-y-2">
                    {analysis.objections.map((objection, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium">{objection.objection}</div>
                          <Badge variant="secondary">
                            {objection.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Strategy:</strong> {objection.handlingStrategy}
                        </div>
                        <div className="text-sm bg-white rounded p-2">
                          <strong>Suggested Response:</strong> {objection.suggestedResponse}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personality Profile */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Customer Personality Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Communication Style:</span>
                      <Badge variant="outline">
                        {analysis.personalityProfile.communicationStyle}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Decision Speed:</span>
                      <Badge variant="outline">
                        {analysis.personalityProfile.decisionSpeed}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Tolerance:</span>
                      <Badge variant="outline">
                        {analysis.personalityProfile.riskTolerance}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Information Need:</span>
                      <Badge variant="outline">
                        {analysis.personalityProfile.informationNeed}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Relationship Focus:</span>
                      <Badge variant={analysis.personalityProfile.relationshipOriented ? 'default' : 'secondary'}>
                        {analysis.personalityProfile.relationshipOriented ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Technical Focus:</span>
                      <Badge variant={analysis.personalityProfile.technicalFocus ? 'default' : 'secondary'}>
                        {analysis.personalityProfile.technicalFocus ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Approach */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Recommended Sales Approach
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">{analysis.bestApproach.primaryStrategy}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Messaging Tone:</strong> {analysis.bestApproach.messagingTone}
                    </div>
                    <div>
                      <strong>Best Channel:</strong> {analysis.bestApproach.recommendedChannel}
                    </div>
                  </div>
                  {analysis.bestApproach.contentFocus.length > 0 && (
                    <div className="mt-2">
                      <strong>Focus Areas:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.bestApproach.contentFocus.map((focus, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coaching' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Smart Coaching Suggestions
                </h4>
                <Button onClick={loadFinnIntelligence} size="sm" variant="outline">
                  Refresh
                </Button>
              </div>

              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{suggestion.title}</div>
                            <div className="text-sm text-gray-600">{suggestion.description}</div>
                          </div>
                          <Badge variant={getPriorityColor(suggestion.priority) as any}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded mb-3">
                          <div className="font-medium text-sm mb-1">Suggested Action:</div>
                          <div className="text-sm">{suggestion.suggestedAction}</div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Impact: {suggestion.expectedImpact}
                            </span>
                            <span className="text-gray-600">
                              Confidence: {suggestion.confidenceScore}%
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {suggestion.type === 'closing_opportunity' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleActionClick('closing_attempt')}
                                className="flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                Close
                              </Button>
                            )}
                            {suggestion.type === 'timing_optimization' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleActionClick('urgent_followup')}
                                className="flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                Call Now
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleActionClick(suggestion.suggestedAction)}
                              className="flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div>No coaching suggestions available yet.</div>
                  <div className="text-sm">Finn needs more conversation data to provide insights.</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'market' && marketIntel && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Market Intelligence
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-medium">Market Conditions</div>
                  <div className="text-2xl font-bold text-blue-600 capitalize">
                    {marketIntel.marketConditions}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="font-medium">Inventory Demand</div>
                  <div className="text-2xl font-bold text-green-600">
                    {marketIntel.inventoryDemand}/10
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="font-medium">Price Position</div>
                  <div className="text-2xl font-bold text-purple-600 capitalize">
                    {marketIntel.pricePosition}
                  </div>
                </div>
              </div>

              {marketIntel.seasonalFactors.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Seasonal Factors</div>
                  <div className="flex flex-wrap gap-2">
                    {marketIntel.seasonalFactors.map((factor, index) => (
                      <Badge key={index} variant="secondary">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {marketIntel.marketOpportunities.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Market Opportunities</div>
                  <div className="space-y-2">
                    {marketIntel.marketOpportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions Based on Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.urgencyLevel === 'critical' && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleActionClick('urgent_call')}
                  className="flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  Emergency Call
                </Button>
              )}
              {analysis.buyingProbability > 70 && (
                <Button 
                  size="sm"
                  onClick={() => handleActionClick('present_offer')}
                  className="flex items-center gap-1"
                >
                  <DollarSign className="w-3 h-3" />
                  Present Offer
                </Button>
              )}
              {analysis.objections.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleActionClick('address_objections')}
                  className="flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Address Concerns
                </Button>
              )}
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => handleActionClick('send_followup')}
                className="flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                Schedule Follow-up
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartFinnCoach;