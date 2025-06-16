
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, Clock, Brain, Activity, MessageSquare, TrendingUp, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { analyzeLeadPersonality, getOptimalContactTiming } from '@/services/personalizationService';
import { getLeadBehavioralInsights } from '@/services/enhancedBehavioralService';

const PersonalizationDashboard = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [personality, setPersonality] = useState<any>(null);
  const [behavioralInsights, setBehavioralInsights] = useState<any>(null);
  const [optimalTiming, setOptimalTiming] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, vehicle_interest')
      .order('created_at', { ascending: false })
      .limit(50);
    
    setLeads(data || []);
    if (data && data.length > 0) {
      setSelectedLead(data[0].id);
    }
  };

  const loadPersonalizationData = async (leadId: string) => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const [personalityData, insightsData, timingData] = await Promise.all([
        analyzeLeadPersonality(leadId),
        getLeadBehavioralInsights(leadId),
        getOptimalContactTiming(leadId)
      ]);

      setPersonality(personalityData);
      setBehavioralInsights(insightsData);
      setOptimalTiming(timingData);
    } catch (error) {
      console.error('Error loading personalization data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      loadPersonalizationData(selectedLead);
    }
  }, [selectedLead]);

  const getPersonalityColor = (trait: string, value: string) => {
    const colorMap: Record<string, Record<string, string>> = {
      communication_style: {
        formal: 'text-blue-600',
        casual: 'text-green-600',
        enthusiastic: 'text-orange-600',
        direct: 'text-purple-600'
      },
      interest_level: {
        high: 'text-green-600',
        medium: 'text-yellow-600',
        low: 'text-red-600'
      },
      decision_speed: {
        fast: 'text-green-600',
        moderate: 'text-yellow-600',
        slow: 'text-red-600'
      }
    };

    return colorMap[trait]?.[value] || 'text-gray-600';
  };

  const formatOptimalTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalization Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.first_name} {lead.last_name} - {lead.vehicle_interest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && personality && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Personality Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personality Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Communication Style</label>
                      <div className={`text-lg font-semibold ${getPersonalityColor('communication_style', personality.communication_style)}`}>
                        {personality.communication_style.charAt(0).toUpperCase() + personality.communication_style.slice(1)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Interest Level</label>
                      <div className={`text-lg font-semibold ${getPersonalityColor('interest_level', personality.interest_level)}`}>
                        {personality.interest_level.charAt(0).toUpperCase() + personality.interest_level.slice(1)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Decision Speed</label>
                      <div className={`text-lg font-semibold ${getPersonalityColor('decision_speed', personality.decision_speed)}`}>
                        {personality.decision_speed.charAt(0).toUpperCase() + personality.decision_speed.slice(1)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Personality Score</label>
                      <div className="flex items-center gap-2">
                        <Progress value={personality.personality_score} className="flex-1" />
                        <span className="text-sm font-medium">{personality.personality_score}/100</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimal Contact Timing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Optimal Timing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimalTiming && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Next Best Contact Time</label>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatOptimalTime(optimalTiming)}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-600">Preferred Method</label>
                      <Badge variant="outline">
                        {personality.preferred_contact_method.toUpperCase()}
                      </Badge>
                    </div>

                    <Button className="w-full" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Behavioral Insights */}
              {behavioralInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Behavioral Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Engagement Score</label>
                        <div className="flex items-center gap-2">
                          <Progress value={behavioralInsights.engagementScore} className="flex-1" />
                          <span className="text-sm font-medium">{behavioralInsights.engagementScore}/100</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Risk Level</label>
                        <Badge variant={
                          behavioralInsights.riskLevel === 'low' ? 'default' :
                          behavioralInsights.riskLevel === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {behavioralInsights.riskLevel.toUpperCase()}
                        </Badge>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Recent Triggers</label>
                        <div className="text-lg font-semibold">
                          {behavioralInsights.enhancedTriggers.length}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Session Count</label>
                        <div className="text-lg font-semibold">
                          {behavioralInsights.activityPatterns.totalSessions}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Recent Activities */}
          {behavioralInsights?.recentActivities && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {behavioralInsights.recentActivities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{activity.page_type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {activity.time_spent}s
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Recommendations */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Personalized Messaging Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personality && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded">
                    <h4 className="font-medium text-blue-900">Communication Style</h4>
                    <p className="text-sm text-blue-700">
                      Use {personality.communication_style} tone with this lead. 
                      {personality.communication_style === 'formal' && ' Use professional language and proper greetings.'}
                      {personality.communication_style === 'casual' && ' Keep messages relaxed and friendly.'}
                      {personality.communication_style === 'enthusiastic' && ' Use exclamation points and positive language.'}
                      {personality.communication_style === 'direct' && ' Be concise and straight to the point.'}
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-900">Decision Speed</h4>
                    <p className="text-sm text-green-700">
                      This lead makes decisions {personality.decision_speed === 'fast' ? 'quickly' : personality.decision_speed === 'moderate' ? 'at a moderate pace' : 'slowly'}.
                      {personality.decision_speed === 'fast' && ' Create urgency and offer immediate actions.'}
                      {personality.decision_speed === 'moderate' && ' Provide balanced information and reasonable timelines.'}
                      {personality.decision_speed === 'slow' && ' Give them time to consider and provide detailed information.'}
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded">
                    <h4 className="font-medium text-orange-900">Price Sensitivity</h4>
                    <p className="text-sm text-orange-700">
                      {personality.price_sensitivity === 'high' && 'Focus on value, deals, and cost savings. Mention financing options.'}
                      {personality.price_sensitivity === 'medium' && 'Balance price discussion with features and benefits.'}
                      {personality.price_sensitivity === 'low' && 'Emphasize premium features, quality, and service excellence.'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalizationDashboard;
