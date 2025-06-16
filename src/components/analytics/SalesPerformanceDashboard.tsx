
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, TrendingUp, MessageSquare, Target, Clock, Award, AlertCircle } from 'lucide-react';
import { SalesPerformanceMetrics, calculateSalesPerformance } from '@/services/leadScoringService';
import { supabase } from '@/integrations/supabase/client';

const SalesPerformanceDashboard = () => {
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');
  const [performance, setPerformance] = useState<SalesPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSalespeople();
  }, []);

  const loadSalespeople = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'sales')
        .order('first_name');

      setSalespeople(data || []);
      if (data && data.length > 0) {
        setSelectedSalesperson(data[0].id);
      }
    } catch (error) {
      console.error('Error loading salespeople:', error);
    }
  };

  const loadPerformance = async (salespersonId: string) => {
    try {
      setLoading(true);
      const metrics = await calculateSalesPerformance(salespersonId);
      setPerformance(metrics);
    } catch (error) {
      console.error('Error loading performance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSalesperson) {
      loadPerformance(selectedSalesperson);
    }
  }, [selectedSalesperson]);

  const getPerformanceColor = (value: number, type: 'rate' | 'quality' | 'time') => {
    if (type === 'time') {
      // Lower is better for response time
      if (value <= 4) return 'text-green-600';
      if (value <= 24) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // Higher is better for rates and quality
      if (value >= 70) return 'text-green-600';
      if (value >= 40) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getPerformanceBadge = (value: number, type: 'rate' | 'quality' | 'time') => {
    if (type === 'time') {
      if (value <= 4) return 'default';
      if (value <= 24) return 'secondary';
      return 'destructive';
    } else {
      if (value >= 70) return 'default';
      if (value >= 40) return 'secondary';
      return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Sales Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a salesperson" />
              </SelectTrigger>
              <SelectContent>
                {salespeople.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.first_name} {person.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {performance && !loading && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <User className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{performance.totalLeads}</div>
                    <div className="text-sm text-gray-600">Total Leads</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className={`text-2xl font-bold ${getPerformanceColor(performance.responseRate, 'rate')}`}>
                      {performance.responseRate}%
                    </div>
                    <div className="text-sm text-gray-600">Response Rate</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <div className={`text-2xl font-bold ${getPerformanceColor(performance.conversionRate, 'rate')}`}>
                      {performance.conversionRate}%
                    </div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <div className={`text-2xl font-bold ${getPerformanceColor(performance.averageResponseTime, 'time')}`}>
                      {performance.averageResponseTime}h
                    </div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Engagement Quality</span>
                          <Badge variant={getPerformanceBadge(performance.engagementQuality, 'quality')}>
                            {performance.engagementQuality}/100
                          </Badge>
                        </div>
                        <Progress value={performance.engagementQuality} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Conversation Quality</span>
                          <Badge variant={getPerformanceBadge(performance.conversationQualityScore, 'quality')}>
                            {performance.conversationQualityScore}/100
                          </Badge>
                        </div>
                        <Progress value={performance.conversationQualityScore} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Performing Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performance.topPerformingMessages.length > 0 ? (
                      <div className="space-y-2">
                        {performance.topPerformingMessages.map((message, index) => (
                          <div key={index} className="p-2 bg-green-50 rounded text-sm">
                            {message}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No top performing messages available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Improvement Areas */}
              {performance.improvementAreas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      Improvement Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performance.improvementAreas.map((area, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded">
                          <TrendingUp className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPerformanceDashboard;
